package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/api/middleware"
	"github.com/featuresignals/ops-portal/internal/cluster"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ConfigHandler handles HTTP requests for cluster configuration management.
type ConfigHandler struct {
	clusterStore  domain.ClusterStore
	configStore   domain.ConfigSnapshotStore
	clusterClient *cluster.Client
	audit         domain.AuditStore
	logger        *slog.Logger
}

// NewConfigHandler creates a new ConfigHandler.
func NewConfigHandler(clusterStore domain.ClusterStore, configStore domain.ConfigSnapshotStore, clusterClient *cluster.Client, audit domain.AuditStore, logger *slog.Logger) *ConfigHandler {
	return &ConfigHandler{
		clusterStore:  clusterStore,
		configStore:   configStore,
		clusterClient: clusterClient,
		audit:         audit,
		logger:        logger.With("handler", "config"),
	}
}

// GET /api/v1/clusters/{id}/config
func (h *ConfigHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	cluster, err := h.clusterStore.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to get cluster", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Try to fetch live config from cluster
	liveConfig, err := h.clusterClient.FetchConfig(r.Context(), cluster)
	if err == nil {
		w.Header().Set("X-Config-Source", "live")
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"config":     liveConfig,
			"source":     "live",
			"version":    0,
			"cluster_id": cluster.ID,
		})
		return
	}

	// Fall back to snapshot
	snapshot, err := h.configStore.GetLatestSnapshot(r.Context(), cluster.ID)
	if err == nil {
		w.Header().Set("X-Config-Source", "snapshot")
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"config":     snapshot.Config,
			"source":     "snapshot",
			"version":    snapshot.Version,
			"changed_by": snapshot.ChangedBy,
			"created_at": snapshot.CreatedAt,
			"cluster_id": cluster.ID,
		})
		return
	}

	h.logger.Warn("cluster unreachable and no snapshot", "cluster", cluster.Name, "error", err)
	httputil.Error(w, http.StatusServiceUnavailable, "cluster unreachable and no cached config")
}

