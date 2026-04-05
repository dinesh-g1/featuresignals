package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestProjectFromDomain_StripsOrgID(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	p := &domain.Project{
		ID:        "proj-1",
		OrgID:     "org-secret-123",
		Name:      "My App",
		Slug:      "my-app",
		CreatedAt: now,
		UpdatedAt: now,
	}

	resp := ProjectFromDomain(p)
	b, _ := json.Marshal(resp)
	s := string(b)

	if strings.Contains(s, "org_id") {
		t.Errorf("response must not contain org_id, got: %s", s)
	}
	if resp.ID != "proj-1" || resp.Name != "My App" {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestProjectFromDomain_Nil(t *testing.T) {
	if resp := ProjectFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestProjectSliceFromDomain_Empty(t *testing.T) {
	result := ProjectSliceFromDomain([]domain.Project{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}

func TestEnvironmentFromDomain_StripsProjectID(t *testing.T) {
	e := &domain.Environment{
		ID:        "env-1",
		ProjectID: "proj-secret",
		Name:      "Production",
		Slug:      "production",
		Color:     "#FF0000",
	}

	resp := EnvironmentFromDomain(e)
	b, _ := json.Marshal(resp)
	s := string(b)

	if strings.Contains(s, "project_id") {
		t.Errorf("response must not contain project_id, got: %s", s)
	}
	if resp.Name != "Production" {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestEnvironmentFromDomain_Nil(t *testing.T) {
	if resp := EnvironmentFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestEnvironmentSliceFromDomain_Empty(t *testing.T) {
	result := EnvironmentSliceFromDomain([]domain.Environment{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}
