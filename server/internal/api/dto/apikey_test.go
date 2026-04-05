package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestAPIKeyFromDomain_StripsEnvID(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	k := &domain.APIKey{
		ID:        "key-1",
		EnvID:     "env-secret",
		KeyHash:   "hash-secret",
		KeyPrefix: "fs_live_",
		Name:      "Production Key",
		Type:      domain.APIKeyServer,
		CreatedAt: now,
	}

	resp := APIKeyFromDomain(k)
	b, _ := json.Marshal(resp)
	s := string(b)

	if strings.Contains(s, "env_id") {
		t.Errorf("response must not contain env_id, got: %s", s)
	}
	if strings.Contains(s, "key_hash") {
		t.Errorf("response must not contain key_hash, got: %s", s)
	}
	if resp.KeyPrefix != "fs_live_" || resp.Name != "Production Key" {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestAPIKeyFromDomain_Nil(t *testing.T) {
	if resp := APIKeyFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestAPIKeySliceFromDomain_Empty(t *testing.T) {
	result := APIKeySliceFromDomain([]domain.APIKey{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}
