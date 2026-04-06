package status

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// HealthChecker verifies the health of a backing resource.
type HealthChecker interface {
	Ping(ctx context.Context) error
}

// PoolStats provides connection pool statistics.
type PoolStats interface {
	AcquiredConns() int32
	MaxConns() int32
}

// ServiceStatus represents the health of a single service component.
type ServiceStatus struct {
	Name    string `json:"name"`
	Status  string `json:"status"`
	Latency int64  `json:"latency_ms"`
	Message string `json:"message,omitempty"`
}

// RegionStatus represents the health of a single region.
type RegionStatus struct {
	Region    string          `json:"region"`
	Name      string          `json:"name"`
	Status    string          `json:"status"`
	Services  []ServiceStatus `json:"services"`
	CheckedAt time.Time       `json:"checked_at"`
}

// GlobalStatus is the aggregated status across all regions.
type GlobalStatus struct {
	OverallStatus string         `json:"overall_status"`
	Regions       []RegionStatus `json:"regions"`
	CheckedAt     time.Time      `json:"checked_at"`
}

// Handler serves status endpoints.
type Handler struct {
	db         HealthChecker
	poolStats  PoolStats
	region     string
	regionName string
}

// NewHandler creates a status handler for the current region.
func NewHandler(db HealthChecker, poolStats PoolStats, region string) *Handler {
	name := region
	if info, ok := domain.Regions[region]; ok {
		name = info.Name
	}
	return &Handler{db: db, poolStats: poolStats, region: region, regionName: name}
}

// HandleLocalStatus returns the health of the current region's services.
func (h *Handler) HandleLocalStatus(w http.ResponseWriter, r *http.Request) {
	status := h.checkLocal(r.Context())
	httputil.JSON(w, http.StatusOK, status)
}

// HandleGlobalStatus aggregates health from all regions by calling their /v1/status endpoints.
func (h *Handler) HandleGlobalStatus(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var mu sync.Mutex
	var wg sync.WaitGroup
	regions := make([]RegionStatus, 0, len(domain.Regions))

	for _, code := range domain.RegionCodes() {
		info := domain.Regions[code]
		if code == h.region {
			local := h.checkLocal(ctx)
			mu.Lock()
			regions = append(regions, local)
			mu.Unlock()
			continue
		}

		wg.Add(1)
		go func(regionCode string, regionInfo domain.RegionInfo) {
			defer wg.Done()
			rs := probeRemoteRegion(ctx, regionCode, regionInfo)
			mu.Lock()
			regions = append(regions, rs)
			mu.Unlock()
		}(code, info)
	}

	wg.Wait()

	overall := "operational"
	for _, rs := range regions {
		if rs.Status == "down" {
			overall = "partial_outage"
			break
		}
		if rs.Status == "degraded" && overall == "operational" {
			overall = "degraded"
		}
	}

	httputil.JSON(w, http.StatusOK, GlobalStatus{
		OverallStatus: overall,
		Regions:       regions,
		CheckedAt:     time.Now().UTC(),
	})
}

func (h *Handler) checkLocal(ctx context.Context) RegionStatus {
	services := make([]ServiceStatus, 0, 3)

	services = append(services, ServiceStatus{
		Name:   "API Server",
		Status: "operational",
	})

	dbStart := time.Now()
	var dbStatus, dbMsg string
	if err := h.db.Ping(ctx); err != nil {
		dbStatus = "down"
		dbMsg = "connection failed"
	} else {
		dbStatus = "operational"
	}
	services = append(services, ServiceStatus{
		Name:    "Database",
		Status:  dbStatus,
		Latency: time.Since(dbStart).Milliseconds(),
		Message: dbMsg,
	})

	if h.poolStats != nil {
		poolStatus := "operational"
		poolMsg := ""
		acquired := h.poolStats.AcquiredConns()
		maxC := h.poolStats.MaxConns()
		if maxC > 0 && acquired > int32(float64(maxC)*0.9) {
			poolStatus = "degraded"
			poolMsg = "connection pool near capacity"
		}
		services = append(services, ServiceStatus{
			Name:    "Connection Pool",
			Status:  poolStatus,
			Message: poolMsg,
		})
	}

	regionStatus := "operational"
	for _, svc := range services {
		if svc.Status == "down" {
			regionStatus = "down"
			break
		}
		if svc.Status == "degraded" {
			regionStatus = "degraded"
		}
	}

	return RegionStatus{
		Region:    h.region,
		Name:      h.regionName,
		Status:    regionStatus,
		Services:  services,
		CheckedAt: time.Now().UTC(),
	}
}

func probeRemoteRegion(ctx context.Context, regionCode string, info domain.RegionInfo) RegionStatus {
	healthURL := info.APIEndpoint + "/health"

	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		return RegionStatus{
			Region:    regionCode,
			Name:      info.Name,
			Status:    "unknown",
			Services:  []ServiceStatus{{Name: "API Server", Status: "unknown", Message: "request build failed"}},
			CheckedAt: time.Now().UTC(),
		}
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return RegionStatus{
			Region:    regionCode,
			Name:      info.Name,
			Status:    "down",
			Services:  []ServiceStatus{{Name: "API Server", Status: "down", Latency: latency, Message: "unreachable"}},
			CheckedAt: time.Now().UTC(),
		}
	}
	defer resp.Body.Close()

	apiStatus := "operational"
	if resp.StatusCode != http.StatusOK {
		apiStatus = "degraded"
	}

	statusURL := info.APIEndpoint + "/v1/status"
	statusReq, err := http.NewRequestWithContext(ctx, http.MethodGet, statusURL, nil)
	if err != nil {
		return RegionStatus{
			Region:    regionCode,
			Name:      info.Name,
			Status:    apiStatus,
			Services:  []ServiceStatus{{Name: "API Server", Status: apiStatus, Latency: latency}},
			CheckedAt: time.Now().UTC(),
		}
	}

	statusResp, err := client.Do(statusReq)
	if err == nil && statusResp.StatusCode == http.StatusOK {
		defer statusResp.Body.Close()
		var remote RegionStatus
		if json.NewDecoder(statusResp.Body).Decode(&remote) == nil {
			return remote
		}
	}
	if statusResp != nil {
		statusResp.Body.Close()
	}

	return RegionStatus{
		Region:    regionCode,
		Name:      info.Name,
		Status:    apiStatus,
		Services:  []ServiceStatus{{Name: "API Server", Status: apiStatus, Latency: latency}},
		CheckedAt: time.Now().UTC(),
	}
}
