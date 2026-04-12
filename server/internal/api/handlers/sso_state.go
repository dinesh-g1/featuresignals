package handlers

import (
	"sync"
	"time"
)

type stateEntry struct {
	value        string
	nonce        string
	codeVerifier string
	expires      time.Time
}

// stateCache is a simple in-memory cache for OIDC state parameters with
// automatic expiration. For multi-instance deployments, replace with a
// shared store (Redis, database).
type stateCache struct {
	mu      sync.Mutex
	entries map[string]stateEntry
	ttl     time.Duration
	stop    chan struct{}
}

func newStateCache(ttl time.Duration) *stateCache {
	c := &stateCache{
		entries: make(map[string]stateEntry),
		ttl:     ttl,
		stop:    make(chan struct{}),
	}
	go c.cleanup()
	return c
}

// Stop signals the background cleanup goroutine to exit.
func (c *stateCache) Stop() {
	close(c.stop)
}

func (c *stateCache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = stateEntry{value: value, expires: time.Now().Add(c.ttl)}
}

// SetWithNonce stores the state with an associated nonce for OIDC.
func (c *stateCache) SetWithNonce(key, value, nonce string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = stateEntry{value: value, nonce: nonce, expires: time.Now().Add(c.ttl)}
}

// SetWithPKCE stores the state with nonce and PKCE code verifier for OIDC.
func (c *stateCache) SetWithPKCE(key, value, nonce, codeVerifier string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = stateEntry{value: value, nonce: nonce, codeVerifier: codeVerifier, expires: time.Now().Add(c.ttl)}
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

// GetWithNonce retrieves and removes the state and nonce (single-use).
func (c *stateCache) GetWithNonce(key string) (string, string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if !ok || time.Now().After(entry.expires) {
		delete(c.entries, key)
		return "", "", false
	}
	delete(c.entries, key)
	return entry.value, entry.nonce, true
}

// GetWithPKCE retrieves and removes the state, nonce, and code verifier (single-use).
func (c *stateCache) GetWithPKCE(key string) (string, string, string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if !ok || time.Now().After(entry.expires) {
		delete(c.entries, key)
		return "", "", "", false
	}
	delete(c.entries, key)
	return entry.value, entry.nonce, entry.codeVerifier, true
}

func (c *stateCache) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.mu.Lock()
			now := time.Now()
			for k, v := range c.entries {
				if now.After(v.expires) {
					delete(c.entries, k)
				}
			}
			c.mu.Unlock()
		case <-c.stop:
			return
		}
	}
}
