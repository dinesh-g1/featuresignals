package status

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
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

// CacheHealth reports the health of the in-memory evaluation cache.
type CacheHealth interface {
	IsListening() bool
	RulesetCount() int
}

// SSEHealth reports the health of the real-time streaming server.
type SSEHealth interface {
	TotalClientCount() int
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
	store      domain.StatusRecorder
	region     string
	regionName string
	cache      CacheHealth // optional, nil-safe
	sse        SSEHealth   // optional, nil-safe
}

// NewHandler creates a status handler for the current region.
func NewHandler(db HealthChecker, poolStats PoolStats, region string, store domain.StatusRecorder, cache CacheHealth, sse SSEHealth) *Handler {
	name := region
	if info, ok := domain.Regions[region]; ok {
		name = info.Name
	}
	return &Handler{db: db, poolStats: poolStats, region: region, regionName: name, store: store, cache: cache, sse: sse}
}

// HandleLocalStatus returns the health of the current region's services.
func (h *Handler) HandleLocalStatus(w http.ResponseWriter, r *http.Request) {
	status := h.checkLocal(r.Context())
	httputil.JSON(w, http.StatusOK, status)
}

// HandleGlobalStatus aggregates health from all regions.
func (h *Handler) HandleGlobalStatus(w http.ResponseWriter, r *http.Request) {
	gs := h.CheckAllRegions(r.Context())
	httputil.JSON(w, http.StatusOK, gs)
}

// CheckAllRegions probes all regions and returns the aggregated status.
// Exported for reuse by the background status recorder.
func (h *Handler) CheckAllRegions(ctx context.Context) GlobalStatus {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
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
		if rs.Status == "unreachable" {
			continue
		}
		if rs.Status == "down" {
			overall = "partial_outage"
			break
		}
		if rs.Status == "degraded" && overall == "operational" {
			overall = "degraded"
		}
	}

	return GlobalStatus{
		OverallStatus: overall,
		Regions:       regions,
		CheckedAt:     time.Now().UTC(),
	}
}

// HandleStatusHistory returns per-component, per-region uptime history.
func (h *Handler) HandleStatusHistory(w http.ResponseWriter, r *http.Request) {
	logger := slog.Default().With("handler", "status_history")

	daysStr := r.URL.Query().Get("days")
	days := 90
	if daysStr != "" {
		parsed, err := strconv.Atoi(daysStr)
		if err != nil || parsed < 1 || parsed > 90 {
			httputil.Error(w, http.StatusBadRequest, "days must be between 1 and 90")
			return
		}
		days = parsed
	}

	history, err := h.store.GetComponentHistory(r.Context(), days)
	if err != nil {
		logger.Error("failed to get component history", "error", err, "days", days)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if history == nil {
		history = []domain.DailyComponentStatus{}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"components": history,
		"regions":    domain.RegionCodes(),
		"checked_at": time.Now().UTC(),
	})
}

// RegionSLA contains computed SLA metrics for a single region.
type RegionSLA struct {
	Region       string  `json:"region"`
	Name         string  `json:"name"`
	UptimePct    float64 `json:"uptime_pct"`
	DaysTracked  int     `json:"days_tracked"`
	CurrentStreak int    `json:"current_streak_days"`
}

