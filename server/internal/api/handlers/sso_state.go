package handlers

import (
	"sync"
	"time"
)

type stateEntry struct {
	value   string
	expires time.Time
}

// stateCache is a simple in-memory cache for OIDC state parameters with
// automatic expiration. For multi-instance deployments, replace with a
// shared store (Redis, database).
type stateCache struct {
	mu      sync.Mutex
	entries map[string]stateEntry
	ttl     time.Duration
}

func newStateCache(ttl time.Duration) *stateCache {
	c := &stateCache{
		entries: make(map[string]stateEntry),
		ttl:     ttl,
	}
	go c.cleanup()
	return c
}

func (c *stateCache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = stateEntry{value: value, expires: time.Now().Add(c.ttl)}
}

// Get retrieves and removes the state (single-use).
func (c *stateCache) Get(key string) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if !ok || time.Now().After(entry.expires) {
		delete(c.entries, key)
		return "", false
	}
	delete(c.entries, key)
	return entry.value, true
}

func (c *stateCache) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.entries {
			if now.After(v.expires) {
				delete(c.entries, k)
			}
		}
		c.mu.Unlock()
	}
}
