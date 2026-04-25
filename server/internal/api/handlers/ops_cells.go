package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
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
}

// ─── Handler ──────────────────────────────────────────────────────────

// OpsCellsHandler serves cell management endpoints for the ops portal.
type OpsCellsHandler struct {
	store            domain.Store
	provisionService *service.ProvisionService
	logger           *slog.Logger
}

// NewOpsCellsHandler creates a new ops cells handler.
func NewOpsCellsHandler(store domain.Store, provisionService *service.ProvisionService, logger *slog.Logger) *OpsCellsHandler {
	return &OpsCellsHandler{
		store:            store,
		provisionService: provisionService,
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

	log.Info("cell provisioned", "cell_id", cell.ID, "name", cell.Name)
	httputil.JSON(w, http.StatusCreated, domainCellToView(cell))
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

