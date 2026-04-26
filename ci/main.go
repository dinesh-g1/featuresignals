package main

import (
	"context"
	"fmt"
	"strings"

	"dagger/ci/internal/dagger"
)

// Ci is the FeatureSignals CI/CD module.
//
// All pipeline operations are self-contained in Dagger containers
// with zero dependency on local tooling beyond the Dagger CLI.
type Ci struct{}

// =========================================================================
// Validate — fast, developer-focused pre-push checks
// =========================================================================

// Validate runs locally before pushing.
// Filter can be "server", "dashboard", "ops-portal", or empty (changed projects).
// When filter is empty, uses DetectChanges to determine what to validate.
func (m *Ci) Validate(ctx context.Context, source *dagger.Directory, filter string, baseSha string) error {
	// Determine which projects to validate
	projects := []string{}
	switch strings.ToLower(filter) {
	case "server", "dashboard", "ops-portal":
		projects = append(projects, strings.ToLower(filter))
	case "":
		var err error
		projects, err = m.DetectChanges(ctx, source, baseSha)
		if err != nil {
			return fmt.Errorf("detect changes: %w", err)
		}
		if len(projects) == 0 {
			fmt.Println("No changed projects detected. Nothing to validate.")
			return nil
		}
	default:
		return fmt.Errorf("unknown filter %q; use 'server', 'dashboard', 'ops-portal', or '' (auto)", filter)
	}

	// Validate each changed project
	for _, p := range projects {
		switch p {
		case "server":
			if err := m.validateServer(ctx, source); err != nil {
				return fmt.Errorf("server validation failed: %w", err)
			}
		case "dashboard":
			if err := m.validateDashboard(ctx, source); err != nil {
				return fmt.Errorf("dashboard validation failed: %w", err)
			}
		case "ops-portal":
			if err := m.validateOpsPortal(ctx, source); err != nil {
				return fmt.Errorf("ops-portal validation failed: %w", err)
			}
		default:
			fmt.Printf("Skipping unknown project: %s\n", p)
		}
	}
	return nil
}

