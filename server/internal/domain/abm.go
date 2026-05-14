// Package domain defines the core business interfaces for FeatureSignals.
//
// ABM (Agent Behavior Mesh) is the SDK that customer applications use to
// interact with AI agent-managed features. It extends the standard feature
// flag SDK with agent-aware resolution and behavior tracking.
//
// ABM follows the same lifecycle as feature flags (Steps 1-14) but for
// AI agent behaviors rather than software features. Agents toggle behaviors
// the same way engineers toggle features — with the same governance,
// observability, and cleanup guarantees.
package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ─── ABM Resolution ────────────────────────────────────────────────────────

// ABMResolutionRequest is sent by the customer's application to resolve
// which behavior variant an agent should use for a given context.
type ABMResolutionRequest struct {
	// BehaviorKey identifies the agent behavior being resolved
	// (e.g., "checkout-recommendation", "search-ranking").
	BehaviorKey string `json:"behavior_key"`

	// AgentID identifies the AI agent making the request.
	AgentID string `json:"agent_id"`

	// AgentType is the agent's functional category.
	AgentType string `json:"agent_type"`

	// UserID is the end-user context (for percentage-based rollouts).
	UserID string `json:"user_id,omitempty"`

	// Attributes are custom context attributes for targeting rules
	// (e.g., plan, region, device).
	Attributes map[string]any `json:"attributes,omitempty"`

	// SessionID links multiple resolutions within the same user session
	// for consistent behavior.
	SessionID string `json:"session_id,omitempty"`
}

// ABMResolutionResponse is the result of resolving a behavior.
type ABMResolutionResponse struct {
	// BehaviorKey echoes the request.
	BehaviorKey string `json:"behavior_key"`

	// Variant is the resolved behavior variant
	// (e.g., "control", "treatment-v2", "default").
	Variant string `json:"variant"`

	// Config is the variant's configuration payload (arbitrary JSON).
	Config json.RawMessage `json:"config,omitempty"`

	// Reason explains why this variant was selected
	// (e.g., "targeting_match", "percentage_rollout", "default").
	Reason string `json:"reason"`

	// ResolvedAt is when the resolution occurred.
	ResolvedAt time.Time `json:"resolved_at"`

	// IsSticky indicates the variant should be cached for the session
	// to ensure consistent behavior.
	IsSticky bool `json:"is_sticky"`

	// TTLSeconds is the recommended cache duration. 0 means don't cache.
	TTLSeconds int `json:"ttl_seconds"`
}

// ─── ABM Tracking ──────────────────────────────────────────────────────────

// ABMTrackEvent records an agent behavior event for analytics, billing,
// and maturity tracking. These events flow through the EventBus to the
// billing meter, audit log, and analytics pipeline.
type ABMTrackEvent struct {
	// OrgID is the organization that owns this event.
	OrgID string `json:"org_id"`

	// BehaviorKey identifies the behavior.
	BehaviorKey string `json:"behavior_key"`

	// Variant is the variant that was used.
	Variant string `json:"variant"`

	// AgentID identifies the agent.
	AgentID string `json:"agent_id"`

	// AgentType is the agent's category.
	AgentType string `json:"agent_type"`

	// UserID is the end-user context.
	UserID string `json:"user_id,omitempty"`

	// Action describes what the agent did
	// (e.g., "recommendation.displayed", "search.ranked", "content.generated").
	Action string `json:"action"`

	// Outcome is the result of the action
	// (e.g., "clicked", "purchased", "dismissed", "error").
	Outcome string `json:"outcome,omitempty"`

	// Value is an optional numeric metric (e.g., revenue, latency).
	Value float64 `json:"value,omitempty"`

	// Metadata carries arbitrary additional data.
	Metadata map[string]any `json:"metadata,omitempty"`

	// SessionID links events within the same session.
	SessionID string `json:"session_id,omitempty"`

	// RecordedAt is when the event occurred.
	RecordedAt time.Time `json:"recorded_at"`
}

// ─── ABM Behavior Definition ───────────────────────────────────────────────

