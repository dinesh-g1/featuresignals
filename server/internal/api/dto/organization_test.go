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

	b, _ := json.Marshal(resp)
	s := string(b)

	forbidden := []string{"payu_customer_ref", "plan_seats_limit", "plan_projects_limit", "plan_environments_limit", "trial_expires_at", "deleted_at"}
	for _, f := range forbidden {
		if strings.Contains(s, f) {
			t.Errorf("response JSON must not contain %q, got: %s", f, s)
		}
	}
}

func TestOrganizationFromDomain_Nil(t *testing.T) {
	if resp := OrganizationFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}
