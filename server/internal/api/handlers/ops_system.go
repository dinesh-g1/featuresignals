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

// ─── Interfaces ──────────────────────────────────────────────────────

// Pinger is the minimal interface for health-checking a backing service.
// Both *redis.Client and test mocks satisfy this interface.
type Pinger interface {
	Ping(ctx context.Context) error
}

// ─── Domain Types ─────────────────────────────────────────────────────

// SystemHealth holds the overall system health information for the ops portal.
type SystemHealth struct {
	Status      string          `json:"status"` // healthy, degraded, down
	Uptime      string          `json:"uptime"`
	Version     string          `json:"version,omitempty"`
	GoVersion   string          `json:"go_version,omitempty"`
	NumCPU      int             `json:"num_cpu"`
	Goroutines  int             `json:"goroutines"`
	Services    []ServiceStatus `json:"services"`
	Resources   ResourceUsage   `json:"resource_usage"`
	CheckedAt   time.Time       `json:"checked_at"`
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
	store       domain.Store
	redisClient Pinger
	started     time.Time
	logger      *slog.Logger
}

// NewOpsSystemHandler creates a new ops system handler.
// Pass nil for redisClient if Redis is not configured.
func NewOpsSystemHandler(store domain.Store, redisClient Pinger, logger *slog.Logger) *OpsSystemHandler {
	return &OpsSystemHandler{
		store:       store,
		redisClient: redisClient,
		started:     time.Now(),
		logger:      logger,
	}
}

// Health handles GET /api/v1/ops/system/health
func (h *OpsSystemHandler) Health(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_system_health")
	ctx := r.Context()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	health := struct {
		Status   string `json:"status"`
		Database string `json:"database"`
		Redis    string `json:"redis,omitempty"`
		Cells    struct {
			Total        int `json:"total"`
			Healthy      int `json:"healthy"`
			Degraded     int `json:"degraded"`
			Down         int `json:"down"`
			Provisioning int `json:"provisioning"`
		} `json:"cells"`
		Uptime     string        `json:"uptime"`
		Version    string        `json:"version,omitempty"`
		GoVersion  string        `json:"go_version,omitempty"`
		NumCPU     int           `json:"num_cpu"`
		Goroutines int           `json:"goroutines"`
		Resources  ResourceUsage `json:"resource_usage"`
		CheckedAt  time.Time     `json:"checked_at"`
	}{
		GoVersion:  runtime.Version(),
		NumCPU:     runtime.NumCPU(),
		Goroutines: runtime.NumGoroutine(),
		Uptime:     time.Since(h.started).Round(time.Second).String(),
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

	// Check database via lightweight query.
	dbCtx, dbCancel := context.WithTimeout(ctx, 2*time.Second)
	defer dbCancel()

	if registry, ok := h.store.(domain.TenantRegistry); ok {
		if _, _, err := registry.List(dbCtx, domain.TenantFilter{Limit: 1}); err != nil {
			health.Database = "unhealthy"
			health.Status = "degraded"
			logger.Error("database health check failed", "error", err)
		} else {
			health.Database = "healthy"
		}
	} else {
		health.Database = "healthy"
	}

	// Check Redis (optional)
	if h.redisClient != nil {
		if err := h.redisClient.Ping(ctx); err != nil {
			health.Redis = "unhealthy"
			if health.Status == "" {
				health.Status = "degraded"
			}
		} else {
			health.Redis = "healthy"
		}
	}

	// Get cell health counts
	cells, err := h.store.ListCells(ctx, domain.CellFilter{Limit: 1000})
	if err != nil {
		logger.Error("failed to list cells for health", "error", err)
	} else {
		health.Cells.Total = len(cells)
		for _, c := range cells {
			switch c.Status {
			case "running":
				health.Cells.Healthy++
			case "degraded":
				health.Cells.Degraded++
			case "down", "failed":
				health.Cells.Down++
			case "provisioning", "draining":
				health.Cells.Provisioning++
			default:
				health.Cells.Down++
			}
		}
	}

	if health.Status == "" {
		health.Status = "healthy"
	}

	statusCode := http.StatusOK
	if health.Status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	httputil.JSON(w, statusCode, health)
}

// Services handles GET /api/v1/ops/system/services — returns status of all system services.
func (h *OpsSystemHandler) Services(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	services := []struct {
		Name   string `json:"name"`
		Status string `json:"status"`
		Detail string `json:"detail,omitempty"`
	}{}

	// Database
	dbCtx, dbCancel := context.WithTimeout(ctx, 2*time.Second)
	defer dbCancel()

	if registry, ok := h.store.(domain.TenantRegistry); ok {
		if _, _, err := registry.List(dbCtx, domain.TenantFilter{Limit: 1}); err != nil {
			services = append(services, struct {
				Name   string `json:"name"`
				Status string `json:"status"`
				Detail string `json:"detail,omitempty"`
			}{Name: "postgresql", Status: "unhealthy", Detail: err.Error()})
		} else {
			services = append(services, struct {
				Name   string `json:"name"`
				Status string `json:"status"`
				Detail string `json:"detail,omitempty"`
			}{Name: "postgresql", Status: "healthy"})
		}
	} else {
		services = append(services, struct {
			Name   string `json:"name"`
			Status string `json:"status"`
			Detail string `json:"detail,omitempty"`
		}{Name: "postgresql", Status: "healthy"})
	}

	// Redis (optional)
	if h.redisClient != nil {
		if err := h.redisClient.Ping(ctx); err != nil {
			services = append(services, struct {
				Name   string `json:"name"`
				Status string `json:"status"`
				Detail string `json:"detail,omitempty"`
			}{Name: "redis", Status: "unhealthy", Detail: err.Error()})
		} else {
			services = append(services, struct {
				Name   string `json:"name"`
				Status string `json:"status"`
				Detail string `json:"detail,omitempty"`
			}{Name: "redis", Status: "healthy"})
		}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"services":   services,
		"checked_at": time.Now().UTC(),
	})
}

