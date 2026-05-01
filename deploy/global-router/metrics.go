package main

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

// Metrics exposes Prometheus-compatible metrics for the global router.
// Uses atomic operations for counters and a mutex-protected histogram to
// avoid adding external dependencies while remaining goroutine-safe.
type Metrics struct {
	mu sync.Mutex

	// router_requests_total{method, host, status}
	requestsTotal map[string]int64

	// router_request_duration_seconds{method, host} — histogram buckets
	// Keyed by "method|host", stores per-bucket counts + sum
	requestDurations   map[string]*histogramBuckets
	requestDurationSum map[string]float64

	// router_rate_limited_total{host}
	rateLimitedTotal map[string]int64

	// router_waf_blocked_total{rule}
	wafBlockedTotal map[string]int64

	// router_active_connections (gauge)
	activeConnections int64
}

// histogramBuckets stores cumulative counts for each latency bucket.
type histogramBuckets struct {
	counts []int64          // aligned with defaultBuckets
	bounds []float64        // bucket upper bounds (seconds)
	sum    float64          // total sum of observed durations
	count  int64            // total observations
}

// defaultBuckets defines latency bucket boundaries in seconds.
// 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
var defaultBuckets = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10}

// NewMetrics creates a new Metrics instance.
func NewMetrics() *Metrics {
	return &Metrics{
		requestsTotal:      make(map[string]int64),
		requestDurations:   make(map[string]*histogramBuckets),
		requestDurationSum: make(map[string]float64),
		rateLimitedTotal:   make(map[string]int64),
		wafBlockedTotal:    make(map[string]int64),
	}
}

// ── Observation methods ─────────────────────────────────────────────

// ObserveRequest records a completed request (either served or blocked).
func (m *Metrics) ObserveRequest(method, host string, statusCode int, duration time.Duration) {
	statusLabel := strconv.Itoa(statusCode)

	// Increment requests counter atomically
	reqKey := fmt.Sprintf("%s|%s|%s", method, host, statusLabel)
	m.mu.Lock()
	m.requestsTotal[reqKey]++
	m.mu.Unlock()

	// Record duration in histogram
	durKey := fmt.Sprintf("%s|%s", method, host)
	durSec := duration.Seconds()
	m.mu.Lock()
	m.requestDurationSum[durKey] += durSec

	hb, ok := m.requestDurations[durKey]
	if !ok {
		hb = &histogramBuckets{
			counts: make([]int64, len(defaultBuckets)),
			bounds: defaultBuckets,
		}
		m.requestDurations[durKey] = hb
	}

	// Increment all buckets where the duration <= bucket bound
	for i, bound := range hb.bounds {
		if durSec <= bound {
			atomic.AddInt64(&hb.counts[i], 1)
		}
	}
	hb.sum += durSec
	hb.count++
	m.mu.Unlock()
}

// IncRateLimited increments the rate-limited counter for a host.
func (m *Metrics) IncRateLimited(host string) {
	m.mu.Lock()
	m.rateLimitedTotal[host]++
	m.mu.Unlock()
}

// IncWAFBlocked increments the WAF-blocked counter for a rule name.
func (m *Metrics) IncWAFBlocked(rule string) {
	m.mu.Lock()
	m.wafBlockedTotal[rule]++
	m.mu.Unlock()
}

// IncActiveConnections atomically increments the active connections gauge.
func (m *Metrics) IncActiveConnections() {
	atomic.AddInt64(&m.activeConnections, 1)
}

// DecActiveConnections atomically decrements the active connections gauge.
func (m *Metrics) DecActiveConnections() {
	atomic.AddInt64(&m.activeConnections, -1)
}

// ── HTTP handler ────────────────────────────────────────────────────

// MetricsHandler returns an http.Handler that serves metrics in Prometheus text format.
func (m *Metrics) MetricsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		m.writePrometheusText(w)
	})
}

