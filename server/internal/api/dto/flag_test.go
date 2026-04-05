package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestFlagFromDomain_StripsProjectID(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	f := &domain.Flag{
		ID:           "flag-1",
		ProjectID:    "proj-secret-123",
		Key:          "new-feature",
		Name:         "New Feature",
		FlagType:     domain.FlagTypeBoolean,
		DefaultValue: json.RawMessage(`false`),
		Tags:         []string{"release"},
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	resp := FlagFromDomain(f)

	b, _ := json.Marshal(resp)
	s := string(b)

	if strings.Contains(s, "project_id") {
		t.Errorf("response must not contain project_id, got: %s", s)
	}
	if resp.Key != "new-feature" || resp.ID != "flag-1" {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestFlagFromDomain_NilTags(t *testing.T) {
	f := &domain.Flag{ID: "f-1", Tags: nil}
	resp := FlagFromDomain(f)

	b, _ := json.Marshal(resp)
	if !strings.Contains(string(b), `"tags":[]`) {
		t.Errorf("nil tags should serialize as empty array, got: %s", string(b))
	}
}

func TestFlagFromDomain_Nil(t *testing.T) {
	if resp := FlagFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestFlagSliceFromDomain_Empty(t *testing.T) {
	result := FlagSliceFromDomain([]domain.Flag{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}

func TestFlagStateFromDomain_StripsIDs(t *testing.T) {
	s := &domain.FlagState{
		ID:      "state-1",
		FlagID:  "flag-secret",
		EnvID:   "env-secret",
		Enabled: true,
	}

	resp := FlagStateFromDomain(s)
	b, _ := json.Marshal(resp)
	raw := string(b)

	if strings.Contains(raw, "flag_id") {
		t.Errorf("response must not contain flag_id, got: %s", raw)
	}
	if strings.Contains(raw, "env_id") {
		t.Errorf("response must not contain env_id, got: %s", raw)
	}
	if resp.ID != "state-1" || !resp.Enabled {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestFlagStateFromDomain_Nil(t *testing.T) {
	if resp := FlagStateFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}
