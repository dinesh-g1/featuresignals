package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"runtime"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// ─── Domain Types ─────────────────────────────────────────────────────

// SystemHealth holds the overall system health information for the ops portal.
type SystemHealth struct {
	Status      string            `json:"status"` // healthy, degraded, down
	Uptime      string            `json:"uptime"`
	Version     string            `json:"version,omitempty"`
	GoVersion   string            `json:"go_version,omitempty"`
	NumCPU      int               `json:"num_cpu"`
	Goroutines  int               `json:"goroutines"`
	Services    []ServiceStatus   `json:"services"`
	Resources   ResourceUsage     `json:"resource_usage"`
	CheckedAt   time.Time         `json:"checked_at"`
}

// ServiceStatus holds the status of a single system service.
type ServiceStatus struct {
	Name    string `json:"name"`
	Status  string `json:"status"` // healthy, degraded, down
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
}

// ResourceUsage holds system resource metrics.
type ResourceUsage struct {
	MemoryAllocatedMB  float64 `json:"memory_allocated_mb"`
	MemoryTotalMB      float64 `json:"memory_total_mb"`
	MemorySysMB        float64 `json:"memory_sys_mb"`
	HeapInUseMB        float64 `json:"heap_in_use_mb"`
	StackInUseMB       float64 `json:"stack_in_use_mb"`
	NextGCBytes        uint64  `json:"next_gc_bytes"`
	NumGC              uint32  `json:"num_gc"`
}



// ─── Handler ──────────────────────────────────────────────────────────

// OpsSystemHandler serves system health endpoints for the ops portal.
type OpsSystemHandler struct {
	store   domain.Store
	started time.Time
	logger  *slog.Logger
}

// NewOpsSystemHandler creates a new ops system handler.
func NewOpsSystemHandler(store domain.Store, logger *slog.Logger) *OpsSystemHandler {
	return &OpsSystemHandler{
		store:   store,
		started: time.Now(),
		logger:  logger,
	}
}

// Health handles GET /api/v1/ops/system/health
func (h *OpsSystemHandler) Health(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_system_health")

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	overall := "healthy"
	dbStatus := "healthy"
	var dbLatency time.Duration
	var dbErr error

	// Check database connectivity with a short timeout.
	dbCtx, dbCancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer dbCancel()

	dbStart := time.Now()
	// Health check: perform a lightweight database query.
	registry, ok := h.store.(domain.TenantRegistry)
	if ok {
		if _, _, err := registry.List(dbCtx, domain.TenantFilter{Limit: 1}); err != nil {
			dbStatus = "down"
			dbErr = err
			overall = "degraded"
			log.Warn("database health check failed", "error", err)
		}
	}
	dbLatency = time.Since(dbStart)

	services := []ServiceStatus{
		{
			Name:    "database",
			Status:  dbStatus,
			Latency: dbLatency.Round(time.Microsecond).String(),
		},
		{
			Name:   "api",
			Status: "healthy",
		},
	}

	if dbErr != nil {
		services[0].Message = dbErr.Error()
	}

	health := SystemHealth{
		Status:     overall,
		Uptime:     time.Since(h.started).Round(time.Second).String(),
		Version:    "unknown", // version.Version would be imported in real code
		GoVersion:  runtime.Version(),
		NumCPU:     runtime.NumCPU(),
		Goroutines: runtime.NumGoroutine(),
		Services:   services,
		Resources: ResourceUsage{
			MemoryAllocatedMB: float64(m.Alloc) / 1024 / 1024,
			MemoryTotalMB:     float64(m.TotalAlloc) / 1024 / 1024,
			MemorySysMB:       float64(m.Sys) / 1024 / 1024,
			HeapInUseMB:       float64(m.HeapInuse) / 1024 / 1024,
			StackInUseMB:      float64(m.StackInuse) / 1024 / 1024,
			NextGCBytes:       m.NextGC,
			NumGC:             m.NumGC,
		},
		CheckedAt: time.Now().UTC(),
	}

	statusCode := http.StatusOK
	if overall == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}
	if overall == "down" {
		statusCode = http.StatusServiceUnavailable
	}

	httputil.JSON(w, statusCode, health)
}

// Services handles GET /api/v1/ops/system/services — returns status of all system services.
func (h *OpsSystemHandler) Services(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_system_services")

	// Check database connectivity with a short timeout.
	dbCtx, dbCancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer dbCancel()

	dbStatus := "healthy"
	var dbLatency time.Duration
	var dbErr error

	dbStart := time.Now()
	registry, ok := h.store.(domain.TenantRegistry)
	if ok {
		if _, _, err := registry.List(dbCtx, domain.TenantFilter{Limit: 1}); err != nil {
			dbStatus = "down"
			dbErr = err
			log.Warn("database health check failed for services", "error", err)
		}
	}
	dbLatency = time.Since(dbStart)

	services := []ServiceStatus{
		{
			Name:    "database",
			Status:  dbStatus,
			Latency: dbLatency.Round(time.Microsecond).String(),
			Message: errorMessage(dbErr),
		},
		{
			Name:   "api",
			Status: "healthy",
		},
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"services":   services,
		"checked_at": time.Now().UTC(),
	})
}

// errorMessage returns the error string or empty if nil.
func errorMessage(err error) string {
	if err != nil {
		return err.Error()
	}
	return ""
}
