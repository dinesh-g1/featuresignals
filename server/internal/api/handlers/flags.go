package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// l returns a request-scoped logger for the flag handler.
func (h *FlagHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "flags")
}

type flagStore interface {
	domain.FlagReader
	domain.FlagWriter
	domain.AuditWriter
	domain.OrgMemberStore
	domain.EnvPermissionStore
	projectGetter
}

type FlagHandler struct {
	store flagStore
}

func NewFlagHandler(store flagStore) *FlagHandler {
	return &FlagHandler{store: store}
}

type KillFlagRequest struct {
	EnvID string `json:"env_id"`
}

type CreateFlagRequest struct {
	Key                  string          `json:"key"`
	Name                 string          `json:"name"`
	Description          string          `json:"description"`
	FlagType             string          `json:"flag_type"`
	Category             string          `json:"category"`
	Status               string          `json:"status"`
	DefaultValue         json.RawMessage `json:"default_value"`
	Tags                 []string        `json:"tags"`
	Prerequisites        []string        `json:"prerequisites,omitempty"`
	MutualExclusionGroup string          `json:"mutual_exclusion_group,omitempty"`
}

func defaultValueForType(ft domain.FlagType) json.RawMessage {
	switch ft {
	case domain.FlagTypeString:
		return json.RawMessage(`""`)
	case domain.FlagTypeNumber:
		return json.RawMessage(`0`)
	case domain.FlagTypeJSON:
		return json.RawMessage(`{}`)
	default:
		return json.RawMessage(`false`)
	}
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

	flagType := domain.FlagType(req.FlagType)
	if flagType == "" {
		flagType = domain.FlagTypeBoolean
	}
	category := domain.FlagCategory(req.Category)
	if category == "" {
		category = domain.CategoryRelease
	}
	status := domain.FlagStatus(req.Status)
	if status == "" {
		status = domain.StatusActive
	}
	defaultVal := req.DefaultValue
	if defaultVal == nil {
		defaultVal = defaultValueForType(flagType)
	}

	flag := &domain.Flag{
		ProjectID:            projectID,
		Key:                  req.Key,
		Name:                 req.Name,
		Description:          req.Description,
		FlagType:             flagType,
		Category:             category,
		Status:               status,
		DefaultValue:         defaultVal,
		Tags:                 req.Tags,
		Prerequisites:        req.Prerequisites,
		MutualExclusionGroup: req.MutualExclusionGroup,
	}

	if err := flag.Validate(); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.store.CreateFlag(r.Context(), flag); err != nil {
		h.l(r).Warn("flag create failed", "project_id", projectID, "key", req.Key, "err", err)
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "flag key already exists in this project")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "failed to create flag")
		}
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
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	})

	httputil.JSON(w, http.StatusCreated, dto.FlagFromDomain(flag))
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

	all := dto.FlagSliceFromDomain(flags)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset))
}

func (h *FlagHandler) Get(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "failed to get flag")
		}
		return
	}

	httputil.JSON(w, http.StatusOK, dto.FlagFromDomain(flag))
}

func (h *FlagHandler) Update(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "failed to get flag")
		}
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
	if req.Category != "" {
		cat := domain.FlagCategory(req.Category)
		if !cat.IsValid() {
			httputil.Error(w, http.StatusBadRequest, "category: must be release, experiment, ops, or permission")
			return
		}
		flag.Category = cat
	}
	if req.Status != "" {
		st := domain.FlagStatus(req.Status)
		if !st.IsValid() {
			httputil.Error(w, http.StatusBadRequest, "status: must be active, rolled_out, deprecated, or archived")
			return
		}
		flag.Status = st
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
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.FlagFromDomain(flag))
}

