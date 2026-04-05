package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestApprovalFromDomain_StripsInternal(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	a := &domain.ApprovalRequest{
		ID:          "apr-1",
		OrgID:       "org-secret",
		RequestorID: "user-secret",
		FlagID:      "flag-1",
		EnvID:       "env-1",
		ChangeType:  "toggle",
		Payload:     json.RawMessage(`{"enabled":true}`),
		Status:      domain.ApprovalPending,
		ReviewerID:  strPtr("reviewer-secret"),
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	resp := ApprovalFromDomain(a)
	b, _ := json.Marshal(resp)
	s := string(b)

	forbidden := []string{"org_id", "requestor_id", "reviewer_id", "payload"}
	for _, f := range forbidden {
		if strings.Contains(s, f) {
			t.Errorf("response must not contain %q, got: %s", f, s)
		}
	}

	if resp.FlagID != "flag-1" || resp.Status != domain.ApprovalPending {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestApprovalFromDomain_Nil(t *testing.T) {
	if resp := ApprovalFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestApprovalSliceFromDomain_Empty(t *testing.T) {
	result := ApprovalSliceFromDomain([]domain.ApprovalRequest{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}

func strPtr(s string) *string { return &s }
