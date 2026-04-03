package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	for _, key := range []string{"PORT", "DATABASE_URL", "JWT_SECRET", "LOG_LEVEL", "CORS_ORIGIN"} {
		os.Unsetenv(key)
	}
	cfg := Load()

	if cfg.Port != 8080 {
		t.Errorf("expected default port 8080, got %d", cfg.Port)
	}
	if cfg.JWTSecret != "dev-secret-change-in-production" {
		t.Errorf("expected default JWT secret, got '%s'", cfg.JWTSecret)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("expected default log level 'info', got '%s'", cfg.LogLevel)
	}
	if len(cfg.CORSOrigins) != 1 || cfg.CORSOrigins[0] != "http://localhost:3000" {
		t.Errorf("expected default CORS origin, got %v", cfg.CORSOrigins)
	}
}

func TestLoad_EnvOverrides(t *testing.T) {
	os.Setenv("PORT", "9090")
	os.Setenv("JWT_SECRET", "custom-secret")
	os.Setenv("LOG_LEVEL", "debug")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("LOG_LEVEL")
	}()

	cfg := Load()

	if cfg.Port != 9090 {
		t.Errorf("expected port 9090, got %d", cfg.Port)
	}
	if cfg.JWTSecret != "custom-secret" {
		t.Errorf("expected custom JWT secret, got '%s'", cfg.JWTSecret)
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("expected log level 'debug', got '%s'", cfg.LogLevel)
	}
}

func TestParseCORSOrigins_Single(t *testing.T) {
	origins := parseCORSOrigins("https://app.example.com")
	if len(origins) != 1 || origins[0] != "https://app.example.com" {
		t.Errorf("expected single origin, got %v", origins)
	}
}

func TestParseCORSOrigins_Multiple(t *testing.T) {
	origins := parseCORSOrigins("https://a.com, https://b.com, https://c.com")
	if len(origins) != 3 {
		t.Fatalf("expected 3 origins, got %d", len(origins))
	}
	if origins[1] != "https://b.com" {
		t.Errorf("expected 'https://b.com', got '%s'", origins[1])
	}
}

func TestParseCORSOrigins_Empty(t *testing.T) {
	origins := parseCORSOrigins("")
	if len(origins) != 1 || origins[0] != "http://localhost:3000" {
		t.Errorf("expected default origin for empty input, got %v", origins)
	}
}

func TestParseCORSOrigins_Whitespace(t *testing.T) {
	origins := parseCORSOrigins("  https://a.com ,  https://b.com  ")
	if len(origins) != 2 {
		t.Fatalf("expected 2 origins, got %d", len(origins))
	}
	if origins[0] != "https://a.com" || origins[1] != "https://b.com" {
		t.Errorf("expected trimmed origins, got %v", origins)
	}
}

func TestGetEnvInt_Valid(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	defer os.Unsetenv("TEST_INT")

	if v := getEnvInt("TEST_INT", 0); v != 42 {
		t.Errorf("expected 42, got %d", v)
	}
}

func TestGetEnvInt_InvalidFallback(t *testing.T) {
	os.Setenv("TEST_INT_BAD", "notanumber")
	defer os.Unsetenv("TEST_INT_BAD")

	if v := getEnvInt("TEST_INT_BAD", 99); v != 99 {
		t.Errorf("expected fallback 99, got %d", v)
	}
}

func TestGetEnvInt_Unset(t *testing.T) {
	os.Unsetenv("TEST_INT_UNSET")
	if v := getEnvInt("TEST_INT_UNSET", 77); v != 77 {
		t.Errorf("expected fallback 77, got %d", v)
	}
}

func TestLoad_DatabaseURL_DefaultSSL(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	cfg := Load()
	if cfg.DatabaseURL != "postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=require" {
		t.Errorf("expected default DATABASE_URL with sslmode=require, got '%s'", cfg.DatabaseURL)
	}
}
