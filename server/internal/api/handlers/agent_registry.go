// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// This file implements the Agent Registry API — P0 items #15, #16, #19.
// It provides CRUD for registered AI agents, heartbeat tracking, and
// per-context maturity management.
//
// ─── Endpoints ────────────────────────────────────────────────────────────
//
//   POST   /v1/agents                          — Register a new agent
//   GET    /v1/agents                          — List all agents (query: ?type=janitor)
//   GET    /v1/agents/{agentID}                — Get a single agent
//   PATCH  /v1/agents/{agentID}                — Update agent fields
//   DELETE /v1/agents/{agentID}                — Remove an agent
//   POST   /v1/agents/{agentID}/heartbeat      — Update agent heartbeat
//   GET    /v1/agents/{agentID}/maturity       — List per-context maturity
//
// ─── Curl Examples ─────────────────────────────────────────────────────────
//
// Register an agent:
//   curl -X POST http://localhost:8080/v1/agents \
//     -H "Authorization: Bearer $TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"id":"janitor-01","name":"Flag Janitor","type":"janitor","brain_type":"llm"}'
//
// List agents by type:
//   curl http://localhost:8080/v1/agents?type=janitor \
//     -H "Authorization: Bearer $TOKEN"
//
// Update heartbeat:
//   curl -X POST http://localhost:8080/v1/agents/janitor-01/heartbeat \
//     -H "Authorization: Bearer $TOKEN"

package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/observability"
)

// agentRegistryStore is the narrowest interface the agent registry handler needs.
type agentRegistryStore interface {
	domain.AgentStore
	domain.AgentMaturityStore
}

// AgentRegistryHandler manages the agent registry CRUD and maturity tracking.
type AgentRegistryHandler struct {
	store agentRegistryStore
	instr *observability.Instruments
	logger *slog.Logger
}

// NewAgentRegistryHandler creates a new AgentRegistryHandler.
func NewAgentRegistryHandler(store agentRegistryStore, logger *slog.Logger, instr *observability.Instruments) *AgentRegistryHandler {
	return &AgentRegistryHandler{store: store, logger: logger, instr: instr}
}

// ─── Request / Response types ──────────────────────────────────────────────

// CreateAgentRequest is the payload for registering a new agent.
type CreateAgentRequest struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Version     string                 `json:"version,omitempty"`
	BrainType   string                 `json:"brain_type,omitempty"`
	Scopes      []string               `json:"scopes,omitempty"`
	RateLimits  domain.AgentRateLimits `json:"rate_limits,omitempty"`
	CostProfile domain.AgentCostProfile `json:"cost_profile,omitempty"`
}

// UpdateAgentRequest is the payload for updating an existing agent.
type UpdateAgentRequest struct {
	Name        *string                 `json:"name,omitempty"`
	Type        *string                 `json:"type,omitempty"`
	Version     *string                 `json:"version,omitempty"`
	BrainType   *string                 `json:"brain_type,omitempty"`
	Status      *string                 `json:"status,omitempty"`
	Scopes      *[]string               `json:"scopes,omitempty"`
	RateLimits  *domain.AgentRateLimits `json:"rate_limits,omitempty"`
	CostProfile *domain.AgentCostProfile `json:"cost_profile,omitempty"`
}

// ListAgentsResponse is the paginated list response for agents.
type ListAgentsResponse struct {
	Data  []domain.Agent `json:"data"`
	Total int            `json:"total"`
}

// AgentHeartbeatResponse is returned after a successful heartbeat.
type AgentHeartbeatResponse struct {
	AgentID       string    `json:"agent_id"`
	LastHeartbeat time.Time `json:"last_heartbeat"`
}

// ─── Handlers ──────────────────────────────────────────────────────────────

