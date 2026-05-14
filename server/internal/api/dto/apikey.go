package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type APIKeyResponse struct {
	ID         string            `json:"id"`
	KeyPrefix  string            `json:"key_prefix"`
	Name       string            `json:"name"`
	Type       domain.APIKeyType `json:"type"`
	Scopes     []string          `json:"scopes,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	LastUsedAt *time.Time        `json:"last_used_at,omitempty"`
	ExpiresAt  *time.Time        `json:"expires_at,omitempty"`
	RevokedAt  *time.Time        `json:"revoked_at,omitempty"`
}

func APIKeyFromDomain(k *domain.APIKey) *APIKeyResponse {
	if k == nil {
		return nil
	}
	return &APIKeyResponse{
		ID:         k.ID,
		KeyPrefix:  k.KeyPrefix,
		Name:       k.Name,
		Type:       k.Type,
		Scopes:     k.Scopes,
		CreatedAt:  k.CreatedAt,
		LastUsedAt: k.LastUsedAt,
		ExpiresAt:  k.ExpiresAt,
		RevokedAt:  k.RevokedAt,
	}
}

func APIKeySliceFromDomain(ks []domain.APIKey) []APIKeyResponse {
	out := make([]APIKeyResponse, 0, len(ks))
	for i := range ks {
		out = append(out, *APIKeyFromDomain(&ks[i]))
	}
	return out
}
