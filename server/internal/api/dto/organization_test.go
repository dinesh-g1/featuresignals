package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestOrganizationFromDomain(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	trial := now.Add(14 * 24 * time.Hour)
	org := &domain.Organization{
		ID:                    "org-1",
		Name:                  "Acme",
		Slug:                  "acme",
		Plan:                  "pro",
		DataRegion:            "us",
		PayUCustomerRef:       "payu-secret-123",
		PlanSeatsLimit:        50,
		PlanProjectsLimit:     10,
		PlanEnvironmentsLimit: 5,
		TrialExpiresAt:        &trial,
		CreatedAt:             now,
		UpdatedAt:             now,
	}

	resp := OrganizationFromDomain(org)

	if resp.ID != "org-1" || resp.Name != "Acme" || resp.Slug != "acme" || resp.Plan != "pro" {
		t.Errorf("unexpected values: %+v", resp)
	}
	if resp.DataRegion != "us" {
		t.Errorf("expected data_region=us, got %s", resp.DataRegion)
	}
	if resp.TrialExpiresAt == nil || !resp.TrialExpiresAt.Equal(trial) {
		t.Errorf("expected trial_expires_at=%v, got %v", trial, resp.TrialExpiresAt)
	}

	b, _ := json.Marshal(resp)
	s := string(b)

	forbidden := []string{"payu_customer_ref", "plan_seats_limit", "plan_projects_limit", "plan_environments_limit", "deleted_at"}
	for _, f := range forbidden {
		if strings.Contains(s, f) {
			t.Errorf("response JSON must not contain %q, got: %s", f, s)
		}
	}

	required := []string{"trial_expires_at", "data_region"}
	for _, r := range required {
		if !strings.Contains(s, r) {
			t.Errorf("response JSON must contain %q, got: %s", r, s)
		}
	}
}

func TestOrganizationFromDomain_NoTrial(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	org := &domain.Organization{
		ID:        "org-2",
		Name:      "Free Co",
		Slug:      "free-co",
		Plan:      "free",
		CreatedAt: now,
		UpdatedAt: now,
	}

	resp := OrganizationFromDomain(org)
	b, _ := json.Marshal(resp)
	s := string(b)

	if strings.Contains(s, "trial_expires_at") {
		t.Errorf("response JSON must omit trial_expires_at when nil, got: %s", s)
	}
}

func TestOrganizationFromDomain_Nil(t *testing.T) {
	if resp := OrganizationFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}
