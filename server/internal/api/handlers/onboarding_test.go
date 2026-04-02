package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
)

func newTestOnboardingHandler() (*OnboardingHandler, *mockStore) {
	store := newMockStore()
	logger := slog.Default()
	return NewOnboardingHandler(store, logger), store
}

func onboardingRequest(method, path, body, orgID string) *http.Request {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.OrgIDKey, orgID)
	return r.WithContext(ctx)
}

func TestOnboardingHandler_GetState_NoExisting(t *testing.T) {
	h, _ := newTestOnboardingHandler()

	r := onboardingRequest("GET", "/v1/onboarding", "", "org-1")
	w := httptest.NewRecorder()
	h.GetState(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var state domain.OnboardingState
	json.Unmarshal(w.Body.Bytes(), &state)

	if state.OrgID != "org-1" {
		t.Errorf("expected org_id=org-1, got %s", state.OrgID)
	}
	if state.PlanSelected {
		t.Error("expected plan_selected=false for default state")
	}
	if state.Completed {
		t.Error("expected completed=false for default state")
	}
}

func TestOnboardingHandler_UpdateState(t *testing.T) {
	h, store := newTestOnboardingHandler()

	body := `{"plan_selected": true, "first_flag_created": true}`
	r := onboardingRequest("PATCH", "/v1/onboarding", body, "org-1")
	w := httptest.NewRecorder()
	h.UpdateState(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var state domain.OnboardingState
	json.Unmarshal(w.Body.Bytes(), &state)

	if !state.PlanSelected {
		t.Error("expected plan_selected=true")
	}
	if !state.FirstFlagCreated {
		t.Error("expected first_flag_created=true")
	}
	if state.FirstSDKConnected {
		t.Error("expected first_sdk_connected=false (not set)")
	}

	stored, err := store.GetOnboardingState(context.Background(), "org-1")
	if err != nil {
		t.Fatalf("state not stored: %v", err)
	}
	if !stored.PlanSelected {
		t.Error("stored state should have plan_selected=true")
	}
}

func TestOnboardingHandler_UpdateState_Completion(t *testing.T) {
	h, _ := newTestOnboardingHandler()

	body := `{"plan_selected": true, "first_flag_created": true, "first_sdk_connected": true, "first_evaluation": true}`
	r := onboardingRequest("PATCH", "/v1/onboarding", body, "org-2")
	w := httptest.NewRecorder()
	h.UpdateState(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var state domain.OnboardingState
	json.Unmarshal(w.Body.Bytes(), &state)

	if !state.Completed {
		t.Error("expected completed=true when all steps done")
	}
	if state.CompletedAt == nil {
		t.Error("expected completed_at to be set")
	}
}

func TestOnboardingHandler_UpdateState_PartialDoesNotComplete(t *testing.T) {
	h, _ := newTestOnboardingHandler()

	body := `{"plan_selected": true}`
	r := onboardingRequest("PATCH", "/v1/onboarding", body, "org-3")
	w := httptest.NewRecorder()
	h.UpdateState(w, r)

	var state domain.OnboardingState
	json.Unmarshal(w.Body.Bytes(), &state)

	if state.Completed {
		t.Error("should not be completed with only plan_selected")
	}
}

func TestOnboardingHandler_GetState_AfterUpdate(t *testing.T) {
	h, _ := newTestOnboardingHandler()

	body := `{"first_flag_created": true}`
	r1 := onboardingRequest("PATCH", "/v1/onboarding", body, "org-4")
	w1 := httptest.NewRecorder()
	h.UpdateState(w1, r1)

	r2 := onboardingRequest("GET", "/v1/onboarding", "", "org-4")
	w2 := httptest.NewRecorder()
	h.GetState(w2, r2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w2.Code)
	}

	var state domain.OnboardingState
	json.Unmarshal(w2.Body.Bytes(), &state)

	if !state.FirstFlagCreated {
		t.Error("expected first_flag_created=true from stored state")
	}
}

func TestOnboardingHandler_UpdateState_InvalidJSON(t *testing.T) {
	h, _ := newTestOnboardingHandler()

	r := onboardingRequest("PATCH", "/v1/onboarding", "{invalid", "org-5")
	w := httptest.NewRecorder()
	h.UpdateState(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestOnboardingHandler_UpdateState_IncrementalUpdates(t *testing.T) {
	h, _ := newTestOnboardingHandler()

	r1 := onboardingRequest("PATCH", "/v1/onboarding", `{"plan_selected": true}`, "org-6")
	w1 := httptest.NewRecorder()
	h.UpdateState(w1, r1)

	r2 := onboardingRequest("PATCH", "/v1/onboarding", `{"first_flag_created": true}`, "org-6")
	w2 := httptest.NewRecorder()
	h.UpdateState(w2, r2)

	var state domain.OnboardingState
	json.Unmarshal(w2.Body.Bytes(), &state)

	if !state.PlanSelected {
		t.Error("plan_selected should still be true after second update")
	}
	if !state.FirstFlagCreated {
		t.Error("first_flag_created should be true after second update")
	}
}
