package middleware

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

type mockOrgReader struct {
	org *domain.Organization
	err error
}

func (m *mockOrgReader) GetOrganization(_ context.Context, _ string) (*domain.Organization, error) {
	return m.org, m.err
}

func (m *mockOrgReader) GetOrganizationByIDPrefix(_ context.Context, _ string) (*domain.Organization, error) {
	return m.org, m.err
}

var passthrough = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
})

func TestFeatureGate(t *testing.T) {
	tests := []struct {
		name       string
		feature    domain.Feature
		plan       string
		orgErr     error
		wantStatus int
	}{
		{name: "pro feature allowed on pro plan", feature: domain.FeatureWebhooks, plan: domain.PlanPro, wantStatus: http.StatusOK},
		{name: "pro feature allowed on enterprise plan", feature: domain.FeatureWebhooks, plan: domain.PlanEnterprise, wantStatus: http.StatusOK},
		{name: "pro feature allowed on trial plan", feature: domain.FeatureWebhooks, plan: domain.PlanTrial, wantStatus: http.StatusOK},
		{name: "pro feature blocked on free plan", feature: domain.FeatureWebhooks, plan: domain.PlanFree, wantStatus: http.StatusPaymentRequired},
		{name: "enterprise feature blocked on pro plan", feature: domain.FeatureSSO, plan: domain.PlanPro, wantStatus: http.StatusPaymentRequired},
		{name: "enterprise feature blocked on free plan", feature: domain.FeatureSSO, plan: domain.PlanFree, wantStatus: http.StatusPaymentRequired},
		{name: "enterprise feature allowed on enterprise plan", feature: domain.FeatureSSO, plan: domain.PlanEnterprise, wantStatus: http.StatusOK},
		{name: "org read error passes through", feature: domain.FeatureWebhooks, plan: "", orgErr: fmt.Errorf("db down"), wantStatus: http.StatusOK},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			reader := &mockOrgReader{
				org: &domain.Organization{ID: "org-1", Plan: tc.plan},
				err: tc.orgErr,
			}

			handler := FeatureGate(tc.feature, reader)(passthrough)
			req := httptest.NewRequest("GET", "/", nil)
			req = req.WithContext(withOrgID(req.Context(), "org-1"))
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)
			if rr.Code != tc.wantStatus {
				t.Errorf("got status %d, want %d", rr.Code, tc.wantStatus)
			}
		})
	}
}

func TestFeatureGate_NoOrgIDPassesThrough(t *testing.T) {
	reader := &mockOrgReader{org: &domain.Organization{Plan: domain.PlanFree}}
	handler := FeatureGate(domain.FeatureWebhooks, reader)(passthrough)

	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("no org_id should pass through, got %d", rr.Code)
	}
}
