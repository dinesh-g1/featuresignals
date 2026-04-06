package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		switch strings.ToLower(v) {
		case "true", "1", "yes":
			return true
		case "false", "0", "no":
			return false
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}

type Config struct {
	Port        int
	DatabaseURL string
	JWTSecret   string
	TokenTTL    time.Duration
	RefreshTTL  time.Duration
	LogLevel    string
	CORSOrigins []string

	PayUMerchantKey string
	PayUSalt        string
	PayUMode        string

	// Email OTP (MSG91 Email API)
	MSG91AuthKey         string
	MSG91EmailTemplateID string
	MSG91EmailDomain     string
	MSG91EmailFrom       string
	MSG91EmailFromName   string

	// App
	AppBaseURL   string
	DashboardURL string

	// On-Premises Licensing
	LicenseKey       string
	LicensePublicKey string

	// Audit log retention in days (default 90, configurable for enterprise/self-hosted)
	AuditRetentionDays int

	// OpenTelemetry / SigNoz observability
	OTELEnabled        bool
	OTELEndpoint       string
	OTELIngestionKey   string
	OTELServiceName    string
	OTELServiceRegion  string
	OTELTracesEnabled  bool
	OTELMetricsEnabled bool
	OTELLogsEnabled    bool
	OTELLogLevel       string
	OTELSampleRate     float64
}

func Load() *Config {
	return &Config{
		Port:        getEnvInt("PORT", 8080),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=require"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		TokenTTL:    time.Duration(getEnvInt("TOKEN_TTL_MINUTES", 60)) * time.Minute,
		RefreshTTL:  time.Duration(getEnvInt("REFRESH_TTL_HOURS", 168)) * time.Hour, // 7 days
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		CORSOrigins: parseCORSOrigins(getEnv("CORS_ORIGIN", "http://localhost:3000")),

		PayUMerchantKey: os.Getenv("PAYU_MERCHANT_KEY"),
		PayUSalt:        os.Getenv("PAYU_SALT"),
		PayUMode:        getEnv("PAYU_MODE", "test"),

		MSG91AuthKey:         os.Getenv("MSG91_AUTH_KEY"),
		MSG91EmailTemplateID: os.Getenv("MSG91_EMAIL_TEMPLATE_ID"),
		MSG91EmailDomain:     getEnv("MSG91_EMAIL_DOMAIN", "mail.featuresignals.com"),
		MSG91EmailFrom:       getEnv("MSG91_EMAIL_FROM", "noreply@mail.featuresignals.com"),
		MSG91EmailFromName:   getEnv("MSG91_EMAIL_FROM_NAME", "Feature Signals"),

		AppBaseURL:   getEnv("APP_BASE_URL", "http://localhost:8080"),
		DashboardURL: getEnv("DASHBOARD_URL", "http://localhost:3000"),

		LicenseKey:       os.Getenv("LICENSE_KEY"),
		LicensePublicKey: getEnv("LICENSE_PUBLIC_KEY_PATH", ""),

		AuditRetentionDays: getEnvInt("AUDIT_RETENTION_DAYS", 90),

		OTELEnabled:        getEnvBool("OTEL_ENABLED", false),
		OTELEndpoint:       getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		OTELIngestionKey:   os.Getenv("OTEL_INGESTION_KEY"),
		OTELServiceName:    getEnv("OTEL_SERVICE_NAME", "featuresignals-api"),
		OTELServiceRegion:  getEnv("OTEL_SERVICE_REGION", "local"),
		OTELTracesEnabled:  getEnvBool("OTEL_TRACES_ENABLED", true),
		OTELMetricsEnabled: getEnvBool("OTEL_METRICS_ENABLED", true),
		OTELLogsEnabled:    getEnvBool("OTEL_LOGS_ENABLED", false),
		OTELLogLevel:       getEnv("OTEL_LOG_LEVEL", "warn"),
		OTELSampleRate:     getEnvFloat("OTEL_TRACE_SAMPLE_RATE", 0.1),
	}
}

func parseCORSOrigins(raw string) []string {
	var origins []string
	for _, o := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) == 0 {
		return []string{"http://localhost:3000"}
	}
	return origins
}

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
