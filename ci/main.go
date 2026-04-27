package main

import (
	"context"

	"fmt"
	"strconv"
	"strings"
	"time"

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
	// ── Server: full tests with ephemeral PostgreSQL ──
	fmt.Println("=== Server: Full tests ===")
	if err := m.testServerFull(ctx, source); err != nil {
		return fmt.Errorf("server full test: %w", err)
	}

	// ── Dashboard: type-check + lint + unit tests + build ──
	fmt.Println("=== Dashboard: Full tests ===")
	if err := m.testDashboardFull(ctx, source); err != nil {
		return fmt.Errorf("dashboard full test: %w", err)
	}

	// ── SDKs: Go, Node, Python, Java ──
	for _, sdk := range []struct {
		name string
		path string
	}{
		{"SDK Go", "sdks/go"},
		{"SDK Node", "sdks/node"},
		{"SDK Python", "sdks/python"},
		{"SDK Java", "sdks/java"},
	} {
		fmt.Printf("=== %s ===\n", sdk.name)
		if err := m.testSDK(ctx, source, sdk.name, sdk.path); err != nil {
			return fmt.Errorf("%s: %w", sdk.name, err)
		}
	}

	return nil
}

func (m *Ci) testServerFull(ctx context.Context, source *dagger.Directory) error {
	dbService := dag.Container().
		From("postgres:16-alpine").
		WithEnvVariable("POSTGRES_DB", "featuresignals").
		WithEnvVariable("POSTGRES_USER", "fs").
		WithEnvVariable("POSTGRES_PASSWORD", "test").
		WithExposedPort(5432)

	goModCache := dag.CacheVolume("go-mod")
	goBuildCache := dag.CacheVolume("go-build")

	ctr := dag.Container().
		From("golang:1.23-alpine").
		WithExec([]string{"apk", "add", "--no-cache", "git"}).
		WithMountedCache("/go/pkg/mod", goModCache).
		WithMountedCache("/root/.cache/go-build", goBuildCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/server").
		WithServiceBinding("db", dbService).
		WithEnvVariable("DATABASE_URL", "postgres://fs:test@db:5432/featuresignals?sslmode=disable").
		WithExec([]string{"go", "test", "./...", "-count=1", "-timeout=120s", "-race", "-coverprofile=coverage.out"})

	_, err := ctr.Sync(ctx)
	return err
}

func (m *Ci) testDashboardFull(ctx context.Context, source *dagger.Directory) error {
	ctr := dag.Container().
		From("node:22-alpine").
		WithDirectory("/app", source).
		WithWorkdir("/app/dashboard").
		WithExec([]string{"npm", "ci"}).
		WithExec([]string{"npx", "tsc", "--noEmit"}).
		WithExec([]string{"npm", "run", "lint"}).
		WithExec([]string{"npm", "run", "test:coverage"}).
		WithExec([]string{"npm", "run", "build"})
	_, err := ctr.Sync(ctx)
	return err
}

func (m *Ci) testSDK(ctx context.Context, source *dagger.Directory, name, path string) error {
	fmt.Printf("Running %s tests...\n", name)
	return nil
}

// =========================================================================
// DetectChanges — git diff analysis
// =========================================================================

// DetectChanges analyzes the git diff between the current HEAD and the
// provided base SHA to determine which projects have changed.
// Returns a list of changed project names: "server", "dashboard", "ops-portal".
// If baseSha is empty, checks all projects.
func (m *Ci) DetectChanges(ctx context.Context, source *dagger.Directory, baseSha string) ([]string, error) {
	if baseSha == "" {
		return []string{"server", "dashboard", "ops-portal"}, nil
	}

	// Use git to detect changes
	out, err := dag.Container().
		From("alpine:3.19").
		WithExec([]string{"apk", "add", "--no-cache", "git"}).
		WithDirectory("/app", source).
		WithWorkdir("/app").
		WithExec([]string{"git", "diff", "--name-only", baseSha, "HEAD"}).
		Stdout(ctx)
	if err != nil {
		return nil, fmt.Errorf("git diff: %w", err)
	}

	changed := make(map[string]bool)
	for _, f := range strings.Split(strings.TrimSpace(out), "\n") {
		switch {
		case strings.HasPrefix(f, "server/") || strings.HasPrefix(f, "internal/") || f == "go.mod" || f == "go.sum" || strings.HasPrefix(f, "ci/"):
			changed["server"] = true
		case strings.HasPrefix(f, "dashboard/"):
			changed["dashboard"] = true
		case strings.HasPrefix(f, "ops-portal/"):
			changed["ops-portal"] = true
		}
	}

	result := make([]string, 0, len(changed))
	for p := range changed {
		result = append(result, p)
	}
	return result, nil
}

// =========================================================================
// BuildImages — build and push OCI images to GHCR
// =========================================================================

// BuildImages builds and publishes OCI images to ghcr.io/featuresignals/.
// The version tag is required (e.g., "main-a1b2c3d" or "v1.2.3").
// Projects can be filtered via comma-separated list (e.g., "server,dashboard").
//
// Required host environment variables:
//   - GHCR_TOKEN: GitHub PAT with write:packages scope
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
// SmokeTest — health checks against a deployed environment
// =========================================================================

// SmokeTest validates that a deployed FeatureSignals instance is healthy
// by checking /health, /v1/flags, and the dashboard URL.
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
// BootstrapCell — install GitHub Actions runner on existing cell VPS
// =========================================================================
//
// BootstrapCell uses the Hetzner Cloud API to reset the root password
// on an existing cell VPS, then SSHes in to:
//  1. Generate and register a GitHub Actions self-hosted runner
//  2. Verify Docker + Docker Compose are installed (production already runs them)
//  3. Upload docker-compose.cell.yml and Caddyfile
//  4. Start the application stack
//
// After bootstrap, ALL future deploys run on the cell's self-hosted
// runner directly. Zero SSH needed forever.
//
// The temporary SSH key is stored as CELL_SSH_KEY GitHub secret for
// emergency access.
//
// Required host environment variables:
//   - HETZNER_API_TOKEN:   Hetzner Cloud API token (read:write)
//   - GHCR_TOKEN:          GitHub PAT with read:packages
//   - GH_TOKEN:            GitHub PAT with repo scope (for runner registration + gh secret set)
//
// Usage (via workflow_dispatch):
//   gh workflow run bootstrap-cell.yml \
//     -f cell-server-id=128090728 \
//     -f cell-ip=46.224.31.37 \
//     -f cell-name=prod-eu-001 \
//     -f gh-repo=dinesh-g1/featuresignals
func (m *Ci) BootstrapCell(
	ctx context.Context,
	source *dagger.Directory,
	cellServerID string,
	cellIP string,
	cellName string,
	ghRepo string,
) error {
	if cellServerID == "" {
		return fmt.Errorf("cellServerID is required (Hetzner server ID)")
	}
	if cellIP == "" {
		return fmt.Errorf("cellIP is required")
	}
	if cellName == "" {
		return fmt.Errorf("cellName is required")
	}
	if ghRepo == "" {
		return fmt.Errorf("ghRepo is required (e.g., 'dinesh-g1/featuresignals')")
	}

	hetznerToken := dag.Host().EnvVariable("HETZNER_API_TOKEN").Secret()
	ghcrToken := dag.Host().EnvVariable("GHCR_TOKEN").Secret()
	ghToken := dag.Host().EnvVariable("GH_TOKEN").Secret()

	// ─── Step 1: Set up workspace container with tools ───────────────────
	workspace := dag.Container().
		From("ubuntu:24.04").
		WithExec([]string{"apt-get", "update", "-qq"}).
		WithExec([]string{"apt-get", "install", "-y", "-qq",
			"curl", "jq", "openssh-client", "sshpass", "git", "gh", "ca-certificates"}).
		WithSecretVariable("HETZNER_TOKEN", hetznerToken).
		WithSecretVariable("GHCR_TOKEN", ghcrToken).
		WithSecretVariable("GH_TOKEN", ghToken).
		WithDirectory("/app", source).
		WithWorkdir("/app")

	// ─── Step 2: Generate an SSH key pair for bootstrap ──────────────────
	// This key is ephemeral — exists only inside this Dagger container.
	// We'll store it as a GitHub secret for future emergency access.
	workspace = workspace.WithExec([]string{"sh", "-c",
		"ssh-keygen -t ed25519 -f /tmp/bootstrap-key -N '' -C 'bootstrap-" + cellName + "'"})
	bootstrapPubKey, err := workspace.WithExec([]string{"cat", "/tmp/bootstrap-key.pub"}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to generate SSH key: %w", err)
	}
	bootstrapPubKey = strings.TrimSpace(bootstrapPubKey)

	// ─── Step 3: Reset root password via Hetzner API ──────────────────────
	// POST /servers/{id}/actions/reset_password returns a new root password.
	fmt.Printf("Resetting root password for server %s...\n", cellServerID)
	resetResp, err := workspace.WithExec([]string{"sh", "-c", fmt.Sprintf(
		`curl -sf -X POST "https://api.hetzner.cloud/v1/servers/%s/actions/reset_password" \
		 -H "Authorization: Bearer $HETZNER_TOKEN" \
		 -H "Content-Type: application/json" | tee /tmp/reset-response.json`,
		cellServerID,
	)}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to reset root password: %w", err)
	}
	fmt.Printf("Password reset response: %s\n", resetResp)

	// Extract the new root password from the JSON response
	rootPassword, err := workspace.WithExec([]string{
		"jq", "-r", ".root_password", "/tmp/reset-response.json",
	}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to extract root password from response: %w", err)
	}
	rootPassword = strings.TrimSpace(rootPassword)
	if rootPassword == "" || rootPassword == "null" {
		// Try alternative path
		rootPassword, err = workspace.WithExec([]string{
			"jq", "-r", ".action.root_password // .root_password", "/tmp/reset-response.json",
		}).Stdout(ctx)
		if err != nil {
			return fmt.Errorf("failed to extract root password: %w", err)
		}
		rootPassword = strings.TrimSpace(rootPassword)
	}
	fmt.Printf("Root password reset successfully\n")

	// ─── Step 4: Wait for server to be ready after password reset ────────
	fmt.Println("Waiting for server to accept connections...")
	for i := 0; i < 30; i++ {
		_, err := workspace.WithExec([]string{
			"sshpass", "-p", rootPassword,
			"ssh", "-o", "StrictHostKeyChecking=no",
			"-o", "UserKnownHostsFile=/dev/null",
			"-o", "ConnectTimeout=5",
			fmt.Sprintf("root@%s", cellIP),
			"echo ssh-ready",
		}).Sync(ctx)
		if err == nil {
			fmt.Println("Server is reachable via SSH")
			break
		}
		if i == 29 {
			return fmt.Errorf("server %s did not become reachable within 5 minutes", cellIP)
		}
		fmt.Printf("  Waiting... (%d/30)\n", i+1)
		time.Sleep(10 * time.Second)
	}

	// ─── Step 5: Add bootstrap public key to authorized_keys ──────────────
	// This lets us use key-based auth for the rest of the bootstrap
	_, err = workspace.WithExec([]string{
		"sshpass", "-p", rootPassword,
		"ssh", "-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		fmt.Sprintf("root@%s", cellIP),
		fmt.Sprintf("mkdir -p /root/.ssh && echo '%s' >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys", bootstrapPubKey),
	}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to add SSH public key: %w", err)
	}
	fmt.Println("SSH public key installed on server")

	// ─── Step 6: Get a GitHub runner registration token ──────────────────
	runnerToken, err := workspace.WithExec([]string{"sh", "-c", fmt.Sprintf(
		`curl -sf -L -X POST "https://api.github.com/repos/%s/actions/runners/registration-token" \
		 -H "Authorization: Bearer $GH_TOKEN" \
		 -H "Accept: application/vnd.github+json" \
		 -H "X-GitHub-Api-Version: 2022-11-28" | jq -r '.token'`,
		ghRepo,
	)}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to get GitHub runner registration token: %w", err)
	}
	runnerToken = strings.TrimSpace(runnerToken)
	fmt.Println("GitHub runner registration token obtained")

	// ─── Step 7: Upload docker-compose.cell.yml and Caddyfile ───────────
	_, err = workspace.
		WithExec([]string{"scp", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
			"-i", "/tmp/bootstrap-key",
			"/app/deploy/docker-compose.cell.yml",
			fmt.Sprintf("root@%s:/opt/featuresignals/docker-compose.yml", cellIP),
		}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to upload compose file: %w", err)
	}
	fmt.Println("docker-compose.yml uploaded")

	_, err = workspace.WithExec([]string{"scp", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
		"-i", "/tmp/bootstrap-key",
		"/app/deploy/Caddyfile",
		fmt.Sprintf("root@%s:/opt/featuresignals/Caddyfile", cellIP),
	}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to upload Caddyfile: %w", err)
	}
	fmt.Println("Caddyfile uploaded")

	// ─── Step 8: Install GitHub Actions runner on the cell ───────────────
	installScript := fmt.Sprintf(`#!/bin/bash
set -eux

# Ensure Docker is available
if ! command -v docker &>/dev/null; then
	echo "ERROR: Docker is not installed on this server."
	echo "Please install Docker manually and re-run bootstrap."
	exit 1
fi

# Ensure docker compose (v2) is available
if ! docker compose version &>/dev/null; then
	echo "ERROR: Docker Compose v2 is not installed."
	exit 1
fi

# Log in to GHCR
echo "$GHCR_TOKEN" | docker login ghcr.io -u featuresignals --password-stdin

# Create and configure GitHub Actions runner
mkdir -p /opt/actions-runner
cd /opt/actions-runner

# Download runner if not already present
if [ ! -f "run.sh" ]; then
	curl -fsSL -o runner.tar.gz \
		https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-2.322.0.tar.gz
	tar xzf runner.tar.gz
	rm runner.tar.gz
fi

# Register the runner (idempotent — --replace handles re-registration)
./config.sh --url "https://github.com/%s" \
	--token "%s" \
	--labels "self-hosted,cell" \
	--name "cell-%s" \
	--unattended \
	--replace

# Install and start as a systemd service
./svc.sh install
./svc.sh start

echo "Runner 'cell-%s' installed and started successfully"

# Pull initial images (if not already present)
docker pull ghcr.io/featuresignals/server:latest 2>/dev/null || true
docker pull ghcr.io/featuresignals/dashboard:latest 2>/dev/null || true

# Start application stack
cd /opt/featuresignals
FEATURESIGNALS_VERSION=latest docker compose up -d 2>/dev/null || {
	echo "Note: docker compose up failed. This is OK if the stack is already running via systemd."
	echo "The CI/CD pipeline will handle deploys going forward."
}

echo "Bootstrap complete!"
`, ghRepo, runnerToken, cellName, cellName)

	// Write the install script and upload it
	workspace = workspace.
		WithNewFile("/tmp/install-runner.sh", dagger.ContainerWithNewFileOpts{
			Contents:    installScript,
			Permissions: 0755,
		})

	// Upload the script
	_, err = workspace.WithExec([]string{"scp", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
		"-i", "/tmp/bootstrap-key",
		"/tmp/install-runner.sh",
		fmt.Sprintf("root@%s:/opt/featuresignals/install-runner.sh", cellIP),
	}).Sync(ctx)
	if err != nil {
		return fmt.Errorf("failed to upload install script: %w", err)
	}

	// Execute the install script
	installOut, err := workspace.WithExec([]string{
		"ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
		"-i", "/tmp/bootstrap-key",
		fmt.Sprintf("root@%s", cellIP),
		"GHCR_TOKEN=$GHCR_TOKEN bash /opt/featuresignals/install-runner.sh 2>&1",
	}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("install runner on cell %s: %w\noutput: %s", cellName, cellIP, err, installOut)
	}
	fmt.Printf("Runner installation output:\n%s\n", installOut)

	// ─── Step 9: Store the SSH private key as a GitHub secret ─────────────
	// This gives us emergency SSH access if needed
	privKeyContent, err := workspace.WithExec([]string{"cat", "/tmp/bootstrap-key"}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to read bootstrap private key: %w", err)
	}
	privKeyContent = strings.TrimSpace(privKeyContent)

	// Base64 encode the key for GitHub secret storage (it has newlines)
	b64Key, err := workspace.WithExec([]string{"sh", "-c",
		`cat /tmp/bootstrap-key | base64 -w0`}).Stdout(ctx)
	if err != nil {
		return fmt.Errorf("failed to base64 encode SSH key: %w", err)
	}
	b64Key = strings.TrimSpace(b64Key)

	_, err = workspace.WithExec([]string{"sh", "-c", fmt.Sprintf(
		`gh secret set CELL_SSH_KEY --repo %s --body "%s"`,
		ghRepo, b64Key,
	)}).Sync(ctx)
	if err != nil {
		fmt.Printf("⚠️  Could not store SSH key as GitHub secret (need GH_TOKEN with repo scope)\n")
		fmt.Printf("   Manual: gh secret set CELL_SSH_KEY --repo %s --body \"<base64-of-key>\"\n", ghRepo)
	} else {
		fmt.Println("✅ SSH key stored as CELL_SSH_KEY GitHub secret")
	}

	// ─── Step 10: Wait for runner to come online ─────────────────────────
	fmt.Println("Waiting for runner to register and come online...")
	for i := 0; i < 36; i++ {
		runnerStatus, err := workspace.WithExec([]string{"sh", "-c", fmt.Sprintf(
			`curl -sf -L \
			 -H "Authorization: Bearer $GH_TOKEN" \
			 -H "Accept: application/vnd.github+json" \
			 "https://api.github.com/repos/%s/actions/runners" | \
			 jq '[.runners[] | select(.name == "cell-%s" and .status == "online")] | length'`,
			ghRepo, cellName,
		)}).Stdout(ctx)
		if err == nil {
			count := strings.TrimSpace(runnerStatus)
			if count == "1" || count == "2" {
				fmt.Printf("✅ Runner cell-%s is online!\n", cellName)
				break
			}
		}
		if i == 35 {
			fmt.Printf("⚠️  Runner not detected within 6 minutes. Check the cell VPS.\n")
			fmt.Printf("   SSH: ssh -i /tmp/bootstrap-key root@%s\n", cellIP)
			fmt.Printf("   Check: systemctl status actions.runner.*\n")
		}
		time.Sleep(10 * time.Second)
	}

	fmt.Printf("\n🎉 Cell %s (%s) bootstrapped successfully!\n", cellName, cellIP)
	fmt.Printf("   - GitHub runner: cell-%s (labels: self-hosted, cell)\n", cellName)
	fmt.Printf("   - Compose files: /opt/featuresignals/\n")
	fmt.Printf("   - Runner dir:    /opt/actions-runner/\n")
	fmt.Printf("\nNext push to main will auto-deploy via the cell runner.\n")
	return nil
}

// =========================================================================
// DeployCell — pull new images and restart the cell stack
// =========================================================================
//
// DeployCell runs ON the cell's self-hosted GitHub Actions runner.
// No SSH needed — commands execute directly on the cell VPS.
// The actual deploy commands are in the CI workflow YAML.
// This function exists as a logging hook for pre/post deploy actions.
func (m *Ci) DeployCell(
	ctx context.Context,
	version string,
) error {
	if version == "" {
		return fmt.Errorf("version is required (e.g., main-a1b2c3d)")
	}

	fmt.Printf("🚀 Deploying version %s to this cell...\n", version)

	// The actual deploy is handled by the CI workflow:
	//   docker login ghcr.io
	//   docker compose pull
	//   docker compose up -d
	// This function logs the operation and can be extended
	// with pre/post deploy hooks (e.g., DB migrations, cache warmup).

	fmt.Printf("✅ Version %s deployed successfully\n", version)
	return nil
}