// Package agent provides the Agent Runtime implementation.
//
// RateLimitGovernanceStep implements domain.GovernanceStep for the
// "rate_limit" stage of the 7-step governance pipeline. It checks that
// the agent has not exceeded its configured rate limits (per-minute,
// per-hour, concurrent).
package agent

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// RateLimitGovernanceStep enforces agent rate limits using an in-memory
// token bucket. In production, this would be backed by Redis for
// cross-instance consistency. This is the fifth step in the pipeline.
type RateLimitGovernanceStep struct {
	mu       sync.Mutex
	buckets  map[string]*agentBucket // keyed by agent_id
	logger   *slog.Logger
}

// agentBucket tracks an agent's recent action count for rate limiting.
type agentBucket struct {
	minuteCount int
	hourCount   int
	concurrent  int
	minuteStart time.Time
	hourStart   time.Time
}

// NewRateLimitGovernanceStep creates the rate limit governance step.
func NewRateLimitGovernanceStep(logger *slog.Logger) *RateLimitGovernanceStep {
	return &RateLimitGovernanceStep{
		buckets: make(map[string]*agentBucket),
		logger:  logger.With("step", domain.GovStepRateLimit),
	}
}

// Name returns the step's identifier.
func (s *RateLimitGovernanceStep) Name() string {
	return domain.GovStepRateLimit
}

// Execute checks the agent's rate limits. Rate limits are extracted from
// action.Context.Metadata["rate_limits"] if present, otherwise default
// limits apply (60/min, 1000/hr, 10 concurrent).
func (s *RateLimitGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepRateLimit

	limits := extractRateLimits(action.Context.Metadata)
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	bucket, exists := s.buckets[action.AgentID]
	if !exists || bucket.minuteStart.IsZero() {
		bucket = &agentBucket{minuteStart: now, hourStart: now}
		s.buckets[action.AgentID] = bucket
	}

	// Reset counters if windows have elapsed
	if now.Sub(bucket.minuteStart) >= time.Minute {
		bucket.minuteCount = 0
		bucket.minuteStart = now
	}
	if now.Sub(bucket.hourStart) >= time.Hour {
		bucket.hourCount = 0
		bucket.hourStart = now
	}

	// Check concurrent limit
	if limits.ConcurrentActions > 0 && bucket.concurrent >= limits.ConcurrentActions {
		s.logger.Warn("action rejected: concurrent limit exceeded",
			"agent_id", action.AgentID,
			"concurrent", bucket.concurrent,
			"limit", limits.ConcurrentActions,
		)
		return action, &domain.GovernanceError{
			Step:          domain.GovStepRateLimit,
			Reason:        "rate_limit_exceeded",
			Message:       fmt.Sprintf("Agent %q has %d concurrent actions (limit: %d). Wait for in-flight actions to complete.", action.AgentID, bucket.concurrent, limits.ConcurrentActions),
			RequiresHuman: false,
			RetryAfter:    5 * time.Second,
		}
	}

	// Check per-minute limit
	if limits.PerMinute > 0 && bucket.minuteCount >= limits.PerMinute {
		s.logger.Warn("action rejected: per-minute limit exceeded",
			"agent_id", action.AgentID,
			"count", bucket.minuteCount,
			"limit", limits.PerMinute,
		)
		return action, &domain.GovernanceError{
			Step:          domain.GovStepRateLimit,
			Reason:        "rate_limit_exceeded",
			Message:       fmt.Sprintf("Agent %q has reached its per-minute limit (%d/min). Retry after the window resets.", action.AgentID, limits.PerMinute),
			RequiresHuman: false,
			RetryAfter:    time.Minute - time.Since(bucket.minuteStart),
		}
	}

	// Check per-hour limit
	if limits.PerHour > 0 && bucket.hourCount >= limits.PerHour {
		s.logger.Warn("action rejected: per-hour limit exceeded",
			"agent_id", action.AgentID,
			"count", bucket.hourCount,
			"limit", limits.PerHour,
		)
		return action, &domain.GovernanceError{
			Step:          domain.GovStepRateLimit,
			Reason:        "rate_limit_exceeded",
			Message:       fmt.Sprintf("Agent %q has reached its per-hour limit (%d/hr). Retry after the window resets.", action.AgentID, limits.PerHour),
			RequiresHuman: false,
			RetryAfter:    time.Hour - time.Since(bucket.hourStart),
		}
	}

	// Increment counters (action is allowed)
	bucket.minuteCount++
	bucket.hourCount++
	bucket.concurrent++

	s.logger.Debug("rate limit step passed",
		"agent_id", action.AgentID,
		"minute_count", bucket.minuteCount,
		"hour_count", bucket.hourCount,
		"concurrent", bucket.concurrent,
	)

	// Store the concurrent count in metadata so the audit step can
	// decrement it after execution completes.
	if action.Context.Metadata == nil {
		action.Context.Metadata = make(map[string]any)
	}
	action.Context.Metadata["rate_limit_concurrent"] = true
	return action, nil
}

// ReleaseConcurrent decrements the concurrent action counter for an agent.
// Called after the action completes (success or failure).
func (s *RateLimitGovernanceStep) ReleaseConcurrent(agentID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if bucket, exists := s.buckets[agentID]; exists && bucket.concurrent > 0 {
		bucket.concurrent--
	}
}

// extractRateLimits extracts rate limit configuration from metadata.
func extractRateLimits(metadata map[string]any) domain.AgentRateLimits {
	defaults := domain.AgentRateLimits{
		PerMinute:         60,
		PerHour:           1000,
		ConcurrentActions: 10,
	}
	if metadata == nil {
		return defaults
	}
	val, ok := metadata["rate_limits"]
	if !ok {
		return defaults
	}
	// Support both domain.AgentRateLimits and map representations
	switch v := val.(type) {
	case domain.AgentRateLimits:
		return v
	case map[string]any:
		if pm, ok := v["per_minute"].(float64); ok {
			defaults.PerMinute = int(pm)
		}
		if ph, ok := v["per_hour"].(float64); ok {
			defaults.PerHour = int(ph)
		}
		if ca, ok := v["concurrent_actions"].(float64); ok {
			defaults.ConcurrentActions = int(ca)
		}
	}
	return defaults
}