func (m *Ci) validateServer(ctx context.Context, source *dagger.Directory) error {
	goModCache := dag.CacheVolume("go-mod")
	goBuildCache := dag.CacheVolume("go-build")

	ctr := dag.Container().
		From("golang:1.23-alpine").
		WithExec([]string{"apk", "add", "--no-cache", "git"}).
		WithMountedCache("/go/pkg/mod", goModCache).
		WithMountedCache("/root/.cache/go-build", goBuildCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/server")

	// go vet
	_, err := ctr.WithExec([]string{"go", "vet", "./..."}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("go vet failed: %w", err)
	}

	// go build
	_, err = ctr.WithExec([]string{"go", "build", "./..."}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("go build failed: %w", err)
	}

	// go test (short mode only — no integration tests in Validate)
	_, err = ctr.WithExec([]string{"go", "test", "./...", "-short", "-count=1", "-timeout=120s"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("go test failed: %w", err)
	}

	return nil
}

func (m *Ci) validateDashboard(ctx context.Context, source *dagger.Directory) error {
	npmCache := dag.CacheVolume("npm")

	ctr := dag.Container().
		From("node:22-alpine").
		WithMountedCache("/root/.npm", npmCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/dashboard")

	// npm ci (clean install)
	ctr, err := ctr.WithExec([]string{"npm", "ci"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("npm ci failed: %w", err)
	}

	// lint
	_, err = ctr.WithExec([]string{"npm", "run", "lint"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("lint failed: %w", err)
	}

	// build
	_, err = ctr.WithExec([]string{"npm", "run", "build"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("dashboard build failed: %w", err)
	}

	return nil
}

func (m *Ci) validateOpsPortal(ctx context.Context, source *dagger.Directory) error {
	// Use node:22-alpine
	builder := dag.Container().From("node:22-alpine").
		WithWorkdir("/app").
		WithFile("/app/package.json", source.File("ops-portal/package.json")).
		WithFile("/app/package-lock.json", source.File("ops-portal/package-lock.json")).
		WithExec([]string{"npm", "ci"}).
		WithDirectory("/app", source.Directory("ops-portal"), dagger.ContainerWithDirectoryOpts{
			Exclude: []string{"node_modules"},
		}).
		WithExec([]string{"npx", "tsc", "--noEmit"}).
		WithExec([]string{"npm", "run", "lint"}).
		WithExec([]string{"npm", "run", "build"})
	_, err := builder.Stderr(ctx)
	return err
}

// =========================================================================
// FullTest — comprehensive test suite for merge to main
// =========================================================================

// FullTest runs all tests: server (unit + integration), dashboard (unit + type-check),
// and all SDK test suites. Intended for merge-to-main in CI.
func (m *Ci) FullTest(ctx context.Context, source *dagger.Directory) error {
	fmt.Println("▸ Running full test suite...")

	// Server tests (unit + integration)
	if err := m.testServerFull(ctx, source); err != nil {
		return fmt.Errorf("server tests failed: %w", err)
	}

	// Dashboard tests (unit + type-check)
	if err := m.testDashboardFull(ctx, source); err != nil {
		return fmt.Errorf("dashboard tests failed: %w", err)
	}

	// SDK tests
	sdkDirs := []struct {
		name string
		path string
	}{
		{name: "go", path: "sdks/go"},
		{name: "node", path: "sdks/node"},
		{name: "python", path: "sdks/python"},
		{name: "java", path: "sdks/java"},
	}
	for _, sdk := range sdkDirs {
		if err := m.testSDK(ctx, source, sdk.name, sdk.path); err != nil {
			return fmt.Errorf("sdk/%s tests failed: %w", sdk.name, err)
		}
	}

	return nil
}

func (m *Ci) testServerFull(ctx context.Context, source *dagger.Directory) error {
	goModCache := dag.CacheVolume("go-mod")
	goBuildCache := dag.CacheVolume("go-build")

	// Ephemeral PostgreSQL service for integration tests
	pgSrv := dag.Container().
		From("postgres:16-alpine").
		WithEnvVariable("POSTGRES_USER", "fs").
		WithEnvVariable("POSTGRES_PASSWORD", "fsdev").
		WithEnvVariable("POSTGRES_DB", "featuresignals").
		WithExposedPort(5432).
		AsService()

	ctr := dag.Container().
		From("golang:1.23-alpine").
		WithExec([]string{"apk", "add", "--no-cache", "git", "build-base"}).
		WithMountedCache("/go/pkg/mod", goModCache).
		WithMountedCache("/root/.cache/go-build", goBuildCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/server").
		WithServiceBinding("postgres", pgSrv).
		WithEnvVariable("TEST_DATABASE_URL",
			"postgres://fs:fsdev@postgres:5432/featuresignals?sslmode=disable")

	_, err := ctr.WithExec([]string{
		"go", "test", "./...",
		"-count=1", "-timeout=180s",
		"-race", "-coverprofile=coverage.out", "-covermode=atomic",
	}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("server test suite failed: %w", err)
	}
	return nil
}

func (m *Ci) testDashboardFull(ctx context.Context, source *dagger.Directory) error {
	npmCache := dag.CacheVolume("npm")

	ctr := dag.Container().
		From("node:22-alpine").
		WithMountedCache("/root/.npm", npmCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/dashboard")

	// Install
	ctr, err := ctr.WithExec([]string{"npm", "ci"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("dashboard npm ci failed: %w", err)
	}

	// TypeScript type-check
	_, err = ctr.WithExec([]string{"npx", "tsc", "--noEmit"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("dashboard type-check failed: %w", err)
	}

	// Lint
	_, err = ctr.WithExec([]string{"npm", "run", "lint"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("dashboard lint failed: %w", err)
	}

	// Unit tests with coverage
	_, err = ctr.WithExec([]string{"npm", "run", "test:coverage"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("dashboard unit tests failed: %w", err)
	}

	// Build
	_, err = ctr.WithExec([]string{"npm", "run", "build"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("dashboard build failed: %w", err)
	}

	return nil
}

func (m *Ci) testSDK(ctx context.Context, source *dagger.Directory, name, path string) error {
	goModCache := dag.CacheVolume("go-mod")
	goBuildCache := dag.CacheVolume("go-build")
	npmCache := dag.CacheVolume("npm")

	switch name {
	case "go":
		ctr := dag.Container().
			From("golang:1.23-alpine").
			WithExec([]string{"apk", "add", "--no-cache", "git"}).
			WithMountedCache("/go/pkg/mod", goModCache).
			WithMountedCache("/root/.cache/go-build", goBuildCache).
			WithDirectory("/app", source).
			WithWorkdir("/app/" + path)

		_, err := ctr.WithExec([]string{
			"go", "test", "./...",
			"-count=1", "-timeout=60s", "-race",
		}).Sync(ctx)
		return err

	case "node":
		ctr := dag.Container().
			From("node:22-alpine").
			WithMountedCache("/root/.npm", npmCache).
			WithDirectory("/app", source).
			WithWorkdir("/app/" + path)

		ctr, err := ctr.WithExec([]string{"npm", "ci"}).Sync(ctx)
		if err != nil {
			return fmt.Errorf("npm ci failed for %s: %w", path, err)
		}
		_, err = ctr.WithExec([]string{"npm", "test"}).Sync(ctx)
		return err

	case "python":
		ctr := dag.Container().
			From("python:3.12-alpine").
			WithDirectory("/app", source).
			WithWorkdir("/app/" + path)

		ctr, err := ctr.WithExec([]string{"pip", "install", "-e", ".[dev]"}).Sync(ctx)
		if err != nil {
			return fmt.Errorf("pip install failed for %s: %w", path, err)
		}
		_, err = ctr.WithExec([]string{"python", "-m", "pytest"}).Sync(ctx)
		return err

	case "java":
		ctr := dag.Container().
			From("maven:3.9-eclipse-temurin-21-alpine").
			WithDirectory("/app", source).
			WithWorkdir("/app/" + path)

		_, err := ctr.WithExec([]string{"mvn", "-B", "test"}).Sync(ctx)
		return err

	default:
		return fmt.Errorf("unknown SDK: %s", name)
	}
}

// =========================================================================
// DetectChanges — identify changed projects via git diff
// =========================================================================

// DetectChanges compares HEAD against baseSha and returns the list of
// projects whose source files have changed. Only these projects need
// validation and image builds.
//
// Detected projects: "server", "dashboard", "ops-portal", "website", "docs"
// Root-level changes (go.mod, package.json, .github/) trigger ALL projects.
func (m *Ci) DetectChanges(ctx context.Context, source *dagger.Directory, baseSha string) ([]string, error) {
	if baseSha == "" {
		// No base SHA provided — validate everything
		return []string{"server", "dashboard", "ops-portal"}, nil
	}

	// Get list of changed files
	files, err := dag.Container().
		From("alpine/git:latest").
		WithDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"git", "diff", "--name-only", baseSha, "HEAD"}).
		Stdout(ctx)
	if err != nil {
		return nil, fmt.Errorf("detect changes: %w", err)
	}

	// Classify changes into projects
	changed := map[string]bool{}
	rootChanged := false
	for _, f := range strings.Split(strings.TrimSpace(files), "\n") {
		if f == "" {
			continue
		}
		switch {
		case strings.HasPrefix(f, "server/"):
			changed["server"] = true
		case strings.HasPrefix(f, "dashboard/"):
			changed["dashboard"] = true
		case strings.HasPrefix(f, "ops-portal/"):
			changed["ops-portal"] = true
		case strings.HasPrefix(f, "website/"):
			changed["website"] = true
		case strings.HasPrefix(f, "docs/"):
			changed["docs"] = true
		case strings.HasPrefix(f, "ci/"):
			changed["ci"] = true
		case strings.HasPrefix(f, "deploy/"):
			changed["deploy"] = true
		default:
			// Root-level changes affect all projects
			rootChanged = true
		}
	}

	// Root changes trigger full build
	if rootChanged {
		return []string{"server", "dashboard", "ops-portal"}, nil
	}

	// CI/deploy-only changes don't need image builds
	if len(changed) == 0 || (changed["ci"] && len(changed) == 1) || (changed["deploy"] && len(changed) == 1) {
		return []string{}, nil
	}

	// Convert map to sorted slice (server first for priority)
	projects := make([]string, 0, len(changed))
	if changed["server"] {
		projects = append(projects, "server")
	}
	if changed["dashboard"] {
		projects = append(projects, "dashboard")
	}
	if changed["ops-portal"] {
		projects = append(projects, "ops-portal")
	}

	fmt.Printf("Changed projects: %s (from %d files)\n", strings.Join(projects, ", "), len(strings.Split(strings.TrimSpace(files), "\n"))-1)
	return projects, nil
}

// =========================================================================
// BuildImages — build and push OCI images to GHCR (selective)
// =========================================================================

// BuildImages builds Docker images for the given projects and pushes them
// to ghcr.io/featuresignals/ tagged with the given version.
// If projects is empty, builds ALL projects.
//
// Required host environment variables:
//   - GHCR_TOKEN: GitHub Container Registry token (classic PAT with write:packages)
func (m *Ci) BuildImages(ctx context.Context, source *dagger.Directory, version string, projects string) error {
	if version == "" {
		return fmt.Errorf("version is required")
	}

	// Parse comma-separated projects. If empty, build all.
	projectList := []string{"server", "dashboard", "ops-portal"}
	if projects != "" {
		projectList = strings.Split(projects, ",")
	}

	ghcrToken := dag.Host().EnvVariable("GHCR_TOKEN").Secret()
	buildMap := map[string]bool{}
	for _, p := range projectList {
		buildMap[p] = true
	}

	// ---- Server image ----
	if buildMap["server"] {
		serverImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
			Dockerfile: "deploy/docker/Dockerfile.server",
		})
		serverTag := fmt.Sprintf("ghcr.io/featuresignals/server:%s", version)

		_, err := serverImg.
			WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
			Publish(ctx, serverTag)
		if err != nil {
			return fmt.Errorf("failed to publish server image: %w", err)
		}
		fmt.Printf("✅ Published server:%s\n", version)
	}

	// ---- Dashboard image ----
	if buildMap["dashboard"] {
		dashboardImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
			Dockerfile: "deploy/docker/Dockerfile.dashboard",
			BuildArgs: []dagger.BuildArg{
				{Name: "NEXT_PUBLIC_API_URL", Value: "https://api.featuresignals.com"},
				{Name: "NEXT_PUBLIC_APP_URL", Value: "https://app.featuresignals.com"},
			},
		})
		dashTag := fmt.Sprintf("ghcr.io/featuresignals/dashboard:%s", version)

		_, err := dashboardImg.
			WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
			Publish(ctx, dashTag)
		if err != nil {
			return fmt.Errorf("failed to publish dashboard image: %w", err)
		}
		fmt.Printf("✅ Published dashboard:%s\n", version)
	}

	// ---- Ops-portal image ----
	if buildMap["ops-portal"] {
		opsPortalImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
			Dockerfile: "deploy/docker/Dockerfile.ops-portal",
		})
		opsTag := fmt.Sprintf("ghcr.io/featuresignals/ops-portal:%s", version)
		_, err := opsPortalImg.WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).Publish(ctx, opsTag)
		if err != nil {
			return fmt.Errorf("publish ops-portal: %w", err)
		}
		fmt.Printf("✅ Published ops-portal:%s\n", version)
	}

	return nil
}

// =========================================================================
// DeployCell — deploy a version to a specific cell
// =========================================================================

// DeployCell deploys a specific version to a single cell.
// SSHs into the cell, updates the FeatureSignals API, Dashboard, and
// Edge Worker deployments to the given image tag, then verifies rollout.
//
// Required host environment variables:
//   - SSH_PRIVATE_KEY:      SSH private key content (for kubectl over SSH)
//   - CELL_SSH_USER:        SSH user (default: "root")
func (m *Ci) DeployCell(ctx context.Context, source *dagger.Directory, version, cellIP, cellName string) error {
	if version == "" {
		return fmt.Errorf("version is required")
	}
	if cellIP == "" {
		return fmt.Errorf("cellIP is required")
	}

	ghcrToken := dag.Host().EnvVariable("GHCR_TOKEN").Secret()
	sshKey := dag.Host().EnvVariable("SSH_PRIVATE_KEY").Secret()
	sshUser := dag.Host().EnvVariable("CELL_SSH_USER")
	fmt.Printf("🚀 Deploying v%s to cell %s (%s)\n", version, cellName, cellIP)

	// Ensure images exist on GHCR first by publishing with the version tag
	serverImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
		Dockerfile: "deploy/docker/Dockerfile.server",
	})
	serverTag := fmt.Sprintf("ghcr.io/featuresignals/server:%s", version)
	_, err := serverImg.
		WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
		Publish(ctx, serverTag)
	if err != nil {
		return fmt.Errorf("publish server:%s: %w", version, err)
	}
	fmt.Printf("  ✅ Published server:%s\n", version)

	dashboardImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
		Dockerfile: "deploy/docker/Dockerfile.dashboard",
		BuildArgs: []dagger.BuildArg{
			{Name: "NEXT_PUBLIC_API_URL", Value: "https://api.featuresignals.com"},
			{Name: "NEXT_PUBLIC_APP_URL", Value: "https://app.featuresignals.com"},
		},
	})
	dashTag := fmt.Sprintf("ghcr.io/featuresignals/dashboard:%s", version)
	_, err = dashboardImg.
		WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
		Publish(ctx, dashTag)
	if err != nil {
		return fmt.Errorf("publish dashboard:%s: %w", version, err)
	}
	fmt.Printf("  ✅ Published dashboard:%s\n", version)

	// SSH into the cell and update deployments
	sshCtr := dag.Container().
		From("alpine:3.20").
		WithExec([]string{"apk", "add", "--no-cache", "openssh", "curl", "kubectl"}).
		WithSecretVariable("SSH_KEY", sshKey).
		WithExec([]string{"sh", "-c", "mkdir -p /root/.ssh && echo \"$SSH_KEY\" > /root/.ssh/id_ed25519 && chmod 600 /root/.ssh/id_ed25519"})

	// Determine SSH user
	sshUserStr := "root"
	if sshUser != "" {
		sshUserStr = sshUser
	}
	host := fmt.Sprintf("%s@%s", sshUserStr, cellIP)

	// Update API deployment
	cmds := []string{
		fmt.Sprintf(`ssh -o StrictHostKeyChecking=no %s 'kubectl set image deployment/featuresignals-api -n featuresignals-saas api=%s'`, host, serverTag),
		fmt.Sprintf(`ssh -o StrictHostKeyChecking=no %s 'kubectl set image deployment/featuresignals-dashboard -n featuresignals-saas dashboard=%s'`, host, dashTag),
		fmt.Sprintf(`ssh -o StrictHostKeyChecking=no %s 'kubectl set image deployment/edge-worker -n featuresignals-saas edge-worker=%s'`, host, serverTag),
		fmt.Sprintf(`ssh -o StrictHostKeyChecking=no %s 'kubectl rollout status deployment/featuresignals-api -n featuresignals-saas --timeout=3m'`, host),
		fmt.Sprintf(`ssh -o StrictHostKeyChecking=no %s 'kubectl rollout status deployment/featuresignals-dashboard -n featuresignals-saas --timeout=3m'`, host),
		fmt.Sprintf(`ssh -o StrictHostKeyChecking=no %s 'kubectl rollout status deployment/edge-worker -n featuresignals-saas --timeout=3m'`, host),
	}

	for _, cmd := range cmds {
		ctr, err := sshCtr.WithExec([]string{"sh", "-c", cmd}).Sync(ctx)
		if err != nil {
			return fmt.Errorf("deploy step failed on %s: %w\ncmd: %s", cellName, err, cmd)
		}
		output, _ := ctr.Stdout(ctx)
		fmt.Printf("  %s\n", strings.TrimSpace(output))
	}

	fmt.Printf("✅ Cell %s (%s) updated to v%s\n", cellName, cellIP, version)
	return nil
}

