package codeanalysis

import (
	"fmt"
	"sync"
	"time"
)

// ─── Provider Capabilities ───────────────────────────────────────────────

// ProviderCapabilities describes what a provider supports for compliance purposes.
type ProviderCapabilities struct {
	// SupportsSelfHosted indicates the provider can be pointed at a custom endpoint.
	SupportsSelfHosted bool `json:"supports_self_hosted"`
	// RequiresAPIKey indicates the provider needs an API key.
	RequiresAPIKey bool `json:"requires_api_key"`
	// SupportsRedaction indicates the provider has built-in data redaction support.
	SupportsRedaction bool `json:"supports_redaction"`
	// Status is "active" or "deprecated".
	Status string `json:"status"`
}

// ─── Provider Factory ───────────────────────────────────────────────────

// ProviderFactory creates a configured CodeAnalysisProvider instance.
type ProviderFactory func(config ProviderConfig) (CodeAnalysisProvider, error)

// ─── Provider Config ────────────────────────────────────────────────────

// ProviderConfig holds configuration for an LLM provider.
type ProviderConfig struct {
	APIKey      string
	Model       string
	BaseURL     string
	Temperature float64
	MaxTokens   int
	Timeout     time.Duration
}

// ─── Provider Registry (Instance-based, no globals) ────────────────────

// ProviderRegistry holds all registered LLM provider factory functions.
// MUST be instantiated via NewProviderRegistry and explicitly injected.
// No global state, no panics, no init() side effects.
type ProviderRegistry struct {
	mu      sync.RWMutex
	names   []string // maintains registration order for deterministic listing
	entries map[string]registryEntry
}

type registryEntry struct {
	factory ProviderFactory
	caps    ProviderCapabilities
}

// NewProviderRegistry creates an empty provider registry.
func NewProviderRegistry() *ProviderRegistry {
	return &ProviderRegistry{
		entries: make(map[string]registryEntry),
	}
}

// Register adds a provider factory. Returns an error if the name is already
// registered (caller must handle duplicates appropriately).
func (r *ProviderRegistry) Register(name string, factory ProviderFactory, caps ProviderCapabilities) error {
	if name == "" {
		return fmt.Errorf("codeanalysis: provider name cannot be empty")
	}
	if factory == nil {
		return fmt.Errorf("codeanalysis: provider %q factory cannot be nil", name)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.entries[name]; exists {
		return fmt.Errorf("codeanalysis: provider %q already registered", name)
	}

	r.entries[name] = registryEntry{factory: factory, caps: caps}
	r.names = append(r.names, name)
	return nil
}

// CreateProvider creates a configured provider instance by name.
func (r *ProviderRegistry) CreateProvider(name string, config ProviderConfig) (CodeAnalysisProvider, error) {
	r.mu.RLock()
	entry, ok := r.entries[name]
	r.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("codeanalysis: unknown provider %q (available: %v)", name, r.listNames())
	}

	return entry.factory(config)
}

// GetCapabilities returns the capabilities for a registered provider.
func (r *ProviderRegistry) GetCapabilities(name string) (ProviderCapabilities, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	entry, ok := r.entries[name]
	if !ok {
		return ProviderCapabilities{}, false
	}
	return entry.caps, true
}

// ListProviders returns all registered provider names.
func (r *ProviderRegistry) ListProviders() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.listNames()
}

// ProviderCount returns the number of registered providers.
func (r *ProviderRegistry) ProviderCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.entries)
}

func (r *ProviderRegistry) listNames() []string {
	names := make([]string, len(r.names))
	copy(names, r.names)
	return names
}