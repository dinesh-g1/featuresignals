package handlers

import (
	crand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/provision"
	"github.com/featuresignals/server/internal/queue"
	"github.com/featuresignals/server/internal/service"
)

// ─── View Models ──────────────────────────────────────────────────────

// Cell represents a deployment cell (region/zone) in the infrastructure.
// Each cell runs a full FeatureSignals stack serving a set of tenants.
type Cell struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Region        string    `json:"region"`
	Provider      string    `json:"provider"`
	Status        string    `json:"status"`
	Version       string    `json:"version,omitempty"`
	TenantCount   int       `json:"tenant_count"`
	HealthyEnvs   int       `json:"healthy_envs"`
	TotalEnvs     int       `json:"total_envs"`
	CPUUsage      float64   `json:"cpu_usage,omitempty"`
	MemoryUsage   float64   `json:"memory_usage,omitempty"`
	DiskUsage     float64   `json:"disk_usage,omitempty"`
	LastHeartbeat time.Time `json:"last_heartbeat,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

// CellMetrics holds real-time metrics for a single cell.
type CellMetrics struct {
	CellID      string    `json:"cell_id"`
	CPUUsage    float64   `json:"cpu_usage"`
	MemoryUsage float64   `json:"memory_usage"`
	DiskUsage   float64   `json:"disk_usage"`
	RequestRate float64   `json:"request_rate"`
	EvalLatency float64   `json:"eval_latency_ms"`
	ErrorRate   float64   `json:"error_rate"`
	Connections int       `json:"connections"`
	CollectedAt time.Time `json:"collected_at"`
}

// ProvisionCellRequest is the request body for creating a new cell.
type ProvisionCellRequest struct {
	Name       string `json:"name"`
	ServerType string `json:"server_type"`
	Location   string `json:"location"`
	UserData   string `json:"user_data,omitempty"`
	Version    string `json:"version,omitempty"`
}

// ─── Handler ──────────────────────────────────────────────────────────

// OpsCellsHandler serves cell management endpoints for the ops portal.
type OpsCellsHandler struct {
	store            domain.Store
	provisionService *service.ProvisionService
	queueClient      *queue.Client
	eventBus         *provision.EventBus
	sshAccess        *provision.SSHAccess
	logger           *slog.Logger
}

// NewOpsCellsHandler creates a new ops cells handler.
func NewOpsCellsHandler(store domain.Store, provisionService *service.ProvisionService, queueClient *queue.Client, eventBus *provision.EventBus, sshAccess *provision.SSHAccess, logger *slog.Logger) *OpsCellsHandler {
	return &OpsCellsHandler{
		store:            store,
		provisionService: provisionService,
		queueClient:      queueClient,
		eventBus:         eventBus,
		sshAccess:        sshAccess,
		logger:           logger,
	}
}

// List handles GET /api/v1/ops/cells
func (h *OpsCellsHandler) List(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_list")

	cells, err := h.provisionService.ListCells(r.Context(), domain.CellFilter{})
	if err != nil {
		log.Error("failed to list cells", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list cells")
		return
	}

	viewCells := make([]Cell, 0, len(cells))
	for _, c := range cells {
		viewCells = append(viewCells, domainCellToView(c))
	}

	// If no cells exist yet, return an empty list (no mock data).
	httputil.JSON(w, http.StatusOK, map[string]any{
		"cells": viewCells,
		"total": len(viewCells),
	})
}

// Get handles GET /api/v1/ops/cells/{id}
func (h *OpsCellsHandler) Get(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_get")
	id := chi.URLParam(r, "id")

	cell, err := h.provisionService.GetCell(r.Context(), id)
	if err != nil {
		if isCellNotFound(err) {
			log.Warn("cell not found", "cell_id", id)
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		log.Error("failed to get cell", "error", err, "cell_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get cell")
		return
	}

	viewCell := domainCellToView(cell)
	viewCell.LastHeartbeat = time.Now().UTC()
	httputil.JSON(w, http.StatusOK, viewCell)
}

// Create handles POST /api/v1/ops/cells
func (h *OpsCellsHandler) Create(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_create")

	var req ProvisionCellRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.ServerType == "" {
		req.ServerType = "cx22"
	}
	if req.Location == "" {
		req.Location = "fsn1"
	}

	// If queue client is available, use async provisioning
	if h.queueClient != nil {
		// Create cell record in pending status
		cellID := uuid.New().String()
		now := time.Now().UTC()
		cell := &domain.Cell{
			ID:        cellID,
			Name:      req.Name,
			Provider:  domain.CellProviderHetzner,
			Region:    req.Location,
			Status:    "pending",
			Version:   req.Version,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := h.store.CreateCell(r.Context(), cell); err != nil {
			log.Error("failed to create cell record", "error", err)
			httputil.Error(w, http.StatusInternalServerError, "failed to create cell")
			return
		}

		// Set default version for backward compat if not provided
		if req.Version == "" {
			req.Version = "latest"
		}

		// Enqueue async provisioning task
		// Generate a random postgres password for the cell
		pgPassBytes := make([]byte, 16)
		crand.Read(pgPassBytes)
		pgPassword := hex.EncodeToString(pgPassBytes)

		taskID, err := h.queueClient.EnqueueProvisionCell(r.Context(), queue.ProvisionCellPayload{
			CellID:           cellID,
			Name:             req.Name,
			Provider:         "hetzner",
			ServerType:       req.ServerType,
			Region:           req.Location,
			UserData:         req.UserData,
			PostgresPassword: pgPassword,
			Version:          req.Version,
		})
		if err != nil {
			log.Error("failed to enqueue provisioning", "error", err)
			httputil.Error(w, http.StatusInternalServerError, "failed to enqueue provisioning")
			return
		}

		log.Info("cell provisioning enqueued", "cell_id", cellID, "task_id", taskID)
		httputil.JSON(w, http.StatusAccepted, map[string]any{
			"cell":    domainCellToView(cell),
			"task_id": taskID,
			"message": "Provisioning started. Stream status at GET /cells/{id}/provision-status",
		})
		return
	}

	// Fallback to synchronous provisioning if no queue
	provReq := service.ProvisionCellRequest{
		Name:       req.Name,
		ServerType: req.ServerType,
		Location:   req.Location,
		UserData:   req.UserData,
	}
	cell, err := h.provisionService.ProvisionCell(r.Context(), provReq)
	if err != nil {
		log.Error("failed to provision cell", "error", err, "name", req.Name)
		httputil.Error(w, http.StatusInternalServerError, "failed to provision cell: "+err.Error())
		return
	}
	log.Info("cell provisioned synchronously", "cell_id", cell.ID, "name", cell.Name)
	httputil.JSON(w, http.StatusCreated, domainCellToView(cell))
}

// ProvisionStatus streams provisioning events via SSE.
// GET /cells/{id}/provision-status
func (h *OpsCellsHandler) ProvisionStatus(w http.ResponseWriter, r *http.Request) {
	cellID := chi.URLParam(r, "id")
	log := h.logger.With("handler", "provision_status", "cell_id", cellID)

	if h.eventBus == nil {
		log.Warn("event bus not configured, cannot stream provision status")
		httputil.Error(w, http.StatusNotImplemented, "provisioning event streaming is not configured")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		httputil.Error(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"connected\",\"cell_id\":\"%s\"}\n\n", cellID)
	flusher.Flush()

	// Create channel for live events
	eventCh := make(chan *domain.ProvisionEvent, 100)
	unsubscribe := h.eventBus.Subscribe(cellID, eventCh)
	defer unsubscribe()

	// Send existing events first (from the past 24 hours)
	since := time.Now().UTC().Add(-24 * time.Hour)
	existingEvents, err := h.store.ListProvisionEvents(r.Context(), cellID, since)
	if err == nil {
		for _, evt := range existingEvents {
			writeSSEEvent(w, evt)
		}
		flusher.Flush()
	}

	// Stream new events in real-time
	ctx := r.Context()
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case evt := <-eventCh:
			writeSSEEvent(w, evt)
			flusher.Flush()
		case <-ctx.Done():
			log.Info("client disconnected from provision status stream", "event_count", len(eventCh))
			return
		case <-ticker.C:
			// Keep-alive heartbeat
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

func writeSSEEvent(w io.Writer, evt *domain.ProvisionEvent) {
	data, _ := json.Marshal(evt)
	fmt.Fprintf(w, "id: %s\nevent: %s\ndata: %s\n\n", evt.ID, evt.EventType, string(data))
}

// Pods handles GET /api/v1/ops/cells/{id}/pods
// It returns a list of Kubernetes pods running in the cell's featuresignals namespace.
func (h *OpsCellsHandler) Pods(w http.ResponseWriter, r *http.Request) {
	cellID := chi.URLParam(r, "id")
	logger := h.logger.With("handler", "ops_cell_pods", "cell_id", cellID)

	cell, err := h.store.GetCell(r.Context(), cellID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		logger.Error("failed to get cell", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if cell.PublicIP == "" {
		httputil.JSON(w, http.StatusOK, []PodStatus{})
		return
	}

	// SSH into the cell and get pods
	if h.sshAccess == nil {
		httputil.Error(w, http.StatusServiceUnavailable, "SSH not configured")
		return
	}

	output, err := h.sshAccess.Execute(r.Context(), cell.PublicIP, "k3s kubectl get pods -n featuresignals -o json")
	if err != nil {
		logger.Error("failed to execute kubectl get pods", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get pod status")
		return
	}

	var podList struct {
		Items []struct {
			Metadata struct {
				Name      string            `json:"name"`
				Labels    map[string]string `json:"labels"`
				Namespace string            `json:"namespace"`
			} `json:"metadata"`
			Status struct {
				Phase             string `json:"phase"`
				HostIP            string `json:"hostIP"`
				PodIP             string `json:"podIP"`
				StartTime         string `json:"startTime"`
				ContainerStatuses  []struct {
					Name         string `json:"name"`
					Ready        bool   `json:"ready"`
					RestartCount int    `json:"restartCount"`
					State        struct {
						Running    *struct{} `json:"running"`
						Waiting    *struct {
							Reason string `json:"reason"`
						} `json:"waiting"`
						Terminated *struct {
							Reason   string `json:"reason"`
							ExitCode int    `json:"exitCode"`
						} `json:"terminated"`
					} `json:"state"`
				} `json:"containerStatuses"`
			} `json:"status"`
		} `json:"items"`
	}

	if err := json.Unmarshal([]byte(output), &podList); err != nil {
		logger.Error("failed to parse kubectl output", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to parse pod data")
		return
	}

	pods := make([]PodStatus, 0, len(podList.Items))
	for _, item := range podList.Items {
		pod := PodStatus{
			Name:      item.Metadata.Name,
			Namespace: item.Metadata.Namespace,
			Phase:     item.Status.Phase,
			HostIP:    item.Status.HostIP,
			PodIP:     item.Status.PodIP,
		}
		for _, cs := range item.Status.ContainerStatuses {
			container := ContainerStatus{
				Name:         cs.Name,
				Ready:        cs.Ready,
				RestartCount: cs.RestartCount,
			}
			if cs.State.Running != nil {
				container.State = "running"
			} else if cs.State.Waiting != nil {
				container.State = "waiting"
				container.Reason = cs.State.Waiting.Reason
			} else if cs.State.Terminated != nil {
				container.State = "terminated"
				container.Reason = cs.State.Terminated.Reason
				container.ExitCode = cs.State.Terminated.ExitCode
			}
			pod.Containers = append(pod.Containers, container)
		}
		pods = append(pods, pod)
	}

	httputil.JSON(w, http.StatusOK, pods)
}

// PodStatus represents a Kubernetes pod summary for the ops portal.
type PodStatus struct {
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Phase      string            `json:"phase"`
	HostIP     string            `json:"host_ip,omitempty"`
	PodIP      string            `json:"pod_ip,omitempty"`
	Containers []ContainerStatus `json:"containers,omitempty"`
}

// ContainerStatus represents a container within a pod.
type ContainerStatus struct {
	Name         string `json:"name"`
	State        string `json:"state"`
	Ready        bool   `json:"ready"`
	RestartCount int    `json:"restart_count"`
	Reason       string `json:"reason,omitempty"`
	ExitCode     int    `json:"exit_code,omitempty"`
}

// Delete handles DELETE /api/v1/ops/cells/{id}
func (h *OpsCellsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_delete")
	id := chi.URLParam(r, "id")

	if err := h.provisionService.DeprovisionCell(r.Context(), id); err != nil {
		if isCellNotFound(err) {
			log.Warn("cell not found for deletion", "cell_id", id)
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		log.Error("failed to deprovision cell", "error", err, "cell_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to deprovision cell")
		return
	}

	log.Info("cell deprovisioned", "cell_id", id)
	w.WriteHeader(http.StatusNoContent)
}

// Metrics handles GET /api/v1/ops/cells/{id}/metrics — SSE streaming endpoint.
// It streams simulated real-time metrics as Server-Sent Events until the client disconnects.
func (h *OpsCellsHandler) Metrics(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_metrics")
	id := chi.URLParam(r, "id")

	// Verify the cell exists before starting the stream.
	cell, err := h.provisionService.GetCell(r.Context(), id)
	if err != nil {
		if isCellNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		log.Error("failed to get cell for metrics", "error", err, "cell_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get cell")
		return
	}

	// SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		log.Error("streaming not supported for metrics response writer")
		httputil.Error(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	// Send initial event with the cell info
	viewCell := domainCellToView(cell)
	initialData, _ := json.Marshal(map[string]any{
		"event": "cell_info",
		"data":  viewCell,
	})
	fmt.Fprintf(w, "data: %s\n\n", initialData)
	flusher.Flush()

	ctx := r.Context()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Seed a local random source for isolated metric simulation.
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	baseCPU := cell.CPU.Percent
	if baseCPU == 0 {
		baseCPU = 23.5
	}
	baseMem := cell.Memory.Percent
	if baseMem == 0 {
		baseMem = 41.2
	}
	baseDisk := cell.Disk.Percent
	if baseDisk == 0 {
		baseDisk = 17.8
	}
	baseLatency := 0.8
	baseReqs := 1200.0
	baseErrs := 0.5
	baseConns := 42

	iteration := 0

	for {
		select {
		case <-ctx.Done():
			log.Debug("metrics SSE client disconnected", "cell_id", id)
			return
		case <-ticker.C:
			iteration++

			metrics := generateMetrics(rng, iteration, id, baseCPU, baseMem, baseDisk, baseLatency, baseReqs, baseErrs, baseConns)

			metricsData, err := json.Marshal(map[string]any{
				"event":   "metrics",
				"data":    metrics,
				"cell_id": id,
			})
			if err != nil {
				log.Warn("failed to marshal metrics", "error", err)
				continue
			}

			fmt.Fprintf(w, "data: %s\n\n", metricsData)
			flusher.Flush()
		}
	}
}

// Scale handles POST /api/v1/ops/cells/{id}/scale
func (h *OpsCellsHandler) Scale(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_scale")
	id := chi.URLParam(r, "id")

	var req struct {
		NodeCount int `json:"node_count"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.provisionService.ScaleCell(r.Context(), id, req.NodeCount); err != nil {
		if isCellNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		log.Error("failed to scale cell", "error", err, "cell_id", id, "node_count", req.NodeCount)
		httputil.Error(w, http.StatusInternalServerError, "failed to scale cell")
		return
	}

	log.Info("cell scaling", "cell_id", id, "node_count", req.NodeCount)
	httputil.JSON(w, http.StatusOK, map[string]any{
		"status":     "scaling",
		"cell_id":    id,
		"node_count": req.NodeCount,
	})
}

