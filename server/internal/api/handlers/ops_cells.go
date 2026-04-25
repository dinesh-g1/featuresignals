package handlers

import (
	"context"
	"encoding/json"

	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// ─── View Models ──────────────────────────────────────────────────────

// Cell represents a deployment cell (region/zone) in the infrastructure.
// Each cell runs a full FeatureSignals stack serving a set of tenants.
// This is a local view model — not persisted in the database.
type Cell struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Region        string    `json:"region"`
	Provider      string    `json:"provider"`
	Status        string    `json:"status"` // healthy, degraded, down
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

// cellStaticData is the single cell definition for MVP.
var cellStaticData = Cell{
	ID:            "eu-fsn",
	Name:          "Frankfurt (Main)",
	Region:        "eu-central-1",
	Provider:      "Hetzner",
	Status:        "healthy",
	Version:       "5.0.0",
	TenantCount:   0,
	HealthyEnvs:   0,
	TotalEnvs:     0,
	CPUUsage:      23.5,
	MemoryUsage:   41.2,
	DiskUsage:     17.8,
	LastHeartbeat: time.Now().UTC(),
	CreatedAt:     time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
}

// ─── Handler ──────────────────────────────────────────────────────────

// OpsCellsHandler serves cell management endpoints for the ops portal.
type OpsCellsHandler struct {
	store  domain.Store
	logger *slog.Logger
}

// NewOpsCellsHandler creates a new ops cells handler.
func NewOpsCellsHandler(store domain.Store, logger *slog.Logger) *OpsCellsHandler {
	return &OpsCellsHandler{store: store, logger: logger}
}

// List handles GET /api/v1/ops/cells
func (h *OpsCellsHandler) List(w http.ResponseWriter, r *http.Request) {
	_ = h.logger.With("handler", "ops_cells_list")

	// For MVP, return a single static cell.
	// In production, cells would be discovered from infrastructure metadata.
	cell := refreshCellStats(r.Context(), h.store, cellStaticData)
	cells := []Cell{cell}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"cells": cells,
		"total": len(cells),
	})
}

// Get handles GET /api/v1/ops/cells/{id}
func (h *OpsCellsHandler) Get(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_get")
	id := chi.URLParam(r, "id")

	// For MVP, only one cell exists.
	if id != "eu-fsn" {
		log.Warn("cell not found", "cell_id", id)
		httputil.Error(w, http.StatusNotFound, "cell not found")
		return
	}

	cell := refreshCellStats(r.Context(), h.store, cellStaticData)
	httputil.JSON(w, http.StatusOK, cell)
}

// Metrics handles GET /api/v1/ops/cells/{id}/metrics — SSE streaming endpoint.
// It streams simulated real-time metrics as Server-Sent Events until the client disconnects.
func (h *OpsCellsHandler) Metrics(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_cells_metrics")
	id := chi.URLParam(r, "id")

	// Verify the cell exists before starting the stream.
	if id != "eu-fsn" {
		httputil.Error(w, http.StatusNotFound, "cell not found")
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
	cell := refreshCellStats(r.Context(), h.store, cellStaticData)
	initialData, _ := json.Marshal(map[string]any{
		"event": "cell_info",
		"data":  cell,
	})
	fmt.Fprintf(w, "data: %s\n\n", initialData)
	flusher.Flush()

	ctx := r.Context()
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Seed a local random source for isolated metric simulation.
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	baseCPU := 23.5
	baseMem := 41.2
	baseDisk := 17.8
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

// refreshCellStats populates the tenant/environment counts from the store.
func refreshCellStats(ctx context.Context, store domain.Store, base Cell) Cell {
	if store == nil {
		return base
	}
	cell := base

	// Try to get live tenant count via TenantRegistry if available.
	if registry, ok := store.(domain.TenantRegistry); ok {
		tenants, total, err := registry.List(ctx, domain.TenantFilter{Limit: 1})
		if err == nil {
			_ = tenants
			cell.TenantCount = total
		}
	}

	cell.LastHeartbeat = time.Now().UTC()
	return cell
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