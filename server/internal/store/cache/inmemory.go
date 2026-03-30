package cache

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/store/postgres"
)

// Cache holds in-memory rulesets per environment for fast evaluation.
type Cache struct {
	mu       sync.RWMutex
	rulesets map[string]*eval.Ruleset // envID -> ruleset
	store    *postgres.Store
	logger   *slog.Logger
}

func NewCache(store *postgres.Store, logger *slog.Logger) *Cache {
	return &Cache{
		rulesets: make(map[string]*eval.Ruleset),
		store:    store,
		logger:   logger,
	}
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

		// Invalidate the cached ruleset for this environment
		c.mu.Lock()
		delete(c.rulesets, change.EnvID)
		c.mu.Unlock()
	})
}