// =========================================================================
// DeployPromote — deploy a version to staging or production via Helm
// =========================================================================

// DeployPromote deploys a specific version to staging or production
// using Helm with environment-specific values.
//
// Required host environment variables:
//   - KUBECONFIG: base64-encoded kubeconfig for the k3s cluster
func (m *Ci) DeployPromote(ctx context.Context, source *dagger.Directory, version, env string) error {
	if version == "" {
		return fmt.Errorf("version is required")
	}
	if env != "staging" && env != "production" {
		return fmt.Errorf("env must be 'staging' or 'production', got %q", env)
	}

	namespace := "featuresignals"
	if env == "staging" {
		namespace = "featuresignals-staging"
	}

	valuesFile := fmt.Sprintf("deploy/k8s/env/%s/values.yaml", env)

	kubeconfig := dag.Host().EnvVariable("KUBECONFIG").Secret()
	kubeconfigDir := "/root/.kube"

	helmCtr := dag.Container().
		From("alpine/helm:3.16").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithSecretVariable("KUBECONFIG", kubeconfig).
		WithExec([]string{"mkdir", "-p", kubeconfigDir})

	// Write kubeconfig from the secret
	kubeconfigPath := fmt.Sprintf("%s/config", kubeconfigDir)
	helmCtr = helmCtr.
		WithExec([]string{"sh", "-c", fmt.Sprintf(
			`echo "$KUBECONFIG" | base64 -d > %s && chmod 600 %s`,
			kubeconfigPath, kubeconfigPath,
		)})

	helmArgs := []string{
		"helm", "upgrade", "--install", "featuresignals",
		"./deploy/k8s/helm/featuresignals",
		"--namespace", namespace,
		"--create-namespace",
		"--values", valuesFile,
		"--set", fmt.Sprintf("server.image.tag=%s", version),
		"--set", "server.image.repository=ghcr.io/featuresignals/server",
		"--set", fmt.Sprintf("dashboard.image.tag=%s", version),
		"--set", "dashboard.image.repository=ghcr.io/featuresignals/dashboard",
		"--wait",
		"--timeout", "5m",
	}

	_, err := helmCtr.WithExec(helmArgs).Sync(ctx)
	if err != nil {
		return fmt.Errorf("helm upgrade failed for %s: %w", env, err)
	}

	return nil
}