// Create handles POST /v1/agents — register a new agent.
func (h *AgentRegistryHandler) Create(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_create")
	orgID := middleware.GetOrgID(r.Context())

	var req CreateAgentRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	agent := buildAgentFromRequest(&req, orgID)
	if err := agent.Validate(); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.store.CreateAgent(r.Context(), agent); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "Creation blocked — an agent with this ID already exists. Use a unique ID or update the existing agent.")
			return
		}
		logger.Error("failed to create agent", "error", err, "agent_id", req.ID)
		httputil.Error(w, http.StatusInternalServerError, "Agent creation failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("agent created", "agent_id", agent.ID, "agent_type", agent.Type)
	if h.instr != nil {
		h.instr.RecordAgentRegistryCreated(r.Context(), agent.Type)
	}
	httputil.JSON(w, http.StatusCreated, agent)
}

// buildAgentFromRequest constructs a domain.Agent from a request, applying defaults.
func buildAgentFromRequest(req *CreateAgentRequest, orgID string) *domain.Agent {
	agent := &domain.Agent{
		ID:          req.ID,
		OrgID:       orgID,
		Name:        req.Name,
		Type:        req.Type,
		Version:     req.Version,
		BrainType:   domain.BrainType(req.BrainType),
		Scopes:      req.Scopes,
		RateLimits:  req.RateLimits,
		CostProfile: req.CostProfile,
	}
	agent.GenerateID()
	if agent.BrainType == "" {
		agent.BrainType = domain.BrainTypeLLM
	}
	if agent.Version == "" {
		agent.Version = "1.0.0"
	}
	if agent.Status == "" {
		agent.Status = domain.AgentStatusActive
	}
	if agent.Scopes == nil {
		agent.Scopes = []string{}
	}
	return agent
}

