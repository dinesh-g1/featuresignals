package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// l returns a request-scoped logger for the flag handler.
func (h *FlagHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "flags")
}

type FlagHandler struct {
	store domain.Store
}

func NewFlagHandler(store domain.Store) *FlagHandler {
	return &FlagHandler{store: store}
}

type CreateFlagRequest struct {
	Key          string          `json:"key"`
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	FlagType     string          `json:"flag_type"`
	DefaultValue json.RawMessage `json:"default_value"`
	Tags         []string        `json:"tags"`
}

func (h *FlagHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")

	var req CreateFlagRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Key == "" || req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "key and name are required")
		return
	}

	flagType := domain.FlagType(req.FlagType)
	if flagType == "" {
		flagType = domain.FlagTypeBoolean
	}
	defaultVal := req.DefaultValue
	if defaultVal == nil {
		defaultVal = json.RawMessage(`false`)
	}

	flag := &domain.Flag{
		ProjectID:    projectID,
		Key:          req.Key,
		Name:         req.Name,
		Description:  req.Description,
		FlagType:     flagType,
		DefaultValue: defaultVal,
		Tags:         req.Tags,
	}

	if err := h.store.CreateFlag(r.Context(), flag); err != nil {
		h.l(r).Warn("flag create conflict", "project_id", projectID, "key", req.Key)
		httputil.Error(w, http.StatusConflict, "flag key already exists in this project")
		return
	}

	h.l(r).Info("flag created", "flag_id", flag.ID, "project_id", projectID, "key", req.Key)

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(flag)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.created",
		ResourceType: "flag",
		ResourceID:   &flag.ID,
		AfterState:   afterState,
	})

	httputil.JSON(w, http.StatusCreated, flag)
}

func (h *FlagHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")

	flags, err := h.store.ListFlags(r.Context(), projectID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list flags")
		return
	}
	if flags == nil {
		flags = []domain.Flag{}
	}

	httputil.JSON(w, http.StatusOK, flags)
}

func (h *FlagHandler) Get(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	httputil.JSON(w, http.StatusOK, flag)
}

func (h *FlagHandler) Update(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	var req CreateFlagRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	beforeState, _ := json.Marshal(flag)

	if req.Name != "" {
		flag.Name = req.Name
	}
	if req.Description != "" {
		flag.Description = req.Description
	}
	if req.DefaultValue != nil {
		flag.DefaultValue = req.DefaultValue
	}
	if req.Tags != nil {
		flag.Tags = req.Tags
	}

	if err := h.store.UpdateFlag(r.Context(), flag); err != nil {
		h.l(r).Error("flag update failed", "error", err, "flag_id", flag.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to update flag")
		return
	}

	h.l(r).Info("flag updated", "flag_id", flag.ID, "project_id", projectID, "key", flagKey)

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(flag)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.updated",
		ResourceType: "flag",
		ResourceID:   &flag.ID,
		BeforeState:  beforeState,
		AfterState:   afterState,
	})

	httputil.JSON(w, http.StatusOK, flag)
}

func (h *FlagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	if err := h.store.DeleteFlag(r.Context(), flag.ID); err != nil {
		h.l(r).Error("flag delete failed", "error", err, "flag_id", flag.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to delete flag")
		return
	}

	h.l(r).Info("flag deleted", "flag_id", flag.ID, "project_id", projectID, "key", flagKey)

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	beforeState, _ := json.Marshal(flag)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.deleted",
		ResourceType: "flag",
		ResourceID:   &flag.ID,
		BeforeState:  beforeState,
	})

	w.WriteHeader(http.StatusNoContent)
}

// --- Flag State ---

type UpdateFlagStateRequest struct {
	Enabled            *bool                  `json:"enabled"`
	DefaultValue       json.RawMessage        `json:"default_value,omitempty"`
	Rules              []domain.TargetingRule  `json:"rules,omitempty"`
	PercentageRollout  *int                   `json:"percentage_rollout,omitempty"`
	ScheduledEnableAt  *string                `json:"scheduled_enable_at,omitempty"`
	ScheduledDisableAt *string                `json:"scheduled_disable_at,omitempty"`
}