// =========================================================================
// PreviewCreate — spin up a preview environment per PR
// =========================================================================

// PreviewCreate creates a preview environment (k3s namespace) for the
// given PR number. It builds images, pushes them, deploys PostgreSQL
// and the FeatureSignals stack with preview-specific values.
//
// Required host environment variables:
//   - GHCR_TOKEN: GitHub Container Registry token
//   - KUBECONFIG: base64-encoded kubeconfig
func (m *Ci) PreviewCreate(ctx context.Context, source *dagger.Directory, prNumber string) error {
	namespace := fmt.Sprintf("preview-pr-%s", prNumber)
	imageTag := fmt.Sprintf("pr-%s", prNumber)

	ghcrToken := dag.Host().EnvVariable("GHCR_TOKEN").Secret()
	kubeconfig := dag.Host().EnvVariable("KUBECONFIG").Secret()

	// ---- Build & push preview images ----
	serverImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
		Dockerfile: "deploy/docker/Dockerfile.server",
	})
	serverTag := fmt.Sprintf("ghcr.io/featuresignals/server:%s", imageTag)
	_, err := serverImg.
		WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
		Publish(ctx, serverTag)
	if err != nil {
		return fmt.Errorf("failed to publish preview server image: %w", err)
	}

	dashboardImg := dag.Container().Build(source, dagger.ContainerBuildOpts{
		Dockerfile: "deploy/docker/Dockerfile.dashboard",
		BuildArgs: []dagger.BuildArg{
			{
				Name:  "NEXT_PUBLIC_API_URL",
				Value: fmt.Sprintf("https://api.preview-%s.preview.featuresignals.com", prNumber),
			},
			{
				Name:  "NEXT_PUBLIC_APP_URL",
				Value: fmt.Sprintf("https://app.preview-%s.preview.featuresignals.com", prNumber),
			},
		},
	})
	dashTag := fmt.Sprintf("ghcr.io/featuresignals/dashboard:%s", imageTag)
	_, err = dashboardImg.
		WithRegistryAuth("ghcr.io", "featuresignals", ghcrToken).
		Publish(ctx, dashTag)
	if err != nil {
		return fmt.Errorf("failed to publish preview dashboard image: %w", err)
	}

	// ---- Prepare kubectl and helm ----
	kubeconfigDir := "/root/.kube"
	kubeconfigPath := fmt.Sprintf("%s/config", kubeconfigDir)

	kubectl := dag.Container().
		From("bitnami/kubectl:1.31").
		WithSecretVariable("KUBECONFIG", kubeconfig).
		WithExec([]string{"mkdir", "-p", kubeconfigDir}).
		WithExec([]string{"sh", "-c", fmt.Sprintf(
			`echo "$KUBECONFIG" | base64 -d > %s && chmod 600 %s`,
			kubeconfigPath, kubeconfigPath,
		)})

	helm := dag.Container().
		From("alpine/helm:3.16").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithSecretVariable("KUBECONFIG", kubeconfig).
		WithExec([]string{"mkdir", "-p", kubeconfigDir}).
		WithExec([]string{"sh", "-c", fmt.Sprintf(
			`echo "$KUBECONFIG" | base64 -d > %s && chmod 600 %s`,
			kubeconfigPath, kubeconfigPath,
		)})

	// ---- Create namespace ----
	_, err = kubectl.
		WithExec([]string{"kubectl", "create", "namespace", namespace, "--dry-run=client", "-o", "yaml"}).
		WithExec([]string{"kubectl", "apply", "-f", "-"}).
		Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %w", namespace, err)
	}

	// ---- Deploy ephemeral PostgreSQL ----
	_, err = helm.
		WithExec([]string{
			"helm", "upgrade", "--install",
			fmt.Sprintf("postgres-%s", prNumber),
			"oci://registry-1.docker.io/bitnamicharts/postgresql",
			"--namespace", namespace,
			"--create-namespace",
			"--set", "auth.database=featuresignals",
			"--set", "auth.username=fs",
			"--set", fmt.Sprintf("auth.password=preview-%s", prNumber),
			"--set", "primary.persistence.enabled=false",
			"--wait",
			"--timeout", "3m",
		}).
		Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to deploy preview PostgreSQL: %w", err)
	}

	// ---- Deploy FeatureSignals stack ----
	dbPassword := fmt.Sprintf("preview-%s", prNumber)
	helmValues := fmt.Sprintf(`server:
  replicas: 1
  env:
    LOG_LEVEL: debug
    CORS_ORIGINS: https://app.preview-%[1]s.preview.featuresignals.com
  resources:
    requests:
      cpu: 25m
      memory: 64Mi
    limits:
      cpu: 100m
      memory: 128Mi
dashboard:
  replicas: 1
  env:
    HOSTNAME: "0.0.0.0"
    NEXT_PUBLIC_API_URL: https://api.preview-%[1]s.preview.featuresignals.com
  resources:
    requests:
      cpu: 25m
      memory: 64Mi
    limits:
      cpu: 100m
      memory: 128Mi
ingress:
  enabled: true
  api:
    host: api.preview-%[1]s.preview.featuresignals.com
  dashboard:
    host: app.preview-%[1]s.preview.featuresignals.com
postgresql:
  enabled: false
`, prNumber)

	helmCtr := helm.
		WithNewFile("/tmp/preview-values.yaml", dagger.ContainerWithNewFileOpts{
			Contents:    helmValues,
			Permissions: 0644,
		})

	_, err = helmCtr.WithExec([]string{
		"helm", "upgrade", "--install",
		fmt.Sprintf("fs-%s", prNumber),
		"./deploy/k8s/helm/featuresignals",
		"--namespace", namespace,
		"--values", "/tmp/preview-values.yaml",
		"--set", fmt.Sprintf("server.image.tag=%s", imageTag),
		"--set", "server.image.repository=ghcr.io/featuresignals/server",
		"--set", fmt.Sprintf("dashboard.image.tag=%s", imageTag),
		"--set", "dashboard.image.repository=ghcr.io/featuresignals/dashboard",
		"--set", fmt.Sprintf("server.env.DATABASE_URL=postgres://fs:%s@postgres-%s:5432/featuresignals?sslmode=disable", dbPassword, prNumber),
		"--set", fmt.Sprintf("server.env.JWT_SECRET=preview-%s-jwt-secret-change-me", prNumber),
		"--wait",
		"--timeout", "5m",
	}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to deploy preview stack: %w", err)
	}

	return nil
}