// ABMBehavior defines an agent behavior that can be managed through the
// feature lifecycle. Behaviors are the ABM equivalent of feature flags:
// they have variants, targeting rules, and rollout percentages.
type ABMBehavior struct {
	// OrgID is the organization that owns this behavior.
	OrgID string `json:"org_id"`

	// Key uniquely identifies this behavior within the organization.
	Key string `json:"key"`

	// Name is a human-readable label.
	Name string `json:"name"`

	// Description explains what the behavior controls.
	Description string `json:"description,omitempty"`

	// AgentType restricts which agent category can use this behavior.
	AgentType string `json:"agent_type"`

	// Variants are the possible behavior variants with their configs.
	Variants []ABMVariant `json:"variants"`

	// DefaultVariant is the variant used when no targeting rules match.
	DefaultVariant string `json:"default_variant"`

	// TargetingRules determine which variant is served to which context.
	TargetingRules []ABMTargetingRule `json:"targeting_rules,omitempty"`

	// RolloutPercentage is the percentage of traffic receiving non-default
	// variants (0 = all default, 100 = all non-default).
	RolloutPercentage int `json:"rollout_percentage"`

	// Status is the behavior's lifecycle state.
	Status string `json:"status"` // "draft", "active", "paused", "retired"

	// CreatedAt is when the behavior was created.
	CreatedAt time.Time `json:"created_at"`

	// UpdatedAt is when the behavior was last modified.
	UpdatedAt time.Time `json:"updated_at"`
}

// ABMVariant is one possible configuration for a behavior.
type ABMVariant struct {
	// Key uniquely identifies this variant within the behavior.
	Key string `json:"key"`

	// Name is a human-readable label.
	Name string `json:"name"`

	// Description explains what this variant does.
	Description string `json:"description,omitempty"`

	// Config is the variant's configuration payload (arbitrary JSON).
	// This is what the agent receives when this variant is resolved.
	Config json.RawMessage `json:"config"`

	// Weight is the relative traffic weight (used for multi-variant
	// percentage rollout). 0 means this variant gets no traffic.
	Weight int `json:"weight"`
}

// ABMTargetingRule determines which variant is served based on context.
type ABMTargetingRule struct {
	// Name identifies this rule.
	Name string `json:"name"`

	// Variant is the variant served when this rule matches.
	Variant string `json:"variant"`

	// Condition is a CEL expression evaluated against the resolution
	// request attributes. If true, the variant is served.
	Condition string `json:"condition"`

	// Priority determines evaluation order. Lower numbers evaluate first.
	Priority int `json:"priority"`
}

// Match evaluates this targeting rule against a resolution request.
// For the initial implementation, we support simple attribute matching
// (agent_type equality). Full CEL support will come with the governance layer.
func (r *ABMTargetingRule) Match(req ABMResolutionRequest) bool {
	if r.Condition == "" {
		return false
	}

	// Simple targeting: check if the agent_type attribute matches.
	if req.Attributes != nil {
		if val, ok := req.Attributes["agent_type"]; ok {
			if s, ok := val.(string); ok && s == req.AgentType {
				return true
			}
		}
	}

	return false
}

// SetDefaults populates default values for required fields that weren't
// explicitly set by the caller.
func (b *ABMBehavior) SetDefaults() {
	if b.DefaultVariant == "" {
		b.DefaultVariant = "default"
	}
	if b.Status == "" {
		b.Status = "draft"
	}
	if b.RolloutPercentage == 0 {
		b.RolloutPercentage = 100
	}
	if b.Variants == nil {
		b.Variants = []ABMVariant{}
	}
	if b.TargetingRules == nil {
		b.TargetingRules = []ABMTargetingRule{}
	}
}

// MergeUpdate applies a partial update request onto the existing behavior.
// Only non-zero fields from the request are applied.
func (b *ABMBehavior) MergeUpdate(req *ABMBehavior) {
	if req.Name != "" {
		b.Name = req.Name
	}
	if req.Description != "" {
		b.Description = req.Description
	}
	if req.AgentType != "" {
		b.AgentType = req.AgentType
	}
	if req.Variants != nil {
		b.Variants = req.Variants
	}
	if req.DefaultVariant != "" {
		b.DefaultVariant = req.DefaultVariant
	}
	if req.TargetingRules != nil {
		b.TargetingRules = req.TargetingRules
	}
	if req.RolloutPercentage != 0 {
		b.RolloutPercentage = req.RolloutPercentage
	}
	if req.Status != "" {
		b.Status = req.Status
	}
}

