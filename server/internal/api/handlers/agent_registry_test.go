package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func newTestAgentRegistryHandler(store *mockAgentRegistryStore) *AgentRegistryHandler {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	return NewAgentRegistryHandler(store, logger, nil)
}

// setupTestAgent creates an agent in the mock store and returns it.
func setupTestAgent(store *mockAgentRegistryStore, orgID, agentID, agentType string) *domain.Agent {
	agent := &domain.Agent{
		ID:        agentID,
		OrgID:     orgID,
		Name:      "Test Agent",
		Type:      agentType,
		Version:   "1.0.0",
		BrainType: domain.BrainTypeLLM,
		Status:    domain.AgentStatusActive,
		Scopes:    []string{"flag:read"},
	}
	_ = store.CreateAgent(nil, agent)
	return agent
}

func TestAgentRegistryHandler_Create(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantErr    string
	}{
		{
			name:       "valid agent",
			body:       `{"id":"agent-1","name":"Flag Janitor","type":"janitor"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "duplicate agent",
			body:       `{"id":"agent-1","name":"Flag Janitor v2","type":"janitor"}`,
			wantStatus: http.StatusConflict,
			wantErr:    "already exists",
		},
		{
			name:       "missing id",
			body:       `{"name":"No ID","type":"janitor"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing name",
			body:       `{"id":"agent-3","type":"janitor"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing type",
			body:       `{"id":"agent-4","name":"No Type"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid JSON",
			body:       `{broken`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "with all optional fields",
			body:       `{"id":"agent-full","name":"Full Agent","type":"preflight","version":"2.0.0","brain_type":"hybrid","scopes":["flag:write"],"rate_limits":{"per_minute":10},"cost_profile":{"llm_tokens_per_action":500}}`,
			wantStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newMockAgentRegistryStore()
			h := newTestAgentRegistryHandler(store)

			// For the duplicate test, create the agent first.
			if tt.name == "duplicate agent" {
				setupTestAgent(store, testOrgID, "agent-1", "janitor")
			}

			r := httptest.NewRequest("POST", "/v1/agents", strings.NewReader(tt.body))
			r = requestWithAuth(r, "user-1", testOrgID, "admin")
			w := httptest.NewRecorder()

			h.Create(w, r)

			if w.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}

			if tt.wantErr != "" {
				var resp map[string]string
				json.Unmarshal(w.Body.Bytes(), &resp)
				if !strings.Contains(resp["error"], tt.wantErr) {
					t.Errorf("expected error containing %q, got %q", tt.wantErr, resp["error"])
				}
			}

			if tt.wantStatus == http.StatusCreated && tt.name == "valid agent" {
				var agent domain.Agent
				json.Unmarshal(w.Body.Bytes(), &agent)
				if agent.ID != "agent-1" {
					t.Errorf("expected ID 'agent-1', got %q", agent.ID)
				}
				if agent.OrgID != testOrgID {
					t.Errorf("expected OrgID %q, got %q", testOrgID, agent.OrgID)
				}
				if agent.Status != domain.AgentStatusActive {
					t.Errorf("expected status active, got %q", agent.Status)
				}
			}
		})
	}
}

func TestAgentRegistryHandler_Get(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)
	setupTestAgent(store, testOrgID, "agent-1", "janitor")

	t.Run("existing agent", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents/agent-1", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.Get(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var agent domain.Agent
		json.Unmarshal(w.Body.Bytes(), &agent)
		if agent.ID != "agent-1" {
			t.Errorf("expected ID 'agent-1', got %q", agent.ID)
		}
	})

	t.Run("non-existent agent", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents/agent-404", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-404"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.Get(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
		}
	})

	t.Run("cross-org access returns 404", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents/agent-1", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-2", "org-2", "admin")
		w := httptest.NewRecorder()

		h.Get(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for cross-org access, got %d", w.Code)
		}
	})
}

func TestAgentRegistryHandler_List(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)

	setupTestAgent(store, testOrgID, "agent-1", "janitor")
	setupTestAgent(store, testOrgID, "agent-2", "preflight")
	setupTestAgent(store, "org-2", "agent-3", "janitor")

	t.Run("list all agents for org", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents", nil)
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.List(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp ListAgentsResponse
		json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.Total != 2 {
			t.Errorf("expected 2 agents, got %d", resp.Total)
		}
	})

	t.Run("list agents by type", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents?type=janitor", nil)
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.List(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp ListAgentsResponse
		json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.Total != 1 {
			t.Errorf("expected 1 janitor agent, got %d", resp.Total)
		}
	})

	t.Run("empty list", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents", nil)
		r = requestWithAuth(r, "user-3", "org-empty", "admin")
		w := httptest.NewRecorder()

		h.List(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}

		var resp ListAgentsResponse
		json.Unmarshal(w.Body.Bytes(), &resp)
		if resp.Total != 0 {
			t.Errorf("expected 0 agents, got %d", resp.Total)
		}
		if resp.Data == nil {
			t.Error("expected non-nil data array")
		}
	})
}

