package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestAuditEntryFromDomain_StripsInternalData(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	actorID := "user-1"
	resourceID := "flag-1"
	a := &domain.AuditEntry{
		ID:           "audit-1",
		OrgID:        "org-secret",
		ActorID:      &actorID,
		ActorType:    "user",
		Action:       "flag.updated",
		ResourceType: "flag",
		ResourceID:   &resourceID,
		BeforeState:  json.RawMessage(`{"sensitive":"before"}`),
		AfterState:   json.RawMessage(`{"sensitive":"after"}`),
		Metadata:     json.RawMessage(`{"ip":"1.2.3.4"}`),
		CreatedAt:    now,
	}

	resp := AuditEntryFromDomain(a)
	b, _ := json.Marshal(resp)
	s := string(b)

	forbidden := []string{"org_id", "before_state", "after_state", "metadata"}
	for _, f := range forbidden {
		if strings.Contains(s, f) {
			t.Errorf("response must not contain %q, got: %s", f, s)
		}
	}

	if resp.Action != "flag.updated" || resp.ResourceType != "flag" {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestAuditEntryFromDomain_Nil(t *testing.T) {
	if resp := AuditEntryFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestAuditEntrySliceFromDomain_Empty(t *testing.T) {
	result := AuditEntrySliceFromDomain([]domain.AuditEntry{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}