// PUT /api/v1/clusters/{id}/config
func (h *ConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	cluster, err := h.clusterStore.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		h.logger.Error("failed to get cluster", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	var req struct {
		Config json.RawMessage `json:"config"`
		Reason string          `json:"reason"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if !json.Valid(req.Config) {
		httputil.Error(w, http.StatusUnprocessableEntity, "config must be valid JSON")
		return
	}

	// Get current config from cluster to merge
	currentConfig := "{}"
	liveConfig, err := h.clusterClient.FetchConfig(r.Context(), cluster)
	if err == nil {
		currentConfig = liveConfig
	} else {
		// Try snapshot
		snap, snapErr := h.configStore.GetLatestSnapshot(r.Context(), cluster.ID)
		if snapErr == nil {
			currentConfig = snap.Config
		}
	}

	// Merge: parse both, overlay new values
	var currentMap map[string]interface{}
	var newMap map[string]interface{}
	json.Unmarshal([]byte(currentConfig), &currentMap)
	json.Unmarshal(req.Config, &newMap)

	for k, v := range newMap {
		currentMap[k] = v
	}

	merged, _ := json.Marshal(currentMap)
	mergedStr := string(merged)

	// Create snapshot
	userID := middleware.GetUserID(r.Context())
	snapshot := &domain.ConfigSnapshot{
		ID:        uuid.New().String(),
		ClusterID: cluster.ID,
		Config:    mergedStr,
		ChangedBy: userID,
		Reason:    req.Reason,
		CreatedAt: time.Now().UTC(),
	}

	if err := h.configStore.CreateSnapshot(r.Context(), snapshot); err != nil {
		h.logger.Error("failed to create snapshot", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to save config")
		return
	}

	// Push to cluster
	pushErr := h.clusterClient.UpdateConfig(r.Context(), cluster, mergedStr)
	statusCode := http.StatusOK
	warning := ""

	if pushErr != nil {
		h.logger.Warn("config saved but push to cluster failed", "cluster", cluster.Name, "error", pushErr)
		statusCode = http.StatusMultiStatus
		warning = "config saved locally but cluster unreachable — will be pushed when cluster recovers"
	}

	// Audit
	h.audit.Append(r.Context(), &domain.AuditEntry{
		UserID:     userID,
		Action:     "config.update",
		TargetType: "cluster",
		TargetID:   cluster.ID,
		Details:    `{"version":` + string(rune(snapshot.Version+'0')) + `}`,
		IP:         r.RemoteAddr,
	})

	resp := map[string]interface{}{
		"config":     mergedStr,
		"version":    snapshot.Version,
		"created_at": snapshot.CreatedAt,
	}
	if warning != "" {
		resp["warning"] = warning
	}

	httputil.JSON(w, statusCode, resp)
}

// GET /api/v1/clusters/{id}/config/history
func (h *ConfigHandler) History(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	limit, offset := httputil.ParsePagination(r, 50, 100)

	cluster, err := h.clusterStore.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	snaps, total, err := h.configStore.ListSnapshots(r.Context(), cluster.ID, limit, offset)
	if err != nil {
		h.logger.Error("failed to list snapshots", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list config history")
		return
	}

	if snaps == nil {
		snaps = []domain.ConfigSnapshot{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":   snaps,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GET /api/v1/clusters/{id}/config/resolved
func (h *ConfigHandler) Resolved(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	cluster, err := h.clusterStore.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// For now, return the live config or snapshot as the "resolved" config
	liveConfig, err := h.clusterClient.FetchConfig(r.Context(), cluster)
	if err == nil {
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"config": liveConfig,
			"source": "live",
		})
		return
	}

	snap, err := h.configStore.GetLatestSnapshot(r.Context(), cluster.ID)
	if err == nil {
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"config": snap.Config,
			"source": "snapshot",
		})
		return
	}

	httputil.Error(w, http.StatusServiceUnavailable, "cluster unreachable and no cached config")
}

// GET /api/v1/clusters/{id}/config/rate-limits
func (h *ConfigHandler) RateLimits(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	cluster, err := h.clusterStore.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Get current config
	configStr := "{}"
	liveConfig, err := h.clusterClient.FetchConfig(r.Context(), cluster)
	if err == nil {
		configStr = liveConfig
	} else {
		snap, snapErr := h.configStore.GetLatestSnapshot(r.Context(), cluster.ID)
		if snapErr == nil {
			configStr = snap.Config
		}
	}

	var configMap map[string]interface{}
	json.Unmarshal([]byte(configStr), &configMap)

	rateLimits := map[string]interface{}{}
	if rl, ok := configMap["rate_limits"]; ok {
		rateLimits = rl.(map[string]interface{})
	}

	httputil.JSON(w, http.StatusOK, rateLimits)
}

// PUT /api/v1/clusters/{id}/config/rate-limits
func (h *ConfigHandler) UpdateRateLimits(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var rateLimits map[string]interface{}
	if err := httputil.DecodeJSON(r, &rateLimits); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Merge rate limits into full config and save
	cluster, err := h.clusterStore.GetByID(id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cluster not found")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	configStr := "{}"
	liveConfig, err := h.clusterClient.FetchConfig(r.Context(), cluster)
	if err == nil {
		configStr = liveConfig
	} else {
		snap, snapErr := h.configStore.GetLatestSnapshot(r.Context(), cluster.ID)
		if snapErr == nil {
			configStr = snap.Config
		}
	}

	var configMap map[string]interface{}
	json.Unmarshal([]byte(configStr), &configMap)
	configMap["rate_limits"] = rateLimits
	merged, _ := json.Marshal(configMap)

	snapshot := &domain.ConfigSnapshot{
		ID:        uuid.New().String(),
		ClusterID: cluster.ID,
		Config:    string(merged),
		ChangedBy: middleware.GetUserID(r.Context()),
		Reason:    "rate limit update",
		CreatedAt: time.Now().UTC(),
	}

	if err := h.configStore.CreateSnapshot(r.Context(), snapshot); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to save rate limits")
		return
	}

	h.clusterClient.UpdateConfig(r.Context(), cluster, string(merged))

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"rate_limits": rateLimits,
		"version":     snapshot.Version,
	})
}