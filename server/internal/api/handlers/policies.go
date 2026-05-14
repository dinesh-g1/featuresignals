// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// PolicyHandler manages governance policies — CEL-based rules that
// constrain agent actions through the 7-step governance pipeline.
// Policies are organization-scoped and evaluated in priority order.
//
// ─── Endpoints ────────────────────────────────────────────────────────────
//
//   POST   /v1/policies                       — Create a governance policy
//   GET    /v1/policies                       — List all policies (ordered by priority)
//   GET    /v1/policies/{policyID}            — Get a single policy
//   PATCH  /v1/policies/{policyID}            — Update a policy
//   DELETE /v1/policies/{policyID}            — Delete a policy
//   POST   /v1/policies/{policyID}/toggle     — Enable/disable a policy
//
// ─── Curl Examples ─────────────────────────────────────────────────────────
//
// Create a policy requiring human approval for production:
//   curl -X POST http://localhost:8080/v1/policies \
//     -H "Authorization: Bearer $TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"name":"Require approval for production","priority":10,"effect":"require_human","scope":{"agent_types":["janitor"],"environments":["production"]},"rules":[{"name":"check-env","expression":"action.context.environment_id != \"production\" || action.decision.requires_human","message":"Production changes require human approval"}]}'
//
// Toggle a policy off:
//   curl -X POST http://localhost:8080/v1/policies/pol_abc123/toggle \
//     -H "Authorization: Bearer $TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"enabled":false}'
package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/observability"
)

// policyStore is the narrow interface PolicyHandler needs from the data layer.
type policyStore interface {
	domain.PolicyReader
	domain.PolicyWriter
}

// PolicyHandler manages governance policy CRUD via REST endpoints.
type PolicyHandler struct {
	store  policyStore
	instr  *observability.Instruments
	logger *slog.Logger
}

// NewPolicyHandler creates a PolicyHandler with the given dependencies.
func NewPolicyHandler(store policyStore, logger *slog.Logger, instr *observability.Instruments) *PolicyHandler {
	return &PolicyHandler{
		store:  store,
		instr:  instr,
		logger: logger.With("handler", "policies"),
	}
}

// l returns a request-scoped logger.
func (h *PolicyHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "policies")
}

// ─── Request / Response types ─────────────────────────────────────────────

type createPolicyRequest struct {
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Priority    int                 `json:"priority"`
	Scope       domain.PolicyScope  `json:"scope"`
	Rules       []domain.PolicyRule `json:"rules"`
	Effect      domain.PolicyEffect `json:"effect"`
}

type updatePolicyRequest struct {
	Name        *string              `json:"name,omitempty"`
	Description *string              `json:"description,omitempty"`
	Priority    *int                 `json:"priority,omitempty"`
	Scope       *domain.PolicyScope  `json:"scope,omitempty"`
	Rules       *[]domain.PolicyRule `json:"rules,omitempty"`
	Effect      *domain.PolicyEffect `json:"effect,omitempty"`
	Enabled     *bool                `json:"enabled,omitempty"`
}

type togglePolicyRequest struct {
	Enabled bool `json:"enabled"`
}

// ─── Handlers ─────────────────────────────────────────────────────────────

// Create handles POST /v1/policies — creates a new governance policy.
func (h *PolicyHandler) Create(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())

	var req createPolicyRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	policy := domain.Policy{
		ID:          "pol_" + uuid.NewString(),
		OrgID:       orgID,
		Name:        req.Name,
		Description: req.Description,
		Priority:    req.Priority,
		Scope:       req.Scope,
		Rules:       req.Rules,
		Effect:      req.Effect,
	}
	policy.SetDefaults()

	if err := policy.Validate(); err != nil {
		httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	if err := h.store.CreatePolicy(r.Context(), &policy); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "Creation blocked — a policy with this identifier already exists. Use a unique identifier or update the existing policy.")
			return
		}
		logger.Error("Policy creation failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	logger.Info("policy created",
		"policy_id", policy.ID,
		"policy_name", policy.Name,
		"org_id", orgID,
	)
	if h.instr != nil {
		h.instr.RecordPolicyCreated(r.Context(), string(policy.Effect))
	}
	httputil.JSON(w, http.StatusCreated, policy)
}

// List handles GET /v1/policies — returns all policies for the org.
func (h *PolicyHandler) List(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	p := dto.ParsePagination(r)

	policies, err := h.store.ListPolicies(r.Context(), orgID, p.Limit, p.Offset)
	if err != nil {
		logger.Error("failed to list policies", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	total, _ := h.store.CountPolicies(r.Context(), orgID)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(policies, total, p.Limit, p.Offset))
}

// Get handles GET /v1/policies/{policyID} — returns a single policy.
func (h *PolicyHandler) Get(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	policyID := chi.URLParam(r, "policyID")

	policy, err := h.store.GetPolicy(r.Context(), orgID, policyID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Policy lookup failed — no policy matches the provided identifier. Verify the policy ID is correct.")
			return
		}
		logger.Error("failed to get policy", "error", err, "policy_id", policyID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	httputil.JSON(w, http.StatusOK, policy)
}

// Update handles PATCH /v1/policies/{policyID} — modifies a policy.
func (h *PolicyHandler) Update(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	policyID := chi.URLParam(r, "policyID")

	existing, err := h.store.GetPolicy(r.Context(), orgID, policyID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Policy lookup failed — no policy matches the provided identifier. Verify the policy ID is correct.")
			return
		}
		logger.Error("failed to get policy for update", "error", err, "policy_id", policyID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	var req updatePolicyRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	existing.MergeUpdate(&domain.PolicyUpdate{
		Name:        req.Name,
		Description: req.Description,
		Priority:    req.Priority,
		Scope:       req.Scope,
		Rules:       req.Rules,
		Effect:      req.Effect,
		Enabled:     req.Enabled,
	})

	if err := h.store.UpdatePolicy(r.Context(), existing); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Policy lookup failed — no policy matches the provided identifier. Verify the policy ID is correct.")
			return
		}
		logger.Error("Policy update failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "policy_id", policyID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	logger.Info("policy updated",
		"policy_id", policyID,
		"policy_name", existing.Name,
	)
	httputil.JSON(w, http.StatusOK, existing)
}

// Delete handles DELETE /v1/policies/{policyID} — removes a policy.
func (h *PolicyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	policyID := chi.URLParam(r, "policyID")

	if err := h.store.DeletePolicy(r.Context(), orgID, policyID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Policy lookup failed — no policy matches the provided identifier. Verify the policy ID is correct.")
			return
		}
		logger.Error("Policy deletion failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "policy_id", policyID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	logger.Info("policy deleted", "policy_id", policyID)
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Toggle handles POST /v1/policies/{policyID}/toggle — enables/disables a policy.
func (h *PolicyHandler) Toggle(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	policyID := chi.URLParam(r, "policyID")

	var req togglePolicyRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if err := h.store.SetPolicyEnabled(r.Context(), orgID, policyID, req.Enabled); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Policy lookup failed — no policy matches the provided identifier. Verify the policy ID is correct.")
			return
		}
		logger.Error("failed to toggle policy", "error", err, "policy_id", policyID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	status := "active"
	if !req.Enabled {
		status = "inactive"
	}
	logger.Info("policy toggled",
		"policy_id", policyID,
		"status", status,
	)
	httputil.JSON(w, http.StatusOK, map[string]any{
		"policy_id": policyID,
		"active":    req.Enabled,
	})
}