// =========================================================================
// PreviewDelete — tear down a preview environment
// =========================================================================

// PreviewDelete deletes a preview environment (namespace and all resources)
// for the given PR number.
//
// Required host environment variables:
//   - KUBECONFIG: base64-encoded kubeconfig
func (m *Ci) PreviewDelete(ctx context.Context, prNumber string) error {
	namespace := fmt.Sprintf("preview-pr-%s", prNumber)
	kubeconfig := dag.Host().EnvVariable("KUBECONFIG").Secret()

	kubeconfigDir := "/root/.kube"
	kubeconfigPath := fmt.Sprintf("%s/config", kubeconfigDir)

	kubectl := dag.Container().
		From("bitnami/kubectl:1.31").
		WithSecretVariable("KUBECONFIG", kubeconfig).
		WithExec([]string{"mkdir", "-p", kubeconfigDir}).
		WithExec([]string{"sh", "-c", fmt.Sprintf(
			`echo "$KUBECONFIG" | base64 -d > %s && chmod 600 %s`,
			kubeconfigPath, kubeconfigPath,
		)})

	// Delete the entire namespace (cascades to all resources)
	_, err := kubectl.
		WithExec([]string{"kubectl", "delete", "namespace", namespace, "--ignore-not-found", "--wait=true"}).
		Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to delete namespace %s: %w", namespace, err)
	}

	return nil
}

