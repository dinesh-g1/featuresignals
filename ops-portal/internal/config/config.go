package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the ops portal service.
// All values are loaded from environment variables.
type Config struct {
	// Server
	Port int
	Env  string // "development", "production"

	// Database
	DatabaseURL string

	// Auth
	JWTSecret  string
	TokenTTL   time.Duration
	RefreshTTL time.Duration

	// External API tokens (optional, used by phase 2+)
	GitHubToken    string
	GitHubOwner    string
	GitHubRepo     string
	HetznerToken   string
	CloudflareToken string
	CloudflareZoneID string

	// Seed admin credentials (used on first startup)
	SeedEmail    string
	SeedPassword string
	SeedName     string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	cfg := &Config{
		Port:         getEnvInt("PORT", 8081),
		Env:          getEnv("ENV", "development"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://ops:ops@localhost:5432/ops-portal?sslmode=disable"),
		JWTSecret:    getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		TokenTTL:     getEnvDuration("TOKEN_TTL", 1*time.Hour),
		RefreshTTL:   getEnvDuration("REFRESH_TTL", 7*24*time.Hour),
		GitHubToken:  os.Getenv("GITHUB_TOKEN"),
		GitHubOwner:  getEnv("GITHUB_OWNER", "featuresignals"),
		GitHubRepo:   getEnv("GITHUB_REPO", "featuresignals"),
		HetznerToken: os.Getenv("HETZNER_TOKEN"),
		CloudflareToken: os.Getenv("CLOUDFLARE_TOKEN"),
		CloudflareZoneID: os.Getenv("CLOUDFLARE_ZONE_ID"),
		SeedEmail:    getEnv("SEED_EMAIL", "admin@featuresignals.com"),
		SeedPassword: getEnv("SEED_PASSWORD", "ops-admin-initial-password"),
		SeedName:     getEnv("SEED_NAME", "Ops Admin"),
	}

	return cfg
}

// Validate checks that required config values are set.
// Fails fast at startup if critical config is missing.
func (c *Config) Validate() error {
	var missing []string

	if c.Port <= 0 || c.Port > 65535 {
		missing = append(missing, "PORT (must be 1-65535)")
	}
	if c.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if c.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}
	if c.JWTSecret == "dev-secret-change-in-production" && c.Env == "production" {
		slog.Warn("JWT_SECRET is set to the development default — this is insecure for production")
	}
	if c.SeedEmail == "" {
		missing = append(missing, "SEED_EMAIL")
	}
	if c.SeedPassword == "" {
		missing = append(missing, "SEED_PASSWORD")
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required config: %s", strings.Join(missing, ", "))
	}
	return nil
}

// IsProduction returns true when running in production mode.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

// --- helpers ---

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}