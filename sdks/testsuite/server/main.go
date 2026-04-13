// Package main provides a minimal test server for FSAutoResearch SDK conformance testing.
//
// Usage:
//
//	go run main.go
//
// The server starts on http://localhost:8181 and exposes predefined feature flags
// for SDK testing, including boolean, string, number, JSON, A/B, targeting,
// and percentage rollout flags.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	defaultPort = "8181"
	validEnvKey = "test-env-key"
)

// Flag definitions.

type Flag struct {
	Key               string          `json:"key"`
	Type              string          `json:"type"`
	Enabled           bool            `json:"enabled"`
	DefaultValue      any             `json:"default_value"`
	Rules             []TargetingRule `json:"rules,omitempty"`
	Variants          []Variant       `json:"variants,omitempty"`
	PercentageRollout int             `json:"percentage_rollout,omitempty"`
}

type TargetingRule struct {
	Attribute string `json:"attribute"`
	Operator  string `json:"operator"`
	Value     any    `json:"value"`
	Return    any    `json:"return"`
}

type Variant struct {
	Key    string `json:"key"`
	Value  any    `json:"value"`
	Weight int    `json:"weight"`
}

// Evaluation request for POST /api/evaluate and POST /api/evaluate/bulk.

type EvaluateRequest struct {
	FlagKey      string      `json:"flag_key"`
	DefaultValue any         `json:"default_value"`
	Context      EvalContext `json:"context,omitempty"`
}

type BulkEvaluateRequest struct {
	Requests []EvaluateRequest `json:"requests"`
	Context  EvalContext       `json:"context,omitempty"`
}

type EvalContext struct {
	UserKey    string            `json:"user_key"`
	Attributes map[string]string `json:"attributes,omitempty"`
}

type EvaluateResponse struct {
	FlagKey string `json:"flag_key"`
	Value   any    `json:"value"`
	Reason  string `json:"reason"`
}

// Track request for POST /api/track.

type TrackRequest struct {
	FlagKey   string    `json:"flag_key"`
	UserKey   string    `json:"user_key"`
	Value     any       `json:"value"`
	Timestamp time.Time `json:"timestamp"`
}

type TrackResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// In-memory flag store (mutable for real-time testing).

var (
	flagStore = map[string]Flag{
		"test-boolean": {
			Key:          "test-boolean",
			Type:         "boolean",
			Enabled:      true,
			DefaultValue: false,
		},
		"test-string": {
			Key:          "test-string",
			Type:         "string",
			Enabled:      true,
			DefaultValue: "hello",
			Rules: []TargetingRule{
				{
					Attribute: "email",
					Operator:  "contains",
					Value:     "@example.com",
					Return:    "targeted-value",
				},
			},
		},
		"test-number": {
			Key:          "test-number",
			Type:         "number",
			Enabled:      true,
			DefaultValue: float64(42),
		},
		"test-json": {
			Key:          "test-json",
			Type:         "json",
			Enabled:      true,
			DefaultValue: map[string]string{"theme": "dark"},
		},
		"test-ab": {
			Key:     "test-ab",
			Type:    "ab",
			Enabled: true,
			Variants: []Variant{
				{Key: "control", Value: "A", Weight: 5000},
				{Key: "variant", Value: "B", Weight: 5000},
			},
		},
		"test-percentage": {
			Key:               "test-percentage",
			Type:              "boolean",
			Enabled:           true,
			DefaultValue:      false,
			PercentageRollout: 5000,
		},
		"test-disabled": {
			Key:          "test-disabled",
			Type:         "boolean",
			Enabled:      false,
			DefaultValue: false,
		},
	}
	flagStoreMu sync.RWMutex

	// SSE client tracking.
	sseClients   = make(map[chan string]bool)
	sseClientsMu sync.Mutex
)

// murmurHash32 provides a simple deterministic hash for percentage rollout.
func murmurHash32(key string) uint32 {
	var h uint32 = 0x9747b28c
	for i := 0; i < len(key); i++ {
		h ^= uint32(key[i])
		h = (h << 13) | (h >> 19)
		h = h*5 + 0xe6546b64
	}
	return h
}

