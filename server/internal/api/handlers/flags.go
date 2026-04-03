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
	Key                  string          `json:"key"`
	Name                 string          `json:"name"`
	Description          string          `json:"description"`
	FlagType             string          `json:"flag_type"`
	DefaultValue         json.RawMessage `json:"default_value"`
	Tags                 []string        `json:"tags"`
	Prerequisites        []string        `json:"prerequisites,omitempty"`
	MutualExclusionGroup string          `json:"mutual_exclusion_group,omitempty"`
}

func (h *FlagHandler) Create(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	if !validateFlagKey(req.Key) {
		httputil.Error(w, http.StatusBadRequest, "key must match pattern: lowercase alphanumeric, hyphens, underscores (max 128 chars)")
		return
	}
	if !validateStringLength(req.Name, 255) {
		httputil.Error(w, http.StatusBadRequest, "name must be at most 255 characters")
		return
	}
	if !validateStringLength(req.Description, 2000) {
		httputil.Error(w, http.StatusBadRequest, "description must be at most 2000 characters")
		return
	}

	flagType := domain.FlagType(req.FlagType)
	if flagType == "" {
		flagType = domain.FlagTypeBoolean
	}
	if req.FlagType != "" && !validateFlagType(req.FlagType) {
		httputil.Error(w, http.StatusBadRequest, "invalid flag_type; must be boolean, string, number, json, or ab")
		return
	}
	defaultVal := req.DefaultValue
	if defaultVal == nil {
		defaultVal = json.RawMessage(`false`)
	}

	flag := &domain.Flag{
		ProjectID:            projectID,
		Key:                  req.Key,
		Name:                 req.Name,
		Description:          req.Description,
		FlagType:             flagType,
		DefaultValue:         defaultVal,
		Tags:                 req.Tags,
		Prerequisites:        req.Prerequisites,
		MutualExclusionGroup: req.MutualExclusionGroup,
	}

	if err := h.store.CreateFlag(r.Context(), flag); err != nil {
		h.l(r).Warn("flag create failed", "project_id", projectID, "key", req.Key, "err", err)
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
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	if req.Prerequisites != nil {
		flag.Prerequisites = req.Prerequisites
	}
	if req.MutualExclusionGroup != "" || req.MutualExclusionGroup == "" {
		flag.MutualExclusionGroup = req.MutualExclusionGroup
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
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	Variants           []domain.Variant       `json:"variants,omitempty"`
	ScheduledEnableAt  *string                `json:"scheduled_enable_at,omitempty"`
	ScheduledDisableAt *string                `json:"scheduled_disable_at,omitempty"`
}

func (h *FlagHandler) UpdateState(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	if req.Variants != nil {
		state.Variants = req.Variants
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
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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

// Kill instantly disables a flag in the specified environment. This bypasses
// any approval workflow and is intended for emergency use.
func (h *FlagHandler) Kill(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	var req struct {
		EnvID string `json:"env_id"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil || req.EnvID == "" {
		httputil.Error(w, http.StatusBadRequest, "env_id is required")
		return
	}

	state, err := h.store.GetFlagState(r.Context(), flag.ID, req.EnvID)
	if err != nil {
		state = &domain.FlagState{FlagID: flag.ID, EnvID: req.EnvID}
	}

	beforeState, _ := json.Marshal(state)
	state.Enabled = false

	if err := h.store.UpsertFlagState(r.Context(), state); err != nil {
		h.l(r).Error("kill switch failed", "error", err, "flag_id", flag.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to disable flag")
		return
	}

	h.l(r).Warn("KILL SWITCH activated", "flag_key", flagKey, "env_id", req.EnvID)

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(state)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.killed",
		ResourceType: "flag",
		ResourceID:   &flag.ID,
		BeforeState:  beforeState,
		AfterState:   afterState,
	})

	httputil.JSON(w, http.StatusOK, state)
}

func (h *FlagHandler) GetState(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
