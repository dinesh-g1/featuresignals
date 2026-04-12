package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	for _, key := range []string{"PORT", "DATABASE_URL", "JWT_SECRET", "LOG_LEVEL"} {
		os.Unsetenv(key)
	}
	cfg := Load()

	if cfg.Port != 8080 {
		t.Errorf("expected default port 8080, got %d", cfg.Port)
	}
	if cfg.JWTSecret != "dev-secret-change-in-production-local" {
		t.Errorf("expected default JWT secret, got '%s'", cfg.JWTSecret)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("expected default log level 'info', got '%s'", cfg.LogLevel)
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
	if cfg.DatabaseURL != "postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable" {
		t.Errorf("expected default DATABASE_URL with sslmode=disable, got '%s'", cfg.DatabaseURL)
	}
}

func TestIsInternalUser(t *testing.T) {
	tests := []struct {
		name   string
		domain string
		emails []string
		input  string
		want   bool
	}{
		{name: "domain match", domain: "acme.com", input: "dev@acme.com", want: true},
		{name: "domain mismatch", domain: "acme.com", input: "dev@other.com", want: false},
		{name: "domain case insensitive", domain: "acme.com", input: "Dev@ACME.COM", want: true},
		{name: "explicit email match", emails: []string{"dev@gmail.com"}, input: "dev@gmail.com", want: true},
		{name: "explicit email case insensitive", emails: []string{"dev@gmail.com"}, input: "Dev@Gmail.COM", want: true},
		{name: "explicit email mismatch", emails: []string{"dev@gmail.com"}, input: "other@gmail.com", want: false},
		{name: "both domain and email", domain: "acme.com", emails: []string{"guest@other.com"}, input: "guest@other.com", want: true},
		{name: "empty email", domain: "acme.com", input: "", want: false},
		{name: "no config set", input: "anyone@anywhere.com", want: false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := &Config{SuperModeDomain: tc.domain, SuperModeEmails: tc.emails}
			if got := cfg.IsInternalUser(tc.input); got != tc.want {
				t.Errorf("IsInternalUser(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}

func TestParseSuperModeEmails(t *testing.T) {
	tests := []struct {
		name  string
		raw   string
		count int
	}{
		{name: "empty", raw: "", count: 0},
		{name: "single", raw: "dev@acme.com", count: 1},
		{name: "multiple with spaces", raw: " a@b.com , c@d.com , e@f.com ", count: 3},
		{name: "trailing comma", raw: "a@b.com,", count: 1},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			emails := parseSuperModeEmails(tc.raw)
			if len(emails) != tc.count {
				t.Errorf("parseSuperModeEmails(%q) returned %d emails, want %d", tc.raw, len(emails), tc.count)
			}
		})
	}
}

func TestLoad_SuperModeFromEnv(t *testing.T) {
	os.Setenv("SUPER_MODE_DOMAIN", "TestCompany.com")
	os.Setenv("SUPER_MODE_EMAILS", "Dev@Gmail.com, QA@Corp.co")
	defer func() {
		os.Unsetenv("SUPER_MODE_DOMAIN")
		os.Unsetenv("SUPER_MODE_EMAILS")
	}()

	cfg := Load()
	if cfg.SuperModeDomain != "testcompany.com" {
		t.Errorf("expected lowercased domain 'testcompany.com', got %q", cfg.SuperModeDomain)
	}
	if len(cfg.SuperModeEmails) != 2 {
		t.Fatalf("expected 2 emails, got %d", len(cfg.SuperModeEmails))
	}
	if cfg.SuperModeEmails[0] != "dev@gmail.com" {
		t.Errorf("expected lowercased email, got %q", cfg.SuperModeEmails[0])
	}
}