// writePrometheusText writes all metrics in the standard Prometheus exposition format.
func (m *Metrics) writePrometheusText(w http.ResponseWriter) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// router_requests_total
	// Collect and sort keys for deterministic output
	type reqKey struct {
		method, host, status string
	}
	reqKeys := make([]reqKey, 0, len(m.requestsTotal))
	for k := range m.requestsTotal {
		parts := splitMetricsKey(k, 3)
		if len(parts) == 3 {
			reqKeys = append(reqKeys, reqKey{parts[0], parts[1], parts[2]})
		}
	}
	sort.Slice(reqKeys, func(i, j int) bool {
		if reqKeys[i].method != reqKeys[j].method {
			return reqKeys[i].method < reqKeys[j].method
		}
		if reqKeys[i].host != reqKeys[j].host {
			return reqKeys[i].host < reqKeys[j].host
		}
		return reqKeys[i].status < reqKeys[j].status
	})

	fmt.Fprintln(w, "# HELP router_requests_total Total number of HTTP requests.")
	fmt.Fprintln(w, "# TYPE router_requests_total counter")
	for _, rk := range reqKeys {
		key := fmt.Sprintf("%s|%s|%s", rk.method, rk.host, rk.status)
		fmt.Fprintf(w, "router_requests_total{method=\"%s\",host=\"%s\",status=\"%s\"} %d\n",
			rk.method, rk.host, rk.status, m.requestsTotal[key])
	}

	// router_request_duration_seconds histogram
	fmt.Fprintln(w, "# HELP router_request_duration_seconds Request latency in seconds.")
	fmt.Fprintln(w, "# TYPE router_request_duration_seconds histogram")
	durKeys := make([]string, 0, len(m.requestDurations))
	for k := range m.requestDurations {
		durKeys = append(durKeys, k)
	}
	sort.Strings(durKeys)
	for _, dk := range durKeys {
		hb := m.requestDurations[dk]
		parts := splitMetricsKey(dk, 2)
		if len(parts) != 2 {
			continue
		}
		method, host := parts[0], parts[1]
		labels := fmt.Sprintf("method=\"%s\",host=\"%s\"", method, host)

		for i, bound := range hb.bounds {
			fmt.Fprintf(w, "router_request_duration_seconds_bucket{%s,le=\"%s\"} %d\n",
				labels, formatFloat(bound), hb.counts[i])
		}
		fmt.Fprintf(w, "router_request_duration_seconds_bucket{%s,le=\"+Inf\"} %d\n",
			labels, hb.count)
		fmt.Fprintf(w, "router_request_duration_seconds_sum{%s} %s\n",
			labels, formatFloat(hb.sum))
		fmt.Fprintf(w, "router_request_duration_seconds_count{%s} %d\n",
			labels, hb.count)
	}

	// router_rate_limited_total
	fmt.Fprintln(w, "# HELP router_rate_limited_total Total number of rate-limited requests.")
	fmt.Fprintln(w, "# TYPE router_rate_limited_total counter")
	rlKeys := make([]string, 0, len(m.rateLimitedTotal))
	for k := range m.rateLimitedTotal {
		rlKeys = append(rlKeys, k)
	}
	sort.Strings(rlKeys)
	for _, host := range rlKeys {
		fmt.Fprintf(w, "router_rate_limited_total{host=\"%s\"} %d\n",
			host, m.rateLimitedTotal[host])
	}

	// router_waf_blocked_total
	fmt.Fprintln(w, "# HELP router_waf_blocked_total Total number of WAF-blocked requests.")
	fmt.Fprintln(w, "# TYPE router_waf_blocked_total counter")
	wafKeys := make([]string, 0, len(m.wafBlockedTotal))
	for k := range m.wafBlockedTotal {
		wafKeys = append(wafKeys, k)
	}
	sort.Strings(wafKeys)
	for _, rule := range wafKeys {
		fmt.Fprintf(w, "router_waf_blocked_total{rule=\"%s\"} %d\n",
			rule, m.wafBlockedTotal[rule])
	}

	// router_active_connections (gauge)
	fmt.Fprintln(w, "# HELP router_active_connections Current number of active connections.")
	fmt.Fprintln(w, "# TYPE router_active_connections gauge")
	fmt.Fprintf(w, "router_active_connections %d\n", atomic.LoadInt64(&m.activeConnections))
}

// splitMetricsKey splits a pipe-delimited key into n parts.
func splitMetricsKey(key string, n int) []string {
	parts := make([]string, 0, n)
	start := 0
	for i := 0; i < n-1 && start < len(key); i++ {
		end := start
		for end < len(key) && key[end] != '|' {
			end++
		}
		parts = append(parts, key[start:end])
		start = end + 1 // skip the pipe
	}
	if start <= len(key) {
		parts = append(parts, key[start:])
	}
	return parts
}

// formatFloat formats a float64 for Prometheus exposition format,
// ensuring finite values are safely represented.
func formatFloat(v float64) string {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return "0"
	}
	// Use standard formatting; for very small numbers fall back to scientific
	if v < 0.000001 && v > -0.000001 && v != 0 {
		return fmt.Sprintf("%e", v)
	}
	return fmt.Sprintf("%g", v)
}