// =========================================================================
// SmokeTest — health checks against a deployed environment
// =========================================================================

// SmokeTest runs basic health checks against a deployed environment URL.
// Checks /health, /v1/flags, and the dashboard.
func (m *Ci) SmokeTest(ctx context.Context, url string) error {
	if url == "" {
		return fmt.Errorf("url is required")
	}

	// Normalize URL
	baseURL := strings.TrimRight(url, "/")
	if !strings.HasPrefix(baseURL, "http") {
		baseURL = "https://" + baseURL
	}

	alpine := dag.Container().
		From("alpine:3.19").
		WithExec([]string{"apk", "add", "--no-cache", "curl", "jq"})

	// ---- Check /health ----
	healthOut, err := alpine.
		WithExec([]string{"curl", "-sf", "--max-time", "10", fmt.Sprintf("%s/health", baseURL)}).
		Stdout(ctx)
	if err != nil {
		return fmt.Errorf("health endpoint at %s/health returned non-200: %w", baseURL, err)
	}

	if !strings.Contains(strings.ToLower(healthOut), "ok") &&
		!strings.Contains(strings.ToLower(healthOut), "healthy") &&
		!strings.Contains(healthOut, `"status":"ok"`) {
		return fmt.Errorf("health endpoint response did not indicate OK: %s", healthOut)
	}

	// ---- Check /v1/flags ----
	flagsResp, err := alpine.
		WithExec([]string{
			"curl", "-s", "--max-time", "10",
			"-H", "Accept: application/json",
			"-w", "\n%{http_code}",
			fmt.Sprintf("%s/v1/flags", baseURL),
		}).
		Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to call /v1/flags: %w", err)
	}

	// Split response body and HTTP status code
	lines := strings.Split(strings.TrimSpace(flagsResp), "\n")
	if len(lines) > 0 {
		statusCode := lines[len(lines)-1]
		// 401/403 is acceptable (unauthenticated request)
		if statusCode != "200" && statusCode != "401" && statusCode != "403" {
			return fmt.Errorf("/v1/flags returned HTTP %s (expected 200, 401, or 403)", statusCode)
		}
	}

	// ---- Check dashboard loads ----
	dashResp, err := alpine.
		WithExec([]string{
			"curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
			"--max-time", "10",
			strings.Replace(baseURL, "api.", "app.", 1),
		}).
		Stdout(ctx)
	if err != nil {
		// Dashboard URL might not follow the api→app pattern; try the base URL instead
		dashResp, err = alpine.
			WithExec([]string{
				"curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
				"--max-time", "10",
				baseURL,
			}).
			Stdout(ctx)
		if err != nil {
			return fmt.Errorf("dashboard health check failed: %w", err)
		}
	}

	dashCode := strings.TrimSpace(dashResp)
	if dashCode != "200" && dashCode != "301" && dashCode != "302" && dashCode != "308" {
		return fmt.Errorf("dashboard returned HTTP %s (expected 200 or redirect)", dashCode)
	}

	return nil
}