// AutoscalerStatus handles GET /api/v1/ops/autoscaler/status
func (h *OpsSystemHandler) AutoscalerStatus(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_autoscaler_status")

	cells, err := h.store.ListCells(r.Context(), domain.CellFilter{Limit: 1000})
	if err != nil {
		logger.Error("failed to list cells for autoscaler status", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	type cellAutoscaleInfo struct {
		CellID      string  `json:"cell_id"`
		Name        string  `json:"name"`
		Region      string  `json:"region"`
		Status      string  `json:"status"`
		TenantCount int     `json:"tenant_count"`
		CPUPercent  float64 `json:"cpu_percent"`
		MemPercent  float64 `json:"mem_percent"`
	}

	autoscalerInfo := struct {
		Status  string              `json:"status"`
		Cells   []cellAutoscaleInfo `json:"cells"`
		Summary struct {
			TotalCells   int `json:"total_cells"`
			RunningCells int `json:"running_cells"`
			Overloaded   int `json:"overloaded"`
			Underloaded  int `json:"underloaded"`
		} `json:"summary"`
		CheckedAt string `json:"checked_at"`
	}{
		Status:    "ok",
		Cells:     make([]cellAutoscaleInfo, 0, len(cells)),
		CheckedAt: time.Now().UTC().Format(time.RFC3339),
	}

	for _, c := range cells {
		cpuPercent := c.CPU.Percent
		memPercent := c.Memory.Percent
		autoscalerInfo.Cells = append(autoscalerInfo.Cells, cellAutoscaleInfo{
			CellID:      c.ID,
			Name:        c.Name,
			Region:      c.Region,
			Status:      c.Status,
			TenantCount: c.TenantCount,
			CPUPercent:  cpuPercent,
			MemPercent:  memPercent,
		})
		autoscalerInfo.Summary.TotalCells++

		if c.Status == "running" {
			autoscalerInfo.Summary.RunningCells++
		}
		if cpuPercent > 80 || memPercent > 80 {
			autoscalerInfo.Summary.Overloaded++
		} else if cpuPercent < 20 && memPercent < 20 && c.Status == "running" {
			autoscalerInfo.Summary.Underloaded++
		}
	}

	if autoscalerInfo.Summary.Overloaded > 0 {
		autoscalerInfo.Status = "attention_required"
	}

	httputil.JSON(w, http.StatusOK, autoscalerInfo)
}