func TestAgentRegistryHandler_Update(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)
	setupTestAgent(store, testOrgID, "agent-1", "janitor")

	t.Run("update name", func(t *testing.T) {
		body := `{"name":"Updated Name"}`
		r := httptest.NewRequest("PATCH", "/v1/agents/agent-1", strings.NewReader(body))
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.Update(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var agent domain.Agent
		json.Unmarshal(w.Body.Bytes(), &agent)
		if agent.Name != "Updated Name" {
			t.Errorf("expected name 'Updated Name', got %q", agent.Name)
		}
	})

	t.Run("update non-existent", func(t *testing.T) {
		body := `{"name":"Ghost"}`
		r := httptest.NewRequest("PATCH", "/v1/agents/agent-404", strings.NewReader(body))
		r = requestWithChi(r, map[string]string{"agentID": "agent-404"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.Update(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", w.Code)
		}
	})

	t.Run("update cross-org returns 404", func(t *testing.T) {
		body := `{"name":"Hijack"}`
		r := httptest.NewRequest("PATCH", "/v1/agents/agent-1", strings.NewReader(body))
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-2", "org-2", "admin")
		w := httptest.NewRecorder()

		h.Update(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for cross-org update, got %d", w.Code)
		}
	})
}

func TestAgentRegistryHandler_Delete(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)
	setupTestAgent(store, testOrgID, "agent-1", "janitor")

	t.Run("delete existing", func(t *testing.T) {
		r := httptest.NewRequest("DELETE", "/v1/agents/agent-1", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.Delete(w, r)

		if w.Code != http.StatusNoContent {
			t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
		}

		// Verify it's gone.
		_, err := store.GetAgent(nil, testOrgID, "agent-1")
		if err == nil {
			t.Error("expected agent to be deleted")
		}
	})

	t.Run("delete non-existent", func(t *testing.T) {
		r := httptest.NewRequest("DELETE", "/v1/agents/agent-404", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-404"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.Delete(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", w.Code)
		}
	})
}

func TestAgentRegistryHandler_UpdateHeartbeat(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)
	setupTestAgent(store, testOrgID, "agent-1", "janitor")

	t.Run("update heartbeat", func(t *testing.T) {
		r := httptest.NewRequest("POST", "/v1/agents/agent-1/heartbeat", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.UpdateHeartbeat(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		agent, _ := store.GetAgent(nil, testOrgID, "agent-1")
		if agent.LastHeartbeat.IsZero() {
			t.Error("expected non-zero last heartbeat")
		}
	})

	t.Run("heartbeat non-existent", func(t *testing.T) {
		r := httptest.NewRequest("POST", "/v1/agents/agent-404/heartbeat", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-404"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.UpdateHeartbeat(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", w.Code)
		}
	})
}

func TestAgentRegistryHandler_ListMaturities(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)
	setupTestAgent(store, testOrgID, "agent-1", "janitor")

	// Add some maturity entries.
	_ = store.UpsertMaturity(nil, "agent-1", &domain.AgentMaturity{
		ID:           "mat-1",
		CurrentLevel: domain.MaturityL3Supervised,
		PerContext:   map[string]domain.MaturityLevel{"flag.cleanup.staging": domain.MaturityL3Supervised},
	})
	_ = store.UpsertMaturity(nil, "agent-1", &domain.AgentMaturity{
		ID:           "mat-2",
		CurrentLevel: domain.MaturityL2Assist,
		PerContext:   map[string]domain.MaturityLevel{"flag.rollout.production": domain.MaturityL2Assist},
	})

	t.Run("list maturities", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents/agent-1/maturity", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.ListMaturities(w, r)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp map[string]any
		json.Unmarshal(w.Body.Bytes(), &resp)
		data, ok := resp["data"].([]any)
		if !ok {
			t.Fatal("expected data array in response")
		}
		if len(data) != 2 {
			t.Errorf("expected 2 maturity entries, got %d", len(data))
		}
	})

	t.Run("list maturities for non-existent agent", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents/agent-404/maturity", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-404"})
		r = requestWithAuth(r, "user-1", testOrgID, "admin")
		w := httptest.NewRecorder()

		h.ListMaturities(w, r)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", w.Code)
		}
	})
}

// TestAgentRegistryHandler_TenantIsolation verifies that agents are
// properly scoped to their organization.
func TestAgentRegistryHandler_TenantIsolation(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)
	setupTestAgent(store, testOrgID, "agent-1", "janitor")

	t.Run("cannot get another org's agent", func(t *testing.T) {
		r := httptest.NewRequest("GET", "/v1/agents/agent-1", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-2", "org-other", "admin")
		w := httptest.NewRecorder()

		h.Get(w, r)
		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404 for cross-org access, got %d", w.Code)
		}
	})

	t.Run("cannot delete another org's agent", func(t *testing.T) {
		r := httptest.NewRequest("DELETE", "/v1/agents/agent-1", nil)
		r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
		r = requestWithAuth(r, "user-2", "org-other", "admin")
		w := httptest.NewRecorder()

		h.Delete(w, r)
		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404 for cross-org delete, got %d", w.Code)
		}
	})
}

// TestAgentRegistryHandler_NoAuth verifies that endpoints require
// authentication. In practice, this is enforced by middleware, but the
// handler should still gracefully handle missing org context.
func TestAgentRegistryHandler_NoAuth(t *testing.T) {
	store := newMockAgentRegistryStore()
	h := newTestAgentRegistryHandler(store)

	r := httptest.NewRequest("GET", "/v1/agents/agent-1", nil)
	r = requestWithChi(r, map[string]string{"agentID": "agent-1"})
	// No auth context set — GetOrgID returns empty string.
	w := httptest.NewRecorder()

	h.Get(w, r)
	// Should return 404 because orgID="" won't match anything.
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 without auth, got %d", w.Code)
	}
}


