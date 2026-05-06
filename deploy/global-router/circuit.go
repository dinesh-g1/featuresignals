package main

import (
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// circuitState represents the three states of a circuit breaker.
type circuitState int

const (
	circuitClosed    circuitState = iota // normal operation, requests pass through
	circuitOpen                          // failing, requests rejected immediately
	circuitHalfOpen                      // probing, allowing a single test request
)

func (s circuitState) String() string {
	switch s {
	case circuitClosed:
		return "closed"
	case circuitOpen:
		return "open"
	case circuitHalfOpen:
		return "half_open"
	default:
		return "unknown"
	}
}

// circuitConfig holds the tunable parameters for a circuit breaker.
type circuitConfig struct {
	// FailureThreshold is the number of consecutive failures before opening the circuit.
	FailureThreshold int
	// Cooldown is how long the circuit stays open before transitioning to half-open.
	Cooldown time.Duration
	// HalfOpenMaxRequests is the max number of requests allowed in half-open state.
	HalfOpenMaxRequests int
	// ProbeTimeout is the timeout for the health probe request in half-open state.
	ProbeTimeout time.Duration
}

// defaultCircuitConfig returns sensible defaults for circuit breaking.
func defaultCircuitConfig() circuitConfig {
	return circuitConfig{
		FailureThreshold:    5,
		Cooldown:            30 * time.Second,
		HalfOpenMaxRequests: 1,
		ProbeTimeout:        5 * time.Second,
	}
}

// circuitBreaker implements the circuit breaker pattern for an upstream
// service. It tracks consecutive failures and prevents cascading failures
// by quickly rejecting requests when the upstream is unhealthy.
//
// States:
//   - CLOSED: requests flow normally. Consecutive failures increment a counter.
//     When the counter reaches FailureThreshold, the circuit opens.
//   - OPEN: requests are rejected immediately with a 503. After Cooldown
//     expires, the circuit transitions to half-open.
//   - HALF_OPEN: a limited number of probe requests are allowed through.
//     If any succeed, the circuit closes. If they fail, the circuit re-opens.
type circuitBreaker struct {
	mu    sync.Mutex
	state circuitState

	// config
	cfg circuitConfig

	// metrics
	consecutiveFailures  int
	consecutiveSuccesses int
	lastFailure          time.Time
	openedAt             time.Time

	// half-open tracking
	halfOpenRequests int

	// identity
	target string

	// callbacks
	onTransition func(target string, from, to circuitState)
}

// newCircuitBreaker creates a new circuit breaker for the given target.
func newCircuitBreaker(target string, cfg circuitConfig) *circuitBreaker {
	if cfg.FailureThreshold <= 0 {
		cfg.FailureThreshold = 5
	}
	if cfg.Cooldown <= 0 {
		cfg.Cooldown = 30 * time.Second
	}
	if cfg.HalfOpenMaxRequests <= 0 {
		cfg.HalfOpenMaxRequests = 1
	}
	if cfg.ProbeTimeout <= 0 {
		cfg.ProbeTimeout = 5 * time.Second
	}

	return &circuitBreaker{
		state:  circuitClosed,
		cfg:    cfg,
		target: target,
	}
}

// Allow checks whether a request should be allowed through the circuit.
// Returns true if the request can proceed, false if it should be rejected.
func (cb *circuitBreaker) Allow() bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case circuitClosed:
		return true

	case circuitOpen:
		if time.Since(cb.openedAt) >= cb.cfg.Cooldown {
			cb.transitionTo(circuitHalfOpen)
			return true
		}
		return false

	case circuitHalfOpen:
		if cb.halfOpenRequests < cb.cfg.HalfOpenMaxRequests {
			cb.halfOpenRequests++
			return true
		}
		return false

	default:
		return true
	}
}

// RecordSuccess records a successful request. In half-open state, a single
// success closes the circuit.
func (cb *circuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.consecutiveFailures = 0
	cb.consecutiveSuccesses++

	if cb.state == circuitHalfOpen {
		cb.transitionTo(circuitClosed)
		slog.Info("circuit breaker closed (upstream recovered)",
			"target", cb.target,
			"consecutive_successes", cb.consecutiveSuccesses,
		)
	}
}

