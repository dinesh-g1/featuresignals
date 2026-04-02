package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port        int
	DatabaseURL string
	JWTSecret   string
	TokenTTL    time.Duration
	RefreshTTL  time.Duration
	LogLevel    string
	CORSOrigins []string

	StripeSecretKey       string
	StripeWebhookSecret   string
	StripePriceProMonthly string
}

func Load() *Config {
	return &Config{
		Port:        getEnvInt("PORT", 8080),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		TokenTTL:    time.Duration(getEnvInt("TOKEN_TTL_MINUTES", 60)) * time.Minute,
		RefreshTTL:  time.Duration(getEnvInt("REFRESH_TTL_HOURS", 168)) * time.Hour, // 7 days
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		CORSOrigins: parseCORSOrigins(getEnv("CORS_ORIGIN", "http://localhost:3000")),

		StripeSecretKey:       os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:   os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePriceProMonthly: os.Getenv("STRIPE_PRICE_PRO_MONTHLY"),
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