// getABVariant returns the variant for a given user key.
func getABVariant(variants []Variant, userKey string) any {
	if len(variants) == 0 || userKey == "" {
		return nil
	}
	hash := murmurHash32(userKey)
	bucket := int(hash % 10000)
	cumulative := 0
	for _, v := range variants {
		cumulative += v.Weight
		if bucket < cumulative {
			return v.Value
		}
	}
	return variants[len(variants)-1].Value
}

// isInPercentageRollout determines if a user key falls within the rollout.
func isInPercentageRollout(userKey string, percentage int) bool {
	if percentage <= 0 {
		return false
	}
	if percentage >= 10000 {
		return true
	}
	hash := murmurHash32(userKey)
	bucket := int(hash % 10000)
	return bucket < percentage
}

// evaluateFlag evaluates a single flag for a given context.
func evaluateFlag(flag Flag, req EvaluateRequest) EvaluateResponse {
	// Disabled flag returns default.
	if !flag.Enabled {
		return EvaluateResponse{
			FlagKey: flag.Key,
			Value:   req.DefaultValue,
			Reason:  "disabled",
		}
	}

	ctx := req.Context

	// Check targeting rules.
	for _, rule := range flag.Rules {
		if attrVal, ok := ctx.Attributes[rule.Attribute]; ok {
			if matchesRule(attrVal, rule.Operator, rule.Value) {
				return EvaluateResponse{
					FlagKey: flag.Key,
					Value:   rule.Return,
					Reason:  "rule_match",
				}
			}
		}
	}

	// A/B test.
	if flag.Type == "ab" && len(flag.Variants) > 0 {
		variant := getABVariant(flag.Variants, ctx.UserKey)
		return EvaluateResponse{
			FlagKey: flag.Key,
			Value:   variant,
			Reason:  "ab_test",
		}
	}

	// Percentage rollout.
	if flag.PercentageRollout > 0 {
		userKey := ctx.UserKey
		if userKey == "" {
			userKey = fmt.Sprintf("anon-%d", time.Now().UnixNano())
		}
		inRollout := isInPercentageRollout(userKey, flag.PercentageRollout)
		if inRollout {
			return EvaluateResponse{
				FlagKey: flag.Key,
				Value:   true,
				Reason:  "rollout",
			}
		}
		return EvaluateResponse{
			FlagKey: flag.Key,
			Value:   flag.DefaultValue,
			Reason:  "rollout_miss",
		}
	}

	// Default value.
	return EvaluateResponse{
		FlagKey: flag.Key,
		Value:   flag.DefaultValue,
		Reason:  "default",
	}
}

func matchesRule(actual, operator string, expected any) bool {
	expectedStr := fmt.Sprintf("%v", expected)
	switch operator {
	case "contains":
		return strings.Contains(actual, expectedStr)
	case "equals":
		return actual == expectedStr
	case "starts_with":
		return strings.HasPrefix(actual, expectedStr)
	case "ends_with":
		return strings.HasSuffix(actual, expectedStr)
	default:
		return false
	}
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("error writing JSON response: %v", err)
	}
}

// validateEnvKey checks the environment key from the URL.
func validateEnvKey(envKey string) bool {
	return envKey == validEnvKey
}

// Handler: GET /api/client/{envKey}/flags
func handleGetFlags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/client/"), "/")
	if len(parts) < 1 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing env key"})
		return
	}
	envKey := parts[0]

	if !validateEnvKey(envKey) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid environment key"})
		return
	}

	flagStoreMu.RLock()
	flags := make(map[string]Flag)
	for k, v := range flagStore {
		flags[k] = v
	}
	flagStoreMu.RUnlock()

	response := map[string]any{
		"flags": flags,
		"count": len(flags),
	}
	writeJSON(w, http.StatusOK, response)
}