// RecordFailure records a failed request. In closed state, too many
// consecutive failures open the circuit. In half-open state, a single
// failure re-opens the circuit.
func (cb *circuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.consecutiveSuccesses = 0
	cb.consecutiveFailures++
	cb.lastFailure = time.Now()

	switch cb.state {
	case circuitClosed:
		if cb.consecutiveFailures >= cb.cfg.FailureThreshold {
			cb.transitionTo(circuitOpen)
			slog.Warn("circuit breaker opened (upstream failing)",
				"target", cb.target,
				"consecutive_failures", cb.consecutiveFailures,
				"cooldown", cb.cfg.Cooldown,
			)
		}

	case circuitHalfOpen:
		cb.transitionTo(circuitOpen)
		slog.Warn("circuit breaker re-opened (probe failed)",
			"target", cb.target,
		)
	}
}

// transitionTo changes the circuit state and resets tracking counters.
// Must be called with the mutex held.
func (cb *circuitBreaker) transitionTo(newState circuitState) {
	oldState := cb.state
	cb.state = newState
	cb.halfOpenRequests = 0

	if newState == circuitOpen {
		cb.openedAt = time.Now()
	}

	if newState == circuitClosed {
		cb.consecutiveFailures = 0
	}

	if cb.onTransition != nil {
		cb.onTransition(cb.target, oldState, newState)
	}

	slog.Debug("circuit breaker state transition",
		"target", cb.target,
		"from", oldState.String(),
		"to", newState.String(),
	)
}

// State returns the current circuit state (for metrics/health checks).
func (cb *circuitBreaker) State() circuitState {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state
}

// Stats returns current circuit breaker metrics.
func (cb *circuitBreaker) Stats() (state circuitState, failures int, successes int) {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	return cb.state, cb.consecutiveFailures, cb.consecutiveSuccesses
}

// circuitBreakerTransport wraps an http.RoundTripper with circuit
// breaking logic. Each round trip is gated by the circuit breaker
// and results are recorded as successes or failures.
type circuitBreakerTransport struct {
	next   http.RoundTripper
	cb     *circuitBreaker
	target string
}

func (t *circuitBreakerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if !t.cb.Allow() {
		slog.Warn("circuit breaker rejected request",
			"target", t.target,
			"state", t.cb.State().String(),
		)
		return nil, errCircuitOpen
	}

	resp, err := t.next.RoundTrip(req)
	if err != nil {
		t.cb.RecordFailure()
		return nil, err
	}

	// Treat 5xx responses as failures for circuit breaking purposes
	if resp.StatusCode >= 500 {
		t.cb.RecordFailure()
		return resp, nil
	}

	t.cb.RecordSuccess()
	return resp, nil
}

// errCircuitOpen is returned when the circuit breaker rejects a request.
// It's used internally by the transport; the HTTP handler converts it to a 503.
var errCircuitOpen = &circuitError{}

type circuitError struct{}

func (e *circuitError) Error() string { return "circuit breaker open" }

// circuitBreakerHandler is an HTTP middleware that returns 503 when the
// circuit is open, before even reaching the proxy transport. This is the
// fast-path rejection that avoids allocating a reverse proxy round trip.
func circuitBreakerHandler(cb *circuitBreaker, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !cb.Allow() {
			http.Error(w, "503 Service Unavailable — upstream temporarily unavailable", http.StatusServiceUnavailable)
			return
		}

		// Wrap the response writer to detect failures
		crw := &circuitResponseWriter{ResponseWriter: w, cb: cb}
		next.ServeHTTP(crw, r)

		// Record based on status code
		if crw.statusCode >= 500 {
			cb.RecordFailure()
		} else {
			cb.RecordSuccess()
		}
	})
}

// circuitResponseWriter captures the status code for circuit breaker tracking.
type circuitResponseWriter struct {
	http.ResponseWriter
	cb         *circuitBreaker
	statusCode int
	wroteHeader bool
}

func (crw *circuitResponseWriter) WriteHeader(code int) {
	if crw.wroteHeader {
		return
	}
	crw.wroteHeader = true
	crw.statusCode = code
	crw.ResponseWriter.WriteHeader(code)
}

func (crw *circuitResponseWriter) Write(b []byte) (int, error) {
	if !crw.wroteHeader {
		crw.WriteHeader(http.StatusOK)
	}
	return crw.ResponseWriter.Write(b)
}