func (h *FlagHandler) UpdateState(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")
	envID := chi.URLParam(r, "envID")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	var req UpdateFlagStateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	state := &domain.FlagState{
		FlagID: flag.ID,
		EnvID:  envID,
	}

	// Try to get existing state
	existing, err := h.store.GetFlagState(r.Context(), flag.ID, envID)
	if err == nil {
		state = existing
	}

	if req.Enabled != nil {
		state.Enabled = *req.Enabled
	}
	if req.DefaultValue != nil {
		state.DefaultValue = req.DefaultValue
	}
	if req.Rules != nil {
		state.Rules = req.Rules
	}
	if req.PercentageRollout != nil {
		state.PercentageRollout = *req.PercentageRollout
	}
	if req.ScheduledEnableAt != nil {
		if *req.ScheduledEnableAt == "" {
			state.ScheduledEnableAt = nil
		} else {
			t, err := time.Parse(time.RFC3339, *req.ScheduledEnableAt)
			if err != nil {
				httputil.Error(w, http.StatusBadRequest, "invalid scheduled_enable_at format (use RFC3339)")
				return
			}
			state.ScheduledEnableAt = &t
		}
	}
	if req.ScheduledDisableAt != nil {
		if *req.ScheduledDisableAt == "" {
			state.ScheduledDisableAt = nil
		} else {
			t, err := time.Parse(time.RFC3339, *req.ScheduledDisableAt)
			if err != nil {
				httputil.Error(w, http.StatusBadRequest, "invalid scheduled_disable_at format (use RFC3339)")
				return
			}
			state.ScheduledDisableAt = &t
		}
	}

	if err := h.store.UpsertFlagState(r.Context(), state); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to update flag state")
		return
	}

	httputil.JSON(w, http.StatusOK, state)
}

type PromoteRequest struct {
	SourceEnvID string `json:"source_env_id"`
	TargetEnvID string `json:"target_env_id"`
}

// Promote copies flag state from one environment to another.
func (h *FlagHandler) Promote(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	var req PromoteRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SourceEnvID == "" || req.TargetEnvID == "" {
		httputil.Error(w, http.StatusBadRequest, "source_env_id and target_env_id are required")
		return
	}
	if req.SourceEnvID == req.TargetEnvID {
		httputil.Error(w, http.StatusBadRequest, "source and target environments must differ")
		return
	}

	source, err := h.store.GetFlagState(r.Context(), flag.ID, req.SourceEnvID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "source flag state not found")
		return
	}

	var beforeState json.RawMessage
	existing, _ := h.store.GetFlagState(r.Context(), flag.ID, req.TargetEnvID)
	if existing != nil {
		beforeState, _ = json.Marshal(existing)
	}

	target := &domain.FlagState{
		FlagID:            flag.ID,
		EnvID:             req.TargetEnvID,
		Enabled:           source.Enabled,
		DefaultValue:      source.DefaultValue,
		Rules:             source.Rules,
		PercentageRollout: source.PercentageRollout,
	}
	if existing != nil {
		target.ID = existing.ID
	}

	if err := h.store.UpsertFlagState(r.Context(), target); err != nil {
		h.l(r).Error("promote failed", "error", err, "flag_id", flag.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to promote flag state")
		return
	}

	h.l(r).Info("flag promoted", "flag_id", flag.ID, "source_env", req.SourceEnvID, "target_env", req.TargetEnvID)

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(target)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.promoted",
		ResourceType: "flag",
		ResourceID:   &flag.ID,
		BeforeState:  beforeState,
		AfterState:   afterState,
	})

	httputil.JSON(w, http.StatusOK, target)
}

func (h *FlagHandler) GetState(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")
	envID := chi.URLParam(r, "envID")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	state, err := h.store.GetFlagState(r.Context(), flag.ID, envID)
	if err != nil {
		httputil.JSON(w, http.StatusOK, &domain.FlagState{
			FlagID:  flag.ID,
			EnvID:   envID,
			Enabled: false,
		})
		return
	}

	httputil.JSON(w, http.StatusOK, state)
}
