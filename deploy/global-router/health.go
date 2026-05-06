package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type HealthResponse struct {
	Status       string                         `json:"status"`
	Cluster      string                         `json:"cluster"`
	Version      string                         `json:"version"`
	Uptime       int64                          `json:"uptime"`
	Services     map[string]string              `json:"services"`
	Circuits     map[string]string              `json:"circuits,omitempty"`
}

var version = "v1.5.0"

func (r *Router) HealthHandler(w http.ResponseWriter, req *http.Request) {
	services := make(map[string]string)

	// Check each proxy target
	for _, d := range r.config.Router.Domains {
		if d.Type == "proxy" {
			services[d.Name] = r.checkService(d.Target)
		}
	}

	overall := "ok"
	for _, status := range services {
		if status == "down" || status == "degraded" {
			overall = "degraded"
			break
		}
	}

	// Collect circuit breaker states
	circuits := make(map[string]string)
	for target, cb := range r.circuitBreakers {
		if cb != nil {
			circuits[target] = cb.State().String()
			if cb.State() == circuitOpen {
				overall = "degraded"
			}
		}
	}

	resp := HealthResponse{
		Status:   overall,
		Cluster:  r.config.Router.Cluster.Name,
		Version:  version,
		Uptime:   int64(time.Since(r.startTime).Seconds()),
		Services: services,
		Circuits: circuits,
	}

	w.Header().Set("Content-Type", "application/json")
	if overall != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(resp)
}

func (r *Router) checkService(target string) string {
	client := &http.Client{
		Timeout: 2 * time.Second,
	}

	// Try to connect to the service
	resp, err := client.Get(fmt.Sprintf("%s/health", target))
	if err != nil {
		slog.Warn("health check failed", "target", target, "error", err)
		return "down"
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return "ok"
	}
	return "degraded"
}