// Handler: GET /api/stream/{envKey} — SSE endpoint
func handleSSE(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/stream/"), "/")
	if len(parts) < 1 || parts[0] == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing env key"})
		return
	}
	envKey := parts[0]

	if !validateEnvKey(envKey) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid environment key"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	client := make(chan string, 16)
	sseClientsMu.Lock()
	sseClients[client] = true
	sseClientsMu.Unlock()

	defer func() {
		sseClientsMu.Lock()
		delete(sseClients, client)
		sseClientsMu.Unlock()
		close(client)
	}()

	// Send initial connection event.
	fmt.Fprintf(w, "event: connected\ndata: {\"status\": \"connected\"}\n\n")
	flusher.Flush()

	// Send current flags as initial state.
	flagStoreMu.RLock()
	flagsData, _ := json.Marshal(flagStore)
	flagStoreMu.RUnlock()
	fmt.Fprintf(w, "event: flags_change\ndata: %s\n\n", string(flagsData))
	flusher.Flush()

	// Keep connection alive with heartbeat.
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-client:
			fmt.Fprintf(w, "event: update\ndata: %s\n\n", msg)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()
		}
	}
}

// Handler: POST /api/evaluate
func handleEvaluate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req EvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.FlagKey == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "flag_key is required"})
		return
	}

	flagStoreMu.RLock()
	flag, exists := flagStore[req.FlagKey]
	flagStoreMu.RUnlock()

	if !exists {
		writeJSON(w, http.StatusOK, EvaluateResponse{
			FlagKey: req.FlagKey,
			Value:   req.DefaultValue,
			Reason:  "flag_not_found",
		})
		return
	}

	resp := evaluateFlag(flag, req)
	writeJSON(w, http.StatusOK, resp)
}

// Handler: POST /api/evaluate/bulk
func handleBulkEvaluate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req BulkEvaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	results := make([]EvaluateResponse, 0, len(req.Requests))
	for _, evalReq := range req.Requests {
		// Merge global context into per-request context if not set.
		if evalReq.Context.UserKey == "" {
			evalReq.Context.UserKey = req.Context.UserKey
		}
		if evalReq.Context.Attributes == nil {
			evalReq.Context.Attributes = req.Context.Attributes
		}

		flagStoreMu.RLock()
		flag, exists := flagStore[evalReq.FlagKey]
		flagStoreMu.RUnlock()

		if !exists {
			results = append(results, EvaluateResponse{
				FlagKey: evalReq.FlagKey,
				Value:   evalReq.DefaultValue,
				Reason:  "flag_not_found",
			})
			continue
		}

		results = append(results, evaluateFlag(flag, evalReq))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"results": results,
		"count":   len(results),
	})
}

// Handler: POST /api/track
func handleTrack(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req TrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	// Log the impression (in a real server this would be persisted).
	log.Printf("[impression] flag=%s user=%s value=%v", req.FlagKey, req.UserKey, req.Value)

	writeJSON(w, http.StatusOK, TrackResponse{
		Success: true,
		Message: "impression recorded",
	})
}

// Broadcast sends a message to all connected SSE clients.
func Broadcast(msg string) {
	sseClientsMu.Lock()
	defer sseClientsMu.Unlock()
	for client := range sseClients {
		select {
		case client <- msg:
		default:
			// Client buffer full, skip.
		}
	}
}

// main starts the test server.
func main() {
	port := defaultPort

	mux := http.NewServeMux()
	mux.HandleFunc("/api/client/", handleGetFlags)
	mux.HandleFunc("/api/stream/", handleSSE)
	mux.HandleFunc("/api/evaluate", handleEvaluate)
	mux.HandleFunc("/api/evaluate/bulk", handleBulkEvaluate)
	mux.HandleFunc("/api/track", handleTrack)

	// Health check endpoint.
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"version": "1.0.0",
		})
	})

	addr := ":" + port
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("FSAutoResearch SDK test server starting on http://localhost%s", addr)
	log.Printf("Available flags: %d", len(flagStore))
	log.Printf("Environment key: %s", validEnvKey)

	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
