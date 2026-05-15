package config

import (
	"errors"
	"fmt"
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
	DBMaxConns  int
	DBMinConns  int
	JWTSecret   string
	TokenTTL    time.Duration
	RefreshTTL  time.Duration
	LogLevel    string

	PayUMerchantKey string
	PayUSalt        string
	PayUMode        string

	// Stripe
	StripeSecretKey     string
	StripeWebhookSecret string
	StripePriceID       string
	StripeMode          string

	// ── AI Janitor ──────────────────────────────────────────────
	DeepSeekAPIKey         string
	DeepSeekModel          string
	OpenAIAPIKey           string
	OpenAIModel            string
	OpenAIEndpoint         string
	AzureOpenAIAPIKey      string
	AzureOpenAIEndpoint    string
	AzureOpenAIModel       string
	GitHubClientID         string
	GitHubClientSecret     string
	GitLabClientID         string
	GitLabClientSecret     string
	BitbucketClientID      string
	BitbucketClientSecret  string
	JanitorEncryptionKey   string
	JanitorLLMTimeout      time.Duration
	JanitorLLMMaxRetries   int
	JanitorLLMMinConfidence float64

	// Deployment mode: "cloud" or "onprem"
	DeploymentMode string

	// Email provider: "zeptomail", "smtp", or "none"
	EmailProvider string

	// SMTP settings (used when EmailProvider = "smtp")
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPass     string
	SMTPFrom     string
	SMTPFromName string

	// ZeptoMail (used when EmailProvider = "zeptomail")
	ZeptoMailToken     string
	ZeptoMailFromEmail string
	ZeptoMailFromName  string
	ZeptoMailBaseURL   string

	// App
	AppBaseURL   string
	DashboardURL string

	// On-Premises Licensing
	LicenseKey       string
	LicensePublicKey string

	// Audit log retention in days (default 90, configurable for enterprise/self-hosted)
	AuditRetentionDays int

	// Encryption master key (hex-encoded, 64 hex chars = 32 bytes for AES-256)
	// Used to encrypt env var values at rest in the database.
	EncryptionMasterKey string

	// Sales inquiry notification email (where contact form submissions are sent).
	SalesNotifyEmail string

	// Super Mode: server-controlled internal developer access.
	// SUPER_MODE_DOMAIN matches any user with this email domain (e.g., "featuresignals.com").
	// SUPER_MODE_EMAILS is a comma-separated allowlist of specific emails.
	SuperModeDomain string
	SuperModeEmails []string

	// Multi-region: identifies which region this server instance serves.
	// Used for JWT claims, telemetry, and audit logging — not for routing.
	LocalRegion string

	// ── Policy Evaluator (Governance Pipeline) ────────────────────
	// Maximum number of policies evaluated per agent action.
	PolicyEvalMaxPolicies int
	// Timeout for CEL expression evaluation (milliseconds).
	PolicyEvalTimeoutMs int
	// Per-step governance pipeline timeout (milliseconds).
	PipelineStepTimeoutMs int

	// ── Agent Runtime ─────────────────────────────────────────────
	AgentHeartbeatIntervalSec int
	AgentStaleTimeoutSec       int

	// ── Workflow Engine ───────────────────────────────────────────
	WorkflowMaxConcurrent     int
	WorkflowDefaultTimeoutSec int
	WorkflowMaxRetries        int

	// Router configuration
	RouterDomain string
	RouterEmail  string
	ClusterName  string

	// Event Bus
	EventBusProvider string // "nats", "noop"
	NATSURL          string

	// OpenTelemetry
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
		DatabaseURL: getEnv("DATABASE_URL", "postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable"),
		DBMaxConns:  getEnvInt("DB_MAX_CONNS", 25),
		DBMinConns:  getEnvInt("DB_MIN_CONNS", 5),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-change-in-production-local"),
		TokenTTL:    time.Duration(getEnvInt("TOKEN_TTL_MINUTES", 60)) * time.Minute,
		RefreshTTL:  time.Duration(getEnvInt("REFRESH_TTL_HOURS", 168)) * time.Hour, // 7 days
		LogLevel:    getEnv("LOG_LEVEL", "info"),

		PayUMerchantKey: os.Getenv("PAYU_MERCHANT_KEY"),
		PayUSalt:        os.Getenv("PAYU_SALT"),
		PayUMode:        getEnv("PAYU_MODE", "test"),

		StripeSecretKey:     os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePriceID:       os.Getenv("STRIPE_PRICE_ID"),
		StripeMode:          getEnv("STRIPE_MODE", "test"),

		// ── AI Janitor ──────────────────────────────────────────────
		DeepSeekAPIKey:          os.Getenv("DEEPSEEK_API_KEY"),
		DeepSeekModel:           getEnv("DEEPSEEK_MODEL", "deepseek-chat"),
		OpenAIAPIKey:            os.Getenv("OPENAI_API_KEY"),
		OpenAIModel:             getEnv("OPENAI_MODEL", "gpt-4o-mini"),
		OpenAIEndpoint:          getEnv("OPENAI_ENDPOINT", "https://api.openai.com/v1"),
		AzureOpenAIAPIKey:       os.Getenv("AZURE_OPENAI_API_KEY"),
		AzureOpenAIEndpoint:     os.Getenv("AZURE_OPENAI_ENDPOINT"),
		AzureOpenAIModel:        getEnv("AZURE_OPENAI_MODEL", "gpt-4o"),
		GitHubClientID:          os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret:      os.Getenv("GITHUB_CLIENT_SECRET"),
		GitLabClientID:          os.Getenv("GITLAB_CLIENT_ID"),
		GitLabClientSecret:      os.Getenv("GITLAB_CLIENT_SECRET"),
		BitbucketClientID:       os.Getenv("BITBUCKET_CLIENT_ID"),
		BitbucketClientSecret:   os.Getenv("BITBUCKET_CLIENT_SECRET"),
		JanitorEncryptionKey:    os.Getenv("JANITOR_ENCRYPTION_KEY"),
		JanitorLLMTimeout:       time.Duration(getEnvInt("JANITOR_LLM_TIMEOUT_SECONDS", 30)) * time.Second,
		JanitorLLMMaxRetries:    getEnvInt("JANITOR_LLM_MAX_RETRIES", 3),
		JanitorLLMMinConfidence: getEnvFloat("JANITOR_LLM_MIN_CONFIDENCE", 0.85),

		DeploymentMode: getEnv("DEPLOYMENT_MODE", "cloud"),
		EmailProvider:  getEnv("EMAIL_PROVIDER", "zeptomail"),

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnvInt("SMTP_PORT", 587),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPass:     os.Getenv("SMTP_PASS"),
		SMTPFrom:     getEnv("SMTP_FROM", "noreply@localhost"),
		SMTPFromName: getEnv("SMTP_FROM_NAME", "FeatureSignals"),

		ZeptoMailToken:     strings.TrimSpace(os.Getenv("ZEPTOMAIL_TOKEN")),
		ZeptoMailFromEmail: getEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@featuresignals.com"),
		ZeptoMailFromName:  getEnv("ZEPTOMAIL_FROM_NAME", "FeatureSignals"),
		ZeptoMailBaseURL:   getEnv("ZEPTOMAIL_BASE_URL", "https://api.zeptomail.in"),

		AppBaseURL:   getEnv("APP_BASE_URL", "http://localhost:8080"),
		DashboardURL: getEnv("DASHBOARD_URL", "http://localhost:3000"),

		LicenseKey:       os.Getenv("LICENSE_KEY"),
		LicensePublicKey: getEnv("LICENSE_PUBLIC_KEY_PATH", ""),

		AuditRetentionDays: getEnvInt("AUDIT_RETENTION_DAYS", 90),

		EncryptionMasterKey: os.Getenv("ENCRYPTION_MASTER_KEY"),

		SalesNotifyEmail: getEnv("SALES_NOTIFY_EMAIL", "dineshreddy@featuresignals.com"),

		SuperModeDomain: strings.ToLower(strings.TrimSpace(os.Getenv("SUPER_MODE_DOMAIN"))),
		SuperModeEmails: parseSuperModeEmails(os.Getenv("SUPER_MODE_EMAILS")),

		LocalRegion: getEnv("LOCAL_REGION", "in"),

		// Policy Evaluator
		PolicyEvalMaxPolicies:  getEnvInt("POLICY_EVAL_MAX_POLICIES", 50),
		PolicyEvalTimeoutMs:    getEnvInt("POLICY_EVAL_TIMEOUT_MS", 10),
		PipelineStepTimeoutMs:  getEnvInt("PIPELINE_STEP_TIMEOUT_MS", 10),

		// Agent Runtime
		AgentHeartbeatIntervalSec: getEnvInt("AGENT_HEARTBEAT_INTERVAL_SEC", 30),
		AgentStaleTimeoutSec:      getEnvInt("AGENT_STALE_TIMEOUT_SEC", 120),

		// Workflow Engine
		WorkflowMaxConcurrent:     getEnvInt("WORKFLOW_MAX_CONCURRENT", 50),
		WorkflowDefaultTimeoutSec: getEnvInt("WORKFLOW_DEFAULT_TIMEOUT_SEC", 300),
		WorkflowMaxRetries:        getEnvInt("WORKFLOW_MAX_RETRIES", 3),

		RouterDomain: getEnv("ROUTER_DOMAIN", ""),
		RouterEmail:  getEnv("ROUTER_EMAIL", ""),
		ClusterName:  getEnv("CLUSTER_NAME", "us-001"),

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

		EventBusProvider: getEnv("EVENT_BUS_PROVIDER", "noop"),
		NATSURL:          getEnv("NATS_URL", "nats://localhost:4222"),

	}
}

