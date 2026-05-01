package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"unicode"

	"github.com/featuresignals/server/internal/domain"
)

// ── PayU hash utilities (legacy) ─────────────────────────────────────────────
// Deprecated: Use payment/payu.Provider via the payment.Gateway interface.
// Retained for backward compatibility with any external callers.

// PayUHasher encapsulates PayU hash generation.
type PayUHasher struct {
	MerchantKey string
	Salt        string
}

func (h PayUHasher) Hash(txnid, amount, productinfo, firstname, email string) string {
	raw := fmt.Sprintf("%s|%s|%s|%s|%s|%s|||||||||||%s",
		h.MerchantKey, txnid, amount, productinfo, firstname, email, h.Salt)
	sum := sha512.Sum512([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func (h PayUHasher) VerifyReverse(params map[string]string) bool {
	raw := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		h.Salt, params["status"], params["email"], params["firstname"],
		params["productinfo"], params["amount"], params["txnid"], h.MerchantKey)
	sum := sha512.Sum512([]byte(raw))
	return hex.EncodeToString(sum[:]) == params["hash"]
}

func (h PayUHasher) Endpoint(mode string) string {
	if mode == "live" {
		return "https://secure.payu.in/_payment"
	}
	return "https://test.payu.in/_payment"
}

// ── Password validation ─────────────────────────────────────────────────────

// ValidatePasswordStrength enforces: >=8 chars, 1 upper, 1 lower, 1 digit, 1 special.
func ValidatePasswordStrength(pw string) bool {
	if len(pw) < 8 {
		return false
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range pw {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasDigit && hasSpecial
}

// ── Default environment bootstrap ───────────────────────────────────────────

// DefaultEnvDefs returns the standard set of environments every project starts with.
var DefaultEnvDefs = []struct {
	Name, Slug, Color string
}{
	{"Development", "development", "#22C55E"},
	{"Staging", "staging", "#EAB308"},
	{"Production", "production", "#EF4444"},
}

// BootstrapEnvironments creates the default environment set for a project.
func BootstrapEnvironments(ctx context.Context, store domain.EnvironmentWriter, projectID string, orgID ...string) []*domain.Environment {
	var oid string
	if len(orgID) > 0 {
		oid = orgID[0]
	}
	envs := make([]*domain.Environment, 0, len(DefaultEnvDefs))
	for _, d := range DefaultEnvDefs {
		env := &domain.Environment{
			ProjectID: projectID,
			OrgID:     oid,
			Name:      d.Name,
			Slug:      d.Slug,
			Color:     d.Color,
		}
		if err := store.CreateEnvironment(ctx, env); err == nil {
			envs = append(envs, env)
		}
	}
	return envs
}

// ── API key hashing ─────────────────────────────────────────────────────────

// hashAPIKeyPepper returns the pepper secret used for API key HMAC.
// Uses ENCRYPTION_MASTER_KEY (32 bytes, hex-encoded) as the HMAC key.
// If not set, falls back to a hardcoded value (development only — production
// must set ENCRYPTION_MASTER_KEY).
func hashAPIKeyPepper() []byte {
	if k := os.Getenv("ENCRYPTION_MASTER_KEY"); k != "" {
		// Decode hex to get the raw 32-byte key.
		if raw, err := hex.DecodeString(k); err == nil && len(raw) == 32 {
			return raw
		}
	}
	// Development fallback — NOT for production use.
	return []byte("featuresignals-dev-pepper-32byte!")
}

// HashAPIKey returns the HMAC-SHA-256 hex digest of a raw API key, keyed with
// a server-side pepper (ENCRYPTION_MASTER_KEY). HMAC prevents rainbow table
// attacks if the api_keys table is breached. API keys are high-entropy
// (48 hex chars = ~192 bits), so a fast keyed hash is sufficient.
func HashAPIKey(key string) string {
	return HashAPIKeyWithPepper(key, hashAPIKeyPepper())
}

// HashAPIKeyWithPepper returns the HMAC-SHA-256 hex digest of a raw API key
// using the provided pepper secret. Exported for callers that already have
// the pepper material available.
func HashAPIKeyWithPepper(key string, pepper []byte) string {
	mac := hmac.New(sha256.New, pepper)
	mac.Write([]byte(key))
	return hex.EncodeToString(mac.Sum(nil))
}

// ── Sample data seeding (used by both Register and Demo flows) ──────────────

type sampleFlagState struct {
	enabled           bool
	percentageRollout int
	defaultValue      json.RawMessage
	variants          []domain.Variant
}

type flagSeeder interface {
	domain.FlagWriter
}

// SeedSampleFlags creates a curated set of feature flags with per-environment states.
func SeedSampleFlags(ctx context.Context, store flagSeeder, project *domain.Project, envs map[string]*domain.Environment, log *slog.Logger) {
	flags := []struct {
		key, name, desc string
		flagType        domain.FlagType
		defaultValue    json.RawMessage
		states          map[string]sampleFlagState
	}{
		{
			key: "dark-mode", name: "Dark Mode", desc: "Toggle dark mode UI theme",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]sampleFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`true`)},
				"staging":     {enabled: true, defaultValue: json.RawMessage(`true`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
		{
			key: "new-checkout-flow", name: "New Checkout Flow", desc: "Redesigned checkout experience",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]sampleFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`true`)},
				"staging":     {enabled: true, percentageRollout: 5000, defaultValue: json.RawMessage(`true`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
		{
			key: "pricing-experiment", name: "Pricing Experiment", desc: "A/B test for pricing page variants",
			flagType: domain.FlagTypeString, defaultValue: json.RawMessage(`"control"`),
			states: map[string]sampleFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`"control"`)},
				"staging": {enabled: true, defaultValue: json.RawMessage(`"control"`), variants: []domain.Variant{
					{Key: "control", Value: json.RawMessage(`"control"`), Weight: 3000},
					{Key: "variant-a", Value: json.RawMessage(`"variant-a"`), Weight: 4000},
					{Key: "variant-b", Value: json.RawMessage(`"variant-b"`), Weight: 3000},
				}},
				"production": {enabled: true, defaultValue: json.RawMessage(`"control"`)},
			},
		},
		{
			key: "api-rate-limit", name: "API Rate Limit", desc: "Per-user API rate limit value",
			flagType: domain.FlagTypeNumber, defaultValue: json.RawMessage(`100`),
			states: map[string]sampleFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`1000`)},
				"staging":     {enabled: true, defaultValue: json.RawMessage(`500`)},
				"production":  {enabled: true, defaultValue: json.RawMessage(`100`)},
			},
		},
		{
			key: "maintenance-mode", name: "Maintenance Mode", desc: "Kill switch to put app in maintenance mode",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]sampleFlagState{
				"development": {enabled: false, defaultValue: json.RawMessage(`false`)},
				"staging":     {enabled: false, defaultValue: json.RawMessage(`false`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
		{
			key: "beta-features", name: "Beta Features", desc: "Feature gate for beta users segment",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]sampleFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`true`)},
				"staging":     {enabled: false, defaultValue: json.RawMessage(`false`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
	}

	for _, fd := range flags {
		flag := &domain.Flag{
			ProjectID:    project.ID,
			OrgID:        project.OrgID,
			Key:          fd.key,
			Name:         fd.name,
			Description:  fd.desc,
			FlagType:     fd.flagType,
			DefaultValue: fd.defaultValue,
		}
		if err := store.CreateFlag(ctx, flag); err != nil {
			log.Error("failed to create sample flag", "error", err, "key", fd.key)
			continue
		}
		for envSlug, sd := range fd.states {
			env, ok := envs[envSlug]
			if !ok {
				continue
			}
			fs := &domain.FlagState{
				FlagID:            flag.ID,
				EnvID:             env.ID,
				OrgID:             project.OrgID,
				Enabled:           sd.enabled,
				DefaultValue:      sd.defaultValue,
				PercentageRollout: sd.percentageRollout,
				Variants:          sd.variants,
			}
			if err := store.UpsertFlagState(ctx, fs); err != nil {
				log.Error("failed to create sample flag state", "error", err, "flag", fd.key, "env", envSlug)
			}
		}
	}
}

// SeedSampleSegment creates a sample user segment.
func SeedSampleSegment(ctx context.Context, store domain.SegmentStore, project *domain.Project, log *slog.Logger) {
	seg := &domain.Segment{
		ProjectID:   project.ID,
		OrgID:       project.OrgID,
		Key:         "beta-users",
		Name:        "Beta Users",
		Description: "Users with @company.com email addresses",
		MatchType:   domain.MatchAll,
		Rules: []domain.Condition{
			{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"@company.com"}},
		},
	}
	if err := store.CreateSegment(ctx, seg); err != nil {
		log.Error("failed to create sample segment", "error", err)
	}
}

// SeedSampleAPIKeys creates server and client API keys for each environment.
func SeedSampleAPIKeys(ctx context.Context, store domain.APIKeyStore, envs map[string]*domain.Environment, log *slog.Logger) {
	for slug, env := range envs {
		for _, keyType := range []domain.APIKeyType{domain.APIKeyServer, domain.APIKeyClient} {
			rawKey, keyHash, keyPrefix := generateAPIKey(keyType)
			_ = rawKey
			ak := &domain.APIKey{
				EnvID:     env.ID,
				OrgID:     env.OrgID,
				KeyHash:   keyHash,
				KeyPrefix: keyPrefix,
				Name:      fmt.Sprintf("Sample %s %s key", slug, keyType),
				Type:      keyType,
			}
			if err := store.CreateAPIKey(ctx, ak); err != nil {
				log.Error("failed to create sample API key", "error", err, "env", slug, "type", keyType)
			}
		}
	}
}