// EvaluateBehavior applies targeting rules and rollout percentage to
// determine which variant should be served. This is the core ABM
// resolution logic — the agent equivalent of flag evaluation.
func (b *ABMBehavior) EvaluateBehavior(req ABMResolutionRequest) ABMResolutionResponse {
	resp := ABMResolutionResponse{
		BehaviorKey: req.BehaviorKey,
		Variant:     b.DefaultVariant,
		Reason:      "default",
		ResolvedAt:  time.Now().UTC(),
		IsSticky:    true,
		TTLSeconds:  300,
	}

	// If behavior is not active, return default variant.
	if b.Status != "active" {
		resp.Reason = "behavior_inactive"
		return resp
	}

	// Apply targeting rules in priority order (lowest priority first = evaluated first).
	for i := range b.TargetingRules {
		rule := &b.TargetingRules[i]
		if rule.Match(req) {
			resp.Variant = rule.Variant
			resp.Reason = "targeting_match"
			break
		}
	}

	// Apply rollout percentage if no targeting rule matched yet.
	if resp.Reason == "default" && b.RolloutPercentage > 0 && req.UserID != "" {
		if rolloutMatch(req.UserID, b.RolloutPercentage) {
			// Pick the first non-default variant for the rollout.
			for _, v := range b.Variants {
				if v.Key != b.DefaultVariant && v.Weight > 0 {
					resp.Variant = v.Key
					resp.Reason = "percentage_rollout"
					break
				}
			}
		}
	}

	// Attach variant configuration.
	for _, v := range b.Variants {
		if v.Key == resp.Variant {
			resp.Config = v.Config
			break
		}
	}

	return resp
}

// rolloutMatch deterministically hashes a userID to decide if they
// should receive the rollout variant. Uses FNV-1a for speed.
func rolloutMatch(userID string, percentage int) bool {
	if percentage <= 0 {
		return false
	}
	if percentage >= 100 {
		return true
	}

	// FNV-1a hash for consistent percentage-based rollout.
	var hash uint64 = 14695981039346656037 // FNV offset basis
	for i := 0; i < len(userID); i++ {
		hash ^= uint64(userID[i])
		hash *= 1099511628211 // FNV prime
	}
	return int(hash%100) < percentage
}

// ─── ABM Store interfaces ──────────────────────────────────────────────────

// ABMBehaviorStore provides full CRUD for ABM behaviors.
type ABMBehaviorStore interface {
	CreateBehavior(ctx context.Context, behavior *ABMBehavior) error
	GetBehavior(ctx context.Context, orgID, behaviorKey string) (*ABMBehavior, error)
	ListBehaviors(ctx context.Context, orgID string, limit, offset int) ([]ABMBehavior, error)
	ListBehaviorsByAgentType(ctx context.Context, orgID, agentType string, limit, offset int) ([]ABMBehavior, error)
	CountBehaviors(ctx context.Context, orgID string) (int, error)
	CountBehaviorsByAgentType(ctx context.Context, orgID, agentType string) (int, error)
	UpdateBehavior(ctx context.Context, behavior *ABMBehavior) error
	DeleteBehavior(ctx context.Context, orgID, behaviorKey string) error
}

// ABMEventStore persists ABM track events for analytics.
type ABMEventStore interface {
	InsertTrackEvent(ctx context.Context, event *ABMTrackEvent) error
	InsertTrackEvents(ctx context.Context, events []ABMTrackEvent) error
	CountEventsByBehavior(ctx context.Context, orgID, behaviorKey string, since time.Time) (int, error)
	CountEventsByAgent(ctx context.Context, orgID, agentID string, since time.Time) (int, error)
	GetVariantDistribution(ctx context.Context, orgID, behaviorKey string, since time.Time) (map[string]int, error)
}