// List handles GET /v1/agents — list all agents for the org.
func (h *AgentRegistryHandler) List(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_list")
	orgID := middleware.GetOrgID(r.Context())
	p := dto.ParsePagination(r)

	agentType := r.URL.Query().Get("type")

	var agents []domain.Agent
	var total int
	var err error

	if agentType != "" {
		agents, err = h.store.ListAgentsByType(r.Context(), orgID, agentType, p.Limit, p.Offset)
		total, _ = h.store.CountAgentsByType(r.Context(), orgID, agentType)
	} else {
		agents, err = h.store.ListAgents(r.Context(), orgID, p.Limit, p.Offset)
		total, _ = h.store.CountAgents(r.Context(), orgID)
	}

	if err != nil {
		logger.Error("failed to list agents", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Agent listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(agents, total, p.Limit, p.Offset))
}

// Get handles GET /v1/agents/{agentID} — get a single agent.
func (h *AgentRegistryHandler) Get(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_get")
	orgID := middleware.GetOrgID(r.Context())
	agentID := chi.URLParam(r, "agentID")

	agent, err := h.store.GetAgent(r.Context(), orgID, agentID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Agent lookup failed — no agent matches the provided ID. Verify the agent ID is correct.")
			return
		}
		logger.Error("failed to get agent", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Agent retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, agent)
}

// Update handles PATCH /v1/agents/{agentID} — update an agent's fields.
func (h *AgentRegistryHandler) Update(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_update")
	orgID := middleware.GetOrgID(r.Context())
	agentID := chi.URLParam(r, "agentID")

	var req UpdateAgentRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	agent, err := h.store.GetAgent(r.Context(), orgID, agentID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Agent lookup failed — no agent matches the provided ID. Verify the agent ID is correct.")
			return
		}
		logger.Error("failed to get agent for update", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Agent update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	agent.MergeUpdate(&domain.AgentUpdate{
		Name:        req.Name,
		Type:        req.Type,
		Version:     req.Version,
		BrainType:   req.BrainType,
		Status:      req.Status,
		Scopes:      req.Scopes,
		RateLimits:  req.RateLimits,
		CostProfile: req.CostProfile,
	})

	if err := h.store.UpdateAgent(r.Context(), agent); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Agent lookup failed — no agent matches the provided ID. Verify the agent ID is correct.")
			return
		}
		logger.Error("failed to update agent", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Agent update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("agent updated", "agent_id", agentID)
	httputil.JSON(w, http.StatusOK, agent)
}

// Delete handles DELETE /v1/agents/{agentID} — remove an agent.
func (h *AgentRegistryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_delete")
	orgID := middleware.GetOrgID(r.Context())
	agentID := chi.URLParam(r, "agentID")

	if err := h.store.DeleteAgent(r.Context(), orgID, agentID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Agent lookup failed — no agent matches the provided ID. Verify the agent ID is correct.")
			return
		}
		logger.Error("failed to delete agent", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Agent removal failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("agent deleted", "agent_id", agentID)
	w.WriteHeader(http.StatusNoContent)
}

// UpdateHeartbeat handles POST /v1/agents/{agentID}/heartbeat.
func (h *AgentRegistryHandler) UpdateHeartbeat(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_heartbeat")
	orgID := middleware.GetOrgID(r.Context())
	agentID := chi.URLParam(r, "agentID")

	// Verify the agent exists and belongs to this org.
	if _, err := h.store.GetAgent(r.Context(), orgID, agentID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Agent lookup failed — no agent matches the provided ID. Verify the agent ID is correct.")
			return
		}
		logger.Error("failed to verify agent for heartbeat", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Heartbeat update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	if err := h.store.UpdateAgentHeartbeat(r.Context(), agentID); err != nil {
		logger.Error("failed to update heartbeat", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Heartbeat update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("agent heartbeat updated", "agent_id", agentID)
	httputil.JSON(w, http.StatusOK, AgentHeartbeatResponse{
		AgentID:       agentID,
		LastHeartbeat: time.Now().UTC(),
	})
}

// ListMaturities handles GET /v1/agents/{agentID}/maturity.
func (h *AgentRegistryHandler) ListMaturities(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "agent_registry_maturities")
	orgID := middleware.GetOrgID(r.Context())
	agentID := chi.URLParam(r, "agentID")
	p := dto.ParsePagination(r)

	// Verify the agent exists and belongs to this org.
	if _, err := h.store.GetAgent(r.Context(), orgID, agentID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Agent lookup failed — no agent matches the provided ID. Verify the agent ID is correct.")
			return
		}
		logger.Error("failed to verify agent for maturity list", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Maturity listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	maturities, err := h.store.ListMaturities(r.Context(), agentID, p.Limit, p.Offset)
	if err != nil {
		logger.Error("failed to list maturities", "error", err, "agent_id", agentID)
		httputil.Error(w, http.StatusInternalServerError, "Maturity listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	total, _ := h.store.CountMaturities(r.Context(), agentID)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(maturities, total, p.Limit, p.Offset))
}

// Ensure AgentRegistryHandler implements HasRoutes for testability.
var _ interface{ Create(http.ResponseWriter, *http.Request) } = (*AgentRegistryHandler)(nil)

// Ensure mockAgentRegistryStore satisfies agentRegistryStore at compile time.
var _ agentRegistryStore = (*mockAgentRegistryStore)(nil)

// ─── Mock store for unit tests ─────────────────────────────────────────────

type mockAgentRegistryStore struct {
	agents     map[string]*domain.Agent
	maturities map[string]*domain.AgentMaturity // key: agentID + ":" + contextKey
}

func newMockAgentRegistryStore() *mockAgentRegistryStore {
	return &mockAgentRegistryStore{
		agents:     make(map[string]*domain.Agent),
		maturities: make(map[string]*domain.AgentMaturity),
	}
}

func (m *mockAgentRegistryStore) CreateAgent(_ context.Context, agent *domain.Agent) error {
	if _, exists := m.agents[agent.ID]; exists {
		return domain.WrapConflict("agent")
	}
	now := time.Now().UTC()
	if agent.RegisteredAt.IsZero() {
		agent.RegisteredAt = now
	}
	agent.CreatedAt = now
	agent.UpdatedAt = now
	clone := *agent
	m.agents[agent.ID] = &clone
	return nil
}

func (m *mockAgentRegistryStore) GetAgent(_ context.Context, orgID, agentID string) (*domain.Agent, error) {
	a, ok := m.agents[agentID]
	if !ok || a.OrgID != orgID {
		return nil, domain.WrapNotFound("agent")
	}
	clone := *a
	return &clone, nil
}

func (m *mockAgentRegistryStore) ListAgents(_ context.Context, orgID string, limit, offset int) ([]domain.Agent, error) {
	var result []domain.Agent
	for _, a := range m.agents {
		if a.OrgID == orgID {
			result = append(result, *a)
		}
	}
	if result == nil {
		result = []domain.Agent{}
	}
	return paginateSlice(result, limit, offset), nil
}

func (m *mockAgentRegistryStore) ListAgentsByType(_ context.Context, orgID, agentType string, limit, offset int) ([]domain.Agent, error) {
	var result []domain.Agent
	for _, a := range m.agents {
		if a.OrgID == orgID && a.Type == agentType {
			result = append(result, *a)
		}
	}
	if result == nil {
		result = []domain.Agent{}
	}
	return paginateSlice(result, limit, offset), nil
}

func (m *mockAgentRegistryStore) CountAgents(_ context.Context, orgID string) (int, error) {
	count := 0
	for _, a := range m.agents {
		if a.OrgID == orgID {
			count++
		}
	}
	return count, nil
}

func (m *mockAgentRegistryStore) CountAgentsByType(_ context.Context, orgID, agentType string) (int, error) {
	count := 0
	for _, a := range m.agents {
		if a.OrgID == orgID && a.Type == agentType {
			count++
		}
	}
	return count, nil
}

func (m *mockAgentRegistryStore) UpdateAgent(_ context.Context, agent *domain.Agent) error {
	existing, ok := m.agents[agent.ID]
	if !ok || existing.OrgID != agent.OrgID {
		return domain.WrapNotFound("agent")
	}
	agent.UpdatedAt = time.Now().UTC()
	clone := *agent
	m.agents[agent.ID] = &clone
	return nil
}

func (m *mockAgentRegistryStore) UpdateAgentHeartbeat(_ context.Context, agentID string) error {
	a, ok := m.agents[agentID]
	if !ok {
		return domain.WrapNotFound("agent")
	}
	a.LastHeartbeat = time.Now().UTC()
	a.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *mockAgentRegistryStore) DeleteAgent(_ context.Context, orgID, agentID string) error {
	a, ok := m.agents[agentID]
	if !ok || a.OrgID != orgID {
		return domain.WrapNotFound("agent")
	}
	delete(m.agents, agentID)
	return nil
}

func (m *mockAgentRegistryStore) UpsertMaturity(_ context.Context, agentID string, mat *domain.AgentMaturity) error {
	contextKey := ""
	for k := range mat.PerContext {
		contextKey = k
		break
	}
	key := agentID + ":" + contextKey
	clone := *mat
	m.maturities[key] = &clone
	return nil
}

func (m *mockAgentRegistryStore) GetMaturity(_ context.Context, agentID, contextKey string) (*domain.AgentMaturity, error) {
	key := agentID + ":" + contextKey
	mat, ok := m.maturities[key]
	if !ok {
		return nil, domain.WrapNotFound("agent maturity")
	}
	clone := *mat
	return &clone, nil
}

func (m *mockAgentRegistryStore) ListMaturities(_ context.Context, agentID string, limit, offset int) ([]domain.AgentMaturity, error) {
	prefix := agentID + ":"
	var result []domain.AgentMaturity
	for k, v := range m.maturities {
		if len(k) > len(prefix) && k[:len(prefix)] == prefix {
			result = append(result, *v)
		}
	}
	if result == nil {
		result = []domain.AgentMaturity{}
	}
	return paginateSlice(result, limit, offset), nil
}

func (m *mockAgentRegistryStore) CountMaturities(_ context.Context, agentID string) (int, error) {
	prefix := agentID + ":"
	count := 0
	for k := range m.maturities {
		if len(k) > len(prefix) && k[:len(prefix)] == prefix {
			count++
		}
	}
	return count, nil
}

// paginateSlice is a helper for mock stores that applies limit/offset in memory.
func paginateSlice[T any](s []T, limit, offset int) []T {
	if offset >= len(s) {
		return []T{}
	}
	end := offset + limit
	if end > len(s) {
		end = len(s)
	}
	return s[offset:end]
}
