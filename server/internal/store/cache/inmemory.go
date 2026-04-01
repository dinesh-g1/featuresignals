package cache

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
)

// Broadcaster pushes flag-change events to connected clients (e.g. via SSE).
// sse.Server satisfies this interface.
type Broadcaster interface {
	BroadcastFlagUpdate(envID string, data interface{})
}

// WebhookNotifier pushes flag-change events to the webhook dispatch queue.
type WebhookNotifier interface {
	NotifyFlagChange(envID, flagID, action string)
}

// Cache holds in-memory rulesets per environment for fast evaluation.
// When a ruleset is invalidated via PG NOTIFY, the cache also notifies
// connected SDK clients through the optional Broadcaster and dispatches
// webhook events through the optional WebhookNotifier.
type Cache struct {
	mu              sync.RWMutex
	rulesets        map[string]*eval.Ruleset // envID -> ruleset
	store           domain.Store
	logger          *slog.Logger
	broadcaster     Broadcaster
	webhookNotifier WebhookNotifier
}

// NewCache creates an evaluation cache. Pass nil for broadcaster/notifier
// when not needed (e.g. in tests).
func NewCache(store domain.Store, logger *slog.Logger, broadcaster Broadcaster) *Cache {
	return &Cache{
		rulesets:    make(map[string]*eval.Ruleset),
		store:       store,
		logger:      logger,
		broadcaster: broadcaster,
	}
}

// SetWebhookNotifier attaches a webhook dispatcher to the cache.
func (c *Cache) SetWebhookNotifier(n WebhookNotifier) {
	c.webhookNotifier = n
}

// GetRuleset returns the cached ruleset for an environment.
func (c *Cache) GetRuleset(envID string) *eval.Ruleset {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.rulesets[envID]
}

// LoadRuleset fetches the full ruleset from the database and caches it.
func (c *Cache) LoadRuleset(ctx context.Context, projectID, envID string) (*eval.Ruleset, error) {
	flags, states, segments, err := c.store.LoadRuleset(ctx, projectID, envID)
	if err != nil {
		return nil, err
	}

	ruleset := &eval.Ruleset{
		Flags:    make(map[string]*domain.Flag, len(flags)),
		States:   make(map[string]*domain.FlagState, len(states)),
		Segments: make(map[string]*domain.Segment, len(segments)),
	}

	flagIDToKey := make(map[string]string, len(flags))
	for i := range flags {
		f := &flags[i]
		ruleset.Flags[f.Key] = f
		flagIDToKey[f.ID] = f.Key
	}
	for i := range states {
		s := &states[i]
		if key, ok := flagIDToKey[s.FlagID]; ok {
			ruleset.States[key] = s
		}
	}
	for i := range segments {
		s := &segments[i]
		ruleset.Segments[s.Key] = s
	}

	c.mu.Lock()
	c.rulesets[envID] = ruleset
	c.mu.Unlock()

	return ruleset, nil
}

// StartListening subscribes to PostgreSQL NOTIFY and refreshes cache on flag changes.
func (c *Cache) StartListening(ctx context.Context) error {
	return c.store.ListenForChanges(ctx, func(payload string) {
		var change struct {
			FlagID string `json:"flag_id"`
			EnvID  string `json:"env_id"`
			Action string `json:"action"`
		}
		if err := json.Unmarshal([]byte(payload), &change); err != nil {
			c.logger.Error("failed to parse flag change notification", "error", err)
			return
		}

		c.logger.Info("flag change detected, invalidating cache", "env_id", change.EnvID, "action", change.Action)

		c.mu.Lock()
		delete(c.rulesets, change.EnvID)
		c.mu.Unlock()

		if c.broadcaster != nil {
			c.broadcaster.BroadcastFlagUpdate(change.EnvID, map[string]string{
				"type":    "flag_update",
				"env_id":  change.EnvID,
				"flag_id": change.FlagID,
				"action":  change.Action,
			})
		}

		if c.webhookNotifier != nil {
			c.webhookNotifier.NotifyFlagChange(change.EnvID, change.FlagID, change.Action)
		}
	})
}
