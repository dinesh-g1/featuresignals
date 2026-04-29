package testcluster

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

// Server simulates a cluster's /ops/ endpoints.
type Server struct {
	srv     *http.Server
	config  map[string]interface{}
	metrics map[string]interface{}
	mu      sync.RWMutex
	token   string
	health  string
	port    int
}

// New creates a test cluster server on a random available port.
func New() (*Server, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("listen: %w", err)
	}

	s := &Server{
		token:  "test-cluster-token-abc123",
		health: "ok",
		config: map[string]interface{}{
			"log_level":       "info",
			"max_connections": 100,
			"rate_limits": map[string]interface{}{
				"api_per_min":  1000,
				"auth_per_min": 20,
			},
		},
		metrics: map[string]interface{}{
			"cpu":    42.5,
			"memory": 68.2,
			"disk":   55.0,
		},
		port: listener.Addr().(*net.TCPAddr).Port,
	}

	mux := http.NewServeMux()

	// GET /ops/health
	mux.HandleFunc("/ops/health", func(w http.ResponseWriter, r *http.Request) {
		// Auth is optional for health
		if auth := r.Header.Get("Authorization"); auth != "" {
			if auth != "Bearer "+s.token {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
		}

		s.mu.RLock()
		health := s.health
		s.mu.RUnlock()

		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  health,
			"cluster": "test-cluster",
			"version": "abc1234",
			"uptime":  3600,
			"services": map[string]string{
				"server":    "ok",
				"dashboard": "ok",
				"router":    "ok",
				"database":  "ok",
			},
		})
	})

	// GET /ops/config
	mux.HandleFunc("/ops/config", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			if r.Header.Get("Authorization") != "Bearer "+s.token {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			s.mu.RLock()
			config := s.config
			s.mu.RUnlock()

			json.NewEncoder(w).Encode(config)
		} else if r.Method == http.MethodPost {
			if r.Header.Get("Authorization") != "Bearer "+s.token {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			var updates map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
				http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
				return
			}

			s.mu.Lock()
			for k, v := range updates {
				s.config[k] = v
			}
			s.mu.Unlock()

			s.mu.RLock()
			json.NewEncoder(w).Encode(s.config)
			s.mu.RUnlock()
		}
	})

	// GET /ops/metrics
	mux.HandleFunc("/ops/metrics", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+s.token {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		// Slight randomization each call
		s.mu.Lock()
		s.metrics["cpu"] = 42.0 + float64(time.Now().UnixNano()%100)/100.0
		s.metrics["memory"] = 68.0 + float64(time.Now().UnixNano()%50)/100.0
		s.metrics["disk"] = 55.0 + float64(time.Now().UnixNano()%30)/100.0
		metrics := make(map[string]interface{})
		for k, v := range s.metrics {
			metrics[k] = v
		}
		s.mu.Unlock()

		json.NewEncoder(w).Encode(metrics)
	})

	s.srv = &http.Server{
		Handler: mux,
	}

	go s.srv.Serve(listener)

	// Print port to stdout so test scripts can capture it
	go func() {
		time.Sleep(100 * time.Millisecond)
		fmt.Printf("TESTCLUSTER_PORT:%s\n", fmt.Sprintf("%d", s.port))
	}()

	return s, nil
}

// Port returns the port the server is listening on.
func (s *Server) Port() int {
	return s.port
}

// PublicIP returns the address for cluster registration.
func (s *Server) PublicIP() string {
	return fmt.Sprintf("127.0.0.1:%d", s.port)
}

// APIToken returns the token for cluster registration.
func (s *Server) APIToken() string {
	return s.token
}

// Close shuts down the server.
func (s *Server) Close() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return s.srv.Shutdown(ctx)
}

// SetHealth allows tests to simulate health changes.
func (s *Server) SetHealth(status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.health = status
}

// GetConfig returns the current config (for test assertions).
func (s *Server) GetConfig() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make(map[string]interface{})
	for k, v := range s.config {
		result[k] = v
	}
	return result
}