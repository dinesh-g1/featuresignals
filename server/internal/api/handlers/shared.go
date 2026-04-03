package handlers

import (
	"context"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"unicode"

	"github.com/featuresignals/server/internal/domain"
)

// ── PayU hash utilities ─────────────────────────────────────────────────────

// PayUHasher encapsulates PayU hash generation so the billing and demo
// handlers don't each carry their own copy (DRY).
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
func BootstrapEnvironments(ctx context.Context, store domain.Store, projectID string) []*domain.Environment {
	envs := make([]*domain.Environment, 0, len(DefaultEnvDefs))
	for _, d := range DefaultEnvDefs {
		env := &domain.Environment{
			ProjectID: projectID,
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

// HashAPIKey returns the SHA-256 hex digest of a raw API key.
func HashAPIKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return fmt.Sprintf("%x", h[:])
}
