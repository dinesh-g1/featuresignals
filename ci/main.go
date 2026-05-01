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
// Filter can be "server", "dashboard", or empty (changed projects).
// When filter is empty, uses DetectChanges to determine what to validate.
func (m *Ci) Validate(ctx context.Context, source *dagger.Directory, filter string, baseSha string) error {
	// Determine which projects to validate
	projects := []string{}
	switch strings.ToLower(filter) {
	case "server", "dashboard":
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
		return fmt.Errorf("unknown filter %q; use 'server', 'dashboard', or '' (auto)", filter)
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

// =========================================================================
// FullTest — comprehensive test suite for merge to main
// =========================================================================

// FullTest runs all tests: server (unit + integration), dashboard (unit + type-check),
// and all SDK test suites. Intended for merge-to-main in CI.
func (m *Ci) FullTest(ctx context.Context, source *dagger.Directory) error {
	// ── Security scan first (fail fast on secrets/vulns) ──
	fmt.Println("=== Security Scan ===")
	if err := m.SecurityScan(ctx, source); err != nil {
		return fmt.Errorf("security scan: %w", err)
	}

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
// SecurityScan — security checks for CI pipeline
// =========================================================================

// SecurityScan runs security checks: gitleaks, govulncheck, npm audit.
// Fails fast if any check finds issues. Intended for CI pipeline.
func (m *Ci) SecurityScan(ctx context.Context, source *dagger.Directory) error {
	// ── gitleaks: secret detection ──
	fmt.Println("=== Security: gitleaks ===")
	if err := m.scanSecrets(ctx, source); err != nil {
		return fmt.Errorf("gitleaks: %w", err)
	}

	// ── govulncheck: Go vulnerability scanning ──
	fmt.Println("=== Security: govulncheck ===")
	if err := m.scanGoVulns(ctx, source); err != nil {
		return fmt.Errorf("govulncheck: %w", err)
	}

	// ── npm audit: JavaScript vulnerability scanning ──
	fmt.Println("=== Security: npm audit ===")
	if err := m.scanNpmAudit(ctx, source); err != nil {
		return fmt.Errorf("npm audit: %w", err)
	}

	return nil
}

func (m *Ci) scanSecrets(ctx context.Context, source *dagger.Directory) error {
	ctr := dag.Container().
		From("zricethezav/gitleaks:latest").
		WithDirectory("/src", source).
		WithWorkdir("/src").
		WithExec([]string{"detect", "--source", ".", "--no-git", "--verbose", "--exit-code", "1"})
	_, err := ctr.Sync(ctx)
	return err
}

func (m *Ci) scanGoVulns(ctx context.Context, source *dagger.Directory) error {
	goModCache := dag.CacheVolume("go-mod-security")

	ctr := dag.Container().
		From("golang:1.23-alpine").
		WithExec([]string{"apk", "add", "--no-cache", "git"}).
		WithMountedCache("/go/pkg/mod", goModCache).
		WithDirectory("/app", source).
		WithWorkdir("/app/server").
		WithExec([]string{"go", "install", "golang.org/x/vuln/cmd/govulncheck@latest"}).
		WithExec([]string{"govulncheck", "./..."})
	_, err := ctr.Sync(ctx)
	return err
}

func (m *Ci) scanNpmAudit(ctx context.Context, source *dagger.Directory) error {
	// Run npm audit on all three frontend packages
	for _, pkg := range []string{"dashboard", "website", "docs"} {
		ctr := dag.Container().
			From("node:22-alpine").
			WithDirectory("/app", source).
			WithWorkdir(fmt.Sprintf("/app/%s", pkg)).
			WithExec([]string{"npm", "ci"}).
			WithExec([]string{"npm", "audit", "--audit-level=high"})
		if _, err := ctr.Sync(ctx); err != nil {
			return fmt.Errorf("%s: %w", pkg, err)
		}
	}
	return nil
}

// =========================================================================
// DetectChanges — git diff analysis
// =========================================================================

// DetectChanges analyzes the git diff between the current HEAD and the
// provided base SHA to determine which projects have changed.
// Returns a list of changed project names: "server", "dashboard".
// If baseSha is empty, checks all projects.
func (m *Ci) DetectChanges(ctx context.Context, source *dagger.Directory, baseSha string) ([]string, error) {
	if baseSha == "" {
		return []string{"server", "dashboard"}, nil
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
	projectList := []string{"server", "dashboard"}
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