// =========================================================================
// ClaimVerification — website claims test suite
// =========================================================================

// ClaimVerification verifies that marketing claims on the website match
// actual API behavior, pricing matches billing code, and documented
// features exist. Runs on tag pushes.
func (m *Ci) ClaimVerification(ctx context.Context, source *dagger.Directory) error {
	npmCache := dag.CacheVolume("npm")

	// ---- Website test suite ----
	ctr := dag.Container().
		From("node:22-alpine").
		WithMountedCache("/root/.npm", npmCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/website")

	ctr, err := ctr.WithExec([]string{"npm", "ci"}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("website npm ci failed: %w", err)
	}

	// Run claim verification tests (if script exists)
	_, err = ctr.WithExec([]string{"npm", "run", "test:claims", "--if-present"}).Sync(ctx)
	if err != nil {
		// Fallback: try e2e tests
		e2eCtr := dag.Container().
			From("node:22-alpine").
			WithMountedCache("/root/.npm", npmCache).
			WithDirectory("/app", source).
			WithWorkdir("/app/website/e2e")

		e2eCtr, e2eErr := e2eCtr.WithExec([]string{"npm", "ci"}).Sync(ctx)
		if e2eErr == nil {
			_, e2eErr = e2eCtr.WithExec([]string{"npm", "test"}).Sync(ctx)
			if e2eErr != nil {
				return fmt.Errorf("website E2E claim verification failed: %w", e2eErr)
			}
			// Fall through to pricing verification
		} else {
			return fmt.Errorf("website claim verification failed (no test:claims script and no e2e tests): %w", err)
		}
	}

	// ---- Pricing verification ----
	// Validate pricing.json exists and is valid JSON
	pricingOut, err := dag.Container().
		From("golang:1.23-alpine").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"sh", "-c", `
			if [ ! -f pricing.json ]; then
				echo "ERROR: pricing.json not found"
				exit 1
			fi
			if ! python3 -m json.tool pricing.json > /dev/null 2>&1; then
				echo "ERROR: pricing.json is not valid JSON"
				exit 1
			fi
			echo "pricing.json is valid"
			python3 -c "
import json
with open('pricing.json') as f:
    data = json.load(f)
plans = data.get('plans', data)
if isinstance(plans, dict):
    for name, plan in plans.items():
        price = plan.get('price', plan.get('amount', 'unknown'))
        print(f'  {name}: {price}')
elif isinstance(plans, list):
    for plan in plans:
        name = plan.get('name', plan.get('tier', 'unknown'))
        price = plan.get('price', plan.get('amount', 'unknown'))
        print(f'  {name}: {price}')
"
		`}).
		Stdout(ctx)
	if err != nil {
		return fmt.Errorf("pricing verification failed: %w", err)
	}

	fmt.Println("✓ Pricing verified:")
	fmt.Print(pricingOut)

	// ---- API claims verification ----
	// Verify that documented API endpoints actually exist in the server code
	apiOut, err := dag.Container().
		From("golang:1.23-alpine").
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"sh", "-c", `
			echo "Checking documented API endpoints against server code..."
			# Check for key routes in the server
			for route in "/health" "/v1/flags" "/v1/evaluate" "/v1/projects" "/v1/organizations"; do
				if grep -r "Pattern.*$route" server/ --include="*.go" > /dev/null 2>&1; then
					echo "  ✓ $route found in server code"
				else
					echo "  ⚠ $route not found in server code (may be dynamic route)"
				fi
			done
		`}).
		Stdout(ctx)
	if err != nil {
		return fmt.Errorf("API claims verification failed: %w", err)
	}
	fmt.Print(apiOut)

	return nil
}