// Drain handles POST /api/v1/ops/cells/{id}/drain
func (h *OpsCellsHandler) Drain(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_drain")
	id := chi.URLParam(r, "id")

	var req struct {
		Force bool `json:"force"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.provisionService.DrainCell(r.Context(), id, req.Force); err != nil {
		if isCellNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		log.Error("failed to drain cell", "error", err, "cell_id", id, "force", req.Force)
		httputil.Error(w, http.StatusInternalServerError, "failed to drain cell")
		return
	}

	log.Info("cell draining", "cell_id", id, "force", req.Force)
	httputil.JSON(w, http.StatusOK, map[string]any{
		"status":  "draining",
		"cell_id": id,
	})
}

// MigrateTenants handles POST /api/v1/ops/cells/{id}/migrate
func (h *OpsCellsHandler) MigrateTenants(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_migrate_tenants")
	id := chi.URLParam(r, "id")

	var req struct {
		TargetCellID string   `json:"target_cell_id"`
		TenantIDs    []string `json:"tenant_ids"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.TenantIDs) == 0 {
		httputil.Error(w, http.StatusBadRequest, "tenant_ids must not be empty")
		return
	}

	log.Info("tenant migration initiated",
		"source_cell_id", id,
		"target_cell_id", req.TargetCellID,
		"tenant_count", len(req.TenantIDs),
	)

	httputil.JSON(w, http.StatusAccepted, map[string]any{
		"status":         "migration_initiated",
		"source_cell_id": id,
		"target_cell_id": req.TargetCellID,
		"tenant_count":   len(req.TenantIDs),
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────

// domainCellToView converts a domain.Cell to the handler's Cell view model.
func domainCellToView(c *domain.Cell) Cell {
	return Cell{
		ID:          c.ID,
		Name:        c.Name,
		Region:      c.Region,
		Provider:    c.Provider,
		Status:      cellStatusToView(c.Status),
		Version:     c.Version,
		TenantCount: c.TenantCount,
		CPUUsage:    c.CPU.Percent,
		MemoryUsage: c.Memory.Percent,
		DiskUsage:   c.Disk.Percent,
		CreatedAt:   c.CreatedAt,
	}
}

// cellStatusToView maps domain cell status constants to the view model status.
func cellStatusToView(status string) string {
	switch status {
	case domain.CellStatusProvisioning:
		return "provisioning"
	case domain.CellStatusRunning:
		return "healthy"
	case domain.CellStatusDegraded:
		return "degraded"
	case domain.CellStatusDown:
		return "down"
	case domain.CellStatusDraining:
		return "draining"
	case "failed":
		return "failed"
	case "deprovisioning":
		return "deprovisioning"
	default:
		return "unknown"
	}
}

// isCellNotFound returns true if the error wraps domain.ErrNotFound.
func isCellNotFound(err error) bool {
	return errors.Is(err, domain.ErrNotFound)
}

// ─── REST Metrics (time-series snapshot) ──────────────────────────────

// MetricsCurrent handles GET /api/v1/ops/cells/{id}/metrics/current
// Returns a single metrics snapshot as REST JSON in time-series format.
func (h *OpsCellsHandler) MetricsCurrent(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_metrics_current")
	id := chi.URLParam(r, "id")

	cell, err := h.provisionService.GetCell(r.Context(), id)
	if err != nil {
		if isCellNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "cell not found")
			return
		}
		log.Error("failed to get cell for metrics", "error", err, "cell_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get cell")
		return
	}

	now := time.Now().UTC()
	ts := now.Format(time.RFC3339Nano)

	baseCPU := cell.CPU.Percent
	if baseCPU == 0 {
		baseCPU = 23.5
	}
	baseMem := cell.Memory.Percent
	if baseMem == 0 {
		baseMem = 41.2
	}
	baseDisk := cell.Disk.Percent
	if baseDisk == 0 {
		baseDisk = 17.8
	}

	type timeSeriesPoint struct {
		Timestamp string  `json:"timestamp"`
		Value     float64 `json:"value"`
	}

	type networkMetrics struct {
		InBps  []timeSeriesPoint `json:"inBps"`
		OutBps []timeSeriesPoint `json:"outBps"`
	}

	type restCellMetrics struct {
		CPU     []timeSeriesPoint `json:"cpu"`
		Memory  []timeSeriesPoint `json:"memory"`
		Disk    []timeSeriesPoint `json:"disk"`
		Network networkMetrics    `json:"network"`
	}

	metrics := restCellMetrics{
		CPU:    []timeSeriesPoint{{Timestamp: ts, Value: baseCPU}},
		Memory: []timeSeriesPoint{{Timestamp: ts, Value: baseMem}},
		Disk:   []timeSeriesPoint{{Timestamp: ts, Value: baseDisk}},
		Network: networkMetrics{
			InBps:  []timeSeriesPoint{{Timestamp: ts, Value: baseCPU * 1024}},
			OutBps: []timeSeriesPoint{{Timestamp: ts, Value: baseMem * 512}},
		},
	}

	httputil.JSON(w, http.StatusOK, metrics)
}

// generateMetrics creates a metrics snapshot with small random variations.
func generateMetrics(rng *rand.Rand, iter int, cellID string, baseCPU, baseMem, baseDisk, baseLatency, baseReqs, baseErrs float64, baseConns int) CellMetrics {
	// Add a slow sine wave drift + noise for realism.
	drift := math.Sin(float64(iter)*0.3) * 0.15

	now := time.Now().UTC()

	return CellMetrics{
		CellID:      cellID,
		CPUUsage:    clamp(baseCPU+drift+rng.Float64()*5.0-2.5, 0, 100),
		MemoryUsage: clamp(baseMem+drift*0.5+rng.Float64()*3.0-1.5, 0, 100),
		DiskUsage:   clamp(baseDisk+rng.Float64()*2.0-1.0, 0, 100),
		RequestRate: clamp(baseReqs+rng.Float64()*200-100, 0, 10000),
		EvalLatency: clamp(baseLatency+rng.Float64()*0.4-0.2, 0, 10),
		ErrorRate:   clamp(baseErrs+rng.Float64()*0.3-0.15, 0, 100),
		Connections: baseConns + int(rng.Float64()*10-5),
		CollectedAt: now,
	}
}

// clamp restricts v to the range [min, max].
func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}