// HandleSLA computes uptime SLA metrics per region over a given period.
func (h *Handler) HandleSLA(w http.ResponseWriter, r *http.Request) {
	logger := slog.Default().With("handler", "status_sla")

	daysStr := r.URL.Query().Get("days")
	days := 90
	if daysStr != "" {
		parsed, err := strconv.Atoi(daysStr)
		if err != nil || parsed < 1 || parsed > 365 {
			httputil.Error(w, http.StatusBadRequest, "days must be between 1 and 365")
			return
		}
		days = parsed
	}

	history, err := h.store.GetComponentHistory(r.Context(), days)
	if err != nil {
		logger.Error("failed to get component history for SLA", "error", err, "days", days)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	type regionAgg struct {
		totalChecks       int
		operationalChecks int
		dates             map[string]bool // all dates with data
		streak            int
	}

	regions := make(map[string]*regionAgg)
	for _, code := range domain.RegionCodes() {
		regions[code] = &regionAgg{dates: make(map[string]bool)}
	}

	for _, entry := range history {
		agg, ok := regions[entry.Region]
		if !ok {
			continue
		}
		agg.totalChecks += entry.TotalChecks
		agg.operationalChecks += entry.OperationalChecks
		agg.dates[entry.Date] = entry.UptimePct >= 100.0
	}

	// Compute current streak (consecutive days at 100% uptime, most recent first)
	for _, agg := range regions {
		streak := 0
		for i := 0; i < days; i++ {
			date := time.Now().UTC().AddDate(0, 0, -i).Format("2006-01-02")
			if operational, exists := agg.dates[date]; exists && operational {
				streak++
			} else if _, exists := agg.dates[date]; exists {
				break
			}
		}
		agg.streak = streak
	}

	result := make([]RegionSLA, 0, len(regions))
	for _, code := range domain.RegionCodes() {
		agg := regions[code]
		info := domain.Regions[code]
		uptimePct := 100.0
		if agg.totalChecks > 0 {
			uptimePct = float64(agg.operationalChecks) / float64(agg.totalChecks) * 100.0
		}
		result = append(result, RegionSLA{
			Region:        code,
			Name:          info.Name,
			UptimePct:     uptimePct,
			DaysTracked:   len(agg.dates),
			CurrentStreak: agg.streak,
		})
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"sla":        result,
		"period_days": days,
		"checked_at": time.Now().UTC(),
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

	// Flag Evaluation Engine: run a synthetic eval to prove the hot path works.
	evalStart := time.Now()
	syntheticRuleset := &domain.Ruleset{
		Flags:    map[string]*domain.Flag{"_health": {Key: "_health", Name: "health", FlagType: "boolean"}},
		States:   map[string]*domain.FlagState{"_health": {Enabled: true}},
		Segments: map[string]*domain.Segment{},
	}
	eval.NewEngine().Evaluate("_health", domain.EvalContext{}, syntheticRuleset)
	evalLatency := time.Since(evalStart)
	services = append(services, ServiceStatus{
		Name:    "Flag Evaluation Engine",
		Status:  "operational",
		Latency: evalLatency.Milliseconds(),
	})

	if h.cache != nil {
		cacheStatus := "operational"
		cacheMsg := fmt.Sprintf("%d environments cached", h.cache.RulesetCount())
		if !h.cache.IsListening() {
			cacheStatus = "degraded"
			cacheMsg = "PG LISTEN inactive"
		}
		services = append(services, ServiceStatus{
			Name:    "Cache",
			Status:  cacheStatus,
			Message: cacheMsg,
		})
	}

	if h.sse != nil {
		services = append(services, ServiceStatus{
			Name:    "Real-time Streaming",
			Status:  "operational",
			Message: fmt.Sprintf("%d SDK clients connected", h.sse.TotalClientCount()),
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

// isUnreachableError distinguishes "not yet deployed" (connection refused, DNS failure)
// from "deployed but failing" (timeout, HTTP errors).
func isUnreachableError(err error) bool {
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		if errors.Is(opErr.Err, syscall.ECONNREFUSED) {
			return true
		}
		var dnsErr *net.DNSError
		if errors.As(opErr.Err, &dnsErr) {
			return true
		}
	}
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return true
	}
	return false
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
		status := "down"
		if isUnreachableError(err) {
			status = "unreachable"
		}
		return RegionStatus{
			Region:    regionCode,
			Name:      info.Name,
			Status:    status,
			Services:  []ServiceStatus{{Name: "API Server", Status: status, Latency: latency, Message: status}},
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