func (h *FlagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	flagKey := chi.URLParam(r, "flagKey")

	flag, err := h.store.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "failed to get flag")
		}
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
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
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
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

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

	if req.Enabled != nil {
		if !middleware.CheckEnvPermission(r.Context(), h.store, orgID, userID, envID, "can_toggle") {
			httputil.Error(w, http.StatusForbidden, "you do not have permission to toggle flags in this environment")
			return
		}
	}
	if req.Rules != nil || req.PercentageRollout != nil || req.Variants != nil {
		if !middleware.CheckEnvPermission(r.Context(), h.store, orgID, userID, envID, "can_edit_rules") {
			httputil.Error(w, http.StatusForbidden, "you do not have permission to edit rules in this environment")
			return
		}
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

	beforeState, _ := json.Marshal(existing)

	if err := h.store.UpsertFlagState(r.Context(), state); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to update flag state")
		return
	}

	afterState, _ := json.Marshal(state)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.state_updated",
		ResourceType: "flag",
		ResourceID:   &flag.ID,
		BeforeState:  beforeState,
		AfterState:   afterState,
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.FlagStateFromDomain(state))
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

	promoteOrgID := middleware.GetOrgID(r.Context())
	promoteUserID := middleware.GetUserID(r.Context())
	if !middleware.CheckEnvPermission(r.Context(), h.store, promoteOrgID, promoteUserID, req.TargetEnvID, "can_edit_rules") {
		httputil.Error(w, http.StatusForbidden, "you do not have permission to modify flags in the target environment")
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
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.FlagStateFromDomain(target))
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

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req KillFlagRequest
	if err := httputil.DecodeJSON(r, &req); err != nil || req.EnvID == "" {
		httputil.Error(w, http.StatusBadRequest, "env_id is required")
		return
	}

	if !middleware.CheckEnvPermission(r.Context(), h.store, orgID, userID, req.EnvID, "can_toggle") {
		httputil.Error(w, http.StatusForbidden, "you do not have permission to toggle flags in this environment")
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
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.FlagStateFromDomain(state))
}

// --- Environment Comparison ---

type EnvDiff struct {
	FlagKey        string `json:"flag_key"`
	SourceEnabled  *bool  `json:"source_enabled"`
	TargetEnabled  *bool  `json:"target_enabled"`
	SourceRollout  *int   `json:"source_rollout"`
	TargetRollout  *int   `json:"target_rollout"`
	SourceRules    int    `json:"source_rules"`
	TargetRules    int    `json:"target_rules"`
	Differences    []string `json:"differences"`
}

type EnvComparisonResponse struct {
	Total       int       `json:"total"`
	DiffCount   int       `json:"diff_count"`
	Diffs       []EnvDiff `json:"diffs"`
}

// CompareEnvironments returns per-flag diffs between two environments.
func (h *FlagHandler) CompareEnvironments(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	sourceEnvID := r.URL.Query().Get("source_env_id")
	targetEnvID := r.URL.Query().Get("target_env_id")
	if sourceEnvID == "" || targetEnvID == "" {
		httputil.Error(w, http.StatusBadRequest, "source_env_id and target_env_id query params are required")
		return
	}
	if sourceEnvID == targetEnvID {
		httputil.Error(w, http.StatusBadRequest, "source and target environments must differ")
		return
	}

	flags, err := h.store.ListFlags(r.Context(), projectID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list flags")
		return
	}

	stateMap := func(envID string) map[string]*domain.FlagState {
		m := make(map[string]*domain.FlagState)
		for _, f := range flags {
			st, err := h.store.GetFlagState(r.Context(), f.ID, envID)
			if err == nil {
				m[f.Key] = st
			}
		}
		return m
	}
	sourceStates := stateMap(sourceEnvID)
	targetStates := stateMap(targetEnvID)

	diffs := make([]EnvDiff, 0)
	for _, f := range flags {
		src := sourceStates[f.Key]
		tgt := targetStates[f.Key]
		diff := EnvDiff{FlagKey: f.Key}
		hasDiff := false

		if src != nil {
			diff.SourceEnabled = &src.Enabled
			diff.SourceRollout = &src.PercentageRollout
			diff.SourceRules = len(src.Rules)
		}
		if tgt != nil {
			diff.TargetEnabled = &tgt.Enabled
			diff.TargetRollout = &tgt.PercentageRollout
			diff.TargetRules = len(tgt.Rules)
		}

		if (src == nil) != (tgt == nil) {
			hasDiff = true
			if src == nil {
				diff.Differences = append(diff.Differences, "target_only")
			} else {
				diff.Differences = append(diff.Differences, "source_only")
			}
		} else if src != nil && tgt != nil {
			if src.Enabled != tgt.Enabled {
				diff.Differences = append(diff.Differences, "enabled")
				hasDiff = true
			}
			if src.PercentageRollout != tgt.PercentageRollout {
				diff.Differences = append(diff.Differences, "rollout")
				hasDiff = true
			}
			if len(src.Rules) != len(tgt.Rules) {
				diff.Differences = append(diff.Differences, "rules")
				hasDiff = true
			}
			if string(src.DefaultValue) != string(tgt.DefaultValue) {
				diff.Differences = append(diff.Differences, "default_value")
				hasDiff = true
			}
		}

		if hasDiff {
			diffs = append(diffs, diff)
		}
	}

	httputil.JSON(w, http.StatusOK, EnvComparisonResponse{
		Total:     len(flags),
		DiffCount: len(diffs),
		Diffs:     diffs,
	})
}