func (c *Config) IsOnPrem() bool {
	return c.DeploymentMode == "onprem"
}

func (c *Config) BillingEnabled() bool {
	return !c.IsOnPrem() && (c.StripeSecretKey != "" || c.PayUMerchantKey != "")
}

// Validate checks configuration for security issues and returns a
// multi-error of all problems found. This should be called at startup
// and the server should refuse to start if any errors are returned.
func (c *Config) Validate() error {
	var errs []error

	// Check for placeholder values in secret fields (production guard)
	placeholderPrefixes := []string{"your-", "changeme", "replace-me", "example"}
	isPlaceholder := func(v string) bool {
		v = strings.ToLower(strings.TrimSpace(v))
		if v == "" {
			return false
		}
		for _, p := range placeholderPrefixes {
			if strings.HasPrefix(v, p) {
				return true
			}
		}
		return false
	}

	// Critical secrets that must not be placeholders in production
	secrets := map[string]string{
		"JWT_SECRET":            c.JWTSecret,
		"DATABASE_URL":          c.DatabaseURL,
		"ENCRYPTION_MASTER_KEY": c.EncryptionMasterKey,
		"ZEPTOMAIL_TOKEN":       c.ZeptoMailToken,
	}

	for name, val := range secrets {
		if isPlaceholder(val) {
			errs = append(errs, fmt.Errorf("config: %s is set to a placeholder value (%s) — refusing to start with insecure defaults", name, val))
		}
	}

	// ZeptoMail-specific validation
	if c.EmailProvider == "zeptomail" {
		if c.ZeptoMailToken == "" {
			errs = append(errs, fmt.Errorf("config: EMAIL_PROVIDER is zeptomail but ZEPTOMAIL_TOKEN is not set"))
		}
		if c.ZeptoMailToken != "" && !strings.HasPrefix(strings.TrimSpace(c.ZeptoMailToken), "Zoho-enczapikey") {
			// Token may or may not have the prefix — both are valid depending on how stored
			// Just warn, don't error
		}
	}

	// Stripe validation
	if c.StripeSecretKey != "" && isPlaceholder(c.StripeSecretKey) {
		errs = append(errs, fmt.Errorf("config: STRIPE_SECRET_KEY is set to a placeholder value"))
	}

	if len(errs) > 0 {
		return fmt.Errorf("configuration validation failed: %w", errors.Join(errs...))
	}
	return nil
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

// IsInternalUser checks if an email matches the super mode domain or explicit allowlist.
func (c *Config) IsInternalUser(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return false
	}
	if c.SuperModeDomain != "" {
		parts := strings.SplitN(email, "@", 2)
		if len(parts) == 2 && parts[1] == c.SuperModeDomain {
			return true
		}
	}
	for _, allowed := range c.SuperModeEmails {
		if allowed == email {
			return true
		}
	}
	return false
}

func parseSuperModeEmails(raw string) []string {
	var emails []string
	for _, e := range strings.Split(raw, ",") {
		if trimmed := strings.ToLower(strings.TrimSpace(e)); trimmed != "" {
			emails = append(emails, trimmed)
		}
	}
	return emails
}