type SyncEnvironmentsRequest struct {
	SourceEnvID string   `json:"source_env_id"`
	TargetEnvID string   `json:"target_env_id"`
	FlagKeys    []string `json:"flag_keys"`
}

// SyncEnvironments bulk-promotes selected flags from source to target environment.
func (h *FlagHandler) SyncEnvironments(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var req SyncEnvironmentsRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SourceEnvID == "" || req.TargetEnvID == "" || len(req.FlagKeys) == 0 {
		httputil.Error(w, http.StatusBadRequest, "source_env_id, target_env_id, and flag_keys are required")
		return
	}
	if req.SourceEnvID == req.TargetEnvID {
		httputil.Error(w, http.StatusBadRequest, "source and target environments must differ")
		return
	}

	synced := 0
	for _, key := range req.FlagKeys {
		flag, err := h.store.GetFlag(r.Context(), projectID, key)
		if err != nil {
			continue
		}
		source, err := h.store.GetFlagState(r.Context(), flag.ID, req.SourceEnvID)
		if err != nil {
			continue
		}

		existing, _ := h.store.GetFlagState(r.Context(), flag.ID, req.TargetEnvID)
		target := &domain.FlagState{
			FlagID:            flag.ID,
			EnvID:             req.TargetEnvID,
			Enabled:           source.Enabled,
			DefaultValue:      source.DefaultValue,
			Rules:             source.Rules,
			PercentageRollout: source.PercentageRollout,
			Variants:          source.Variants,
		}
		if existing != nil {
			target.ID = existing.ID
		}

		if err := h.store.UpsertFlagState(r.Context(), target); err != nil {
			h.l(r).Error("sync flag failed", "error", err, "flag_key", key)
			continue
		}

		orgID := middleware.GetOrgID(r.Context())
		userID := middleware.GetUserID(r.Context())
		afterState, _ := json.Marshal(target)
		h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
			OrgID:        orgID,
			ActorID:      &userID,
			ActorType:    "user",
			Action:       "flag.synced",
			ResourceType: "flag",
			ResourceID:   &flag.ID,
			AfterState:   afterState,
			IPAddress:    r.RemoteAddr,
			UserAgent:    r.UserAgent(),
		})
		synced++
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"synced": synced,
		"total":  len(req.FlagKeys),
	})
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
		httputil.JSON(w, http.StatusOK, dto.FlagStateFromDomain(&domain.FlagState{
			FlagID:  flag.ID,
			EnvID:   envID,
			Enabled: false,
		}))
		return
	}

	httputil.JSON(w, http.StatusOK, dto.FlagStateFromDomain(state))
}
