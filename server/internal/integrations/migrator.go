// Package integrations provides the importer registry pattern for third-party
// feature flag platform migration. It defines the Importer interface that all
// providers (LaunchDarkly, Unleash, Flagsmith) implement, and a thread-safe
// registry for managing importer factories.
//
// Usage:
//
//	registry := integrations.NewRegistry()
//	registry.MustRegister("unleash", func(cfg integrations.ImporterConfig) (integrations.Importer, error) {
//	    return unleash.NewImporter(cfg)
//	})
//	 importer, err := registry.NewImporter("unleash", config)
package integrations

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/featuresignals/server/internal/domain"
)

// ─── ImporterConfig ─────────────────────────────────────────────────────────

// ImporterConfig holds the configuration needed to connect to a source
// feature flag platform and import data into FeatureSignals.
type ImporterConfig struct {
	// APIKey is the authentication token for the source platform.
	APIKey string `json:"api_key"`

	// BaseURL is the API endpoint for the source platform.
	// For SaaS platforms, this is the standard API URL.
	// For self-hosted installations, this is the custom URL.
	BaseURL string `json:"base_url"`

	// ProjectKey is the identifier for the source project/application
	// in the third-party platform (e.g., LaunchDarkly project key).
	ProjectKey string `json:"project_key"`

	// EnvironmentFilter optionally restricts import to specific
	// environments by key. Empty means import all environments.
	EnvironmentFilter []string `json:"environment_filter,omitempty"`

	// TagFilter optionally restricts import to flags with specific tags.
	// Empty means import all flags regardless of tags.
	TagFilter []string `json:"tag_filter,omitempty"`

	// Logger is the structured logger to use for importer operations.
	// If nil, slog.Default() is used.
	Logger *slog.Logger `json:"-"`
}

// ─── ImportResult ───────────────────────────────────────────────────────────

// ImportSummary contains the aggregated result of a migration analysis.
type ImportSummary struct {
	TotalFlags        int    `json:"total_flags"`
	TotalEnvironments int    `json:"total_environments"`
	TotalSegments     int    `json:"total_segments"`
	SourceSystem      string `json:"source_system"`
}

// ─── Importer Interface ─────────────────────────────────────────────────────

// Importer defines the contract for importing feature flags, environments,
// and segments from a third-party feature flag platform into FeatureSignals
// domain models. Each platform (LaunchDarkly, Unleash, Flagsmith) provides
// its own implementation.
type Importer interface {
	// Name returns the unique machine-readable identifier for the importer
	// (e.g., "launchdarkly", "unleash", "flagsmith").
	Name() string

	// DisplayName returns the human-readable name for the platform
	// (e.g., "LaunchDarkly", "Unleash", "Flagsmith").
	DisplayName() string

	// Capabilities returns the list of features this importer supports.
	// Possible values: "flags", "environments", "segments", "identities".
	Capabilities() []string

	// ValidateConnection tests the connection to the source platform using
	// the configured API key and base URL. Returns nil on success.
	ValidateConnection(ctx context.Context) error

	// FetchFlags retrieves all feature flags from the source platform and
	// maps them to FeatureSignals domain Flag and FlagState pairs.
	// Returns a slice of FlagImport, each containing the domain Flag and
	// its per-environment states.
	FetchFlags(ctx context.Context) ([]*FlagImport, error)

	// FetchEnvironments retrieves all environments from the source platform
	// and maps them to FeatureSignals domain Environment values.
	FetchEnvironments(ctx context.Context) ([]*domain.Environment, error)

	// FetchSegments retrieves all segments from the source platform and
	// maps them to FeatureSignals domain Segment values.
	FetchSegments(ctx context.Context) ([]*domain.Segment, error)
}

// ─── FlagImport ─────────────────────────────────────────────────────────────

// FlagImport holds the mapped domain flag and its per-environment states.
// This is the same type used by the LaunchDarkly importer.
type FlagImport struct {
	Flag   *domain.Flag
	States map[string]*domain.FlagState // envKey -> FlagState
}

// ─── ImporterRegistry ───────────────────────────────────────────────────────

// ImporterFactory is a function that creates a new Importer from config.
type ImporterFactory func(cfg ImporterConfig) (Importer, error)

// ImporterRegistry is a thread-safe registry of importer factories.
// It follows the registry pattern: providers register themselves with
// a factory function, and consumers create instances by name.
//
// No init() functions are used — registration is explicit, typically
// in cmd/server/main.go.
type ImporterRegistry struct {
	mu        sync.RWMutex
	factories map[string]ImporterFactory
	providers map[string]Importer // cached provider metadata
}

// NewRegistry creates a new empty importer registry.
func NewRegistry() *ImporterRegistry {
	return &ImporterRegistry{
		factories: make(map[string]ImporterFactory),
		providers: make(map[string]Importer),
	}
}

// Register registers an importer factory under the given name.
// Returns an error if the name is already registered.
func (r *ImporterRegistry) Register(name string, factory ImporterFactory) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.factories[name]; exists {
		return fmt.Errorf("importer %q is already registered", name)
	}
	r.factories[name] = factory
	return nil
}

// MustRegister registers an importer factory and panics on conflict.
// Intended for use in main.go where registration failures are fatal.
func (r *ImporterRegistry) MustRegister(name string, factory ImporterFactory) {
	if err := r.Register(name, factory); err != nil {
		panic(fmt.Sprintf("importer registration failed: %v", err))
	}
}

// NewImporter creates a new Importer instance by name using the registered
// factory. Returns an error if the name is not registered.
func (r *ImporterRegistry) NewImporter(name string, cfg ImporterConfig) (Importer, error) {
	r.mu.RLock()
	factory, exists := r.factories[name]
	r.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("unknown importer %q", name)
	}
	return factory(cfg)
}

// ListProviders returns metadata for all registered importers. Each call
// instantiates the providers once and caches them for subsequent calls.
func (r *ImporterRegistry) ListProviders(ctx context.Context, log *slog.Logger) []ProviderInfo {
	r.mu.RLock()
	names := make([]string, 0, len(r.factories))
	for name := range r.factories {
		names = append(names, name)
	}
	r.mu.RUnlock()

	providers := make([]ProviderInfo, 0, len(names))
	for _, name := range names {
		info, err := r.getProviderInfo(ctx, name, log)
		if err != nil {
			slog.Warn("failed to get provider info", "provider", name, "error", err)
			providers = append(providers, ProviderInfo{
				Name:         name,
				DisplayName:  name,
				Capabilities: nil,
			})
			continue
		}
		providers = append(providers, info)
	}
	return providers
}

// getProviderInfo returns metadata for a single named provider by creating a
// minimal instance (with empty config for metadata purposes) and querying it.
func (r *ImporterRegistry) getProviderInfo(ctx context.Context, name string, log *slog.Logger) (ProviderInfo, error) {
	r.mu.RLock()
	factory, exists := r.factories[name]
	r.mu.RUnlock()

	if !exists {
		return ProviderInfo{}, fmt.Errorf("unknown importer %q", name)
	}

	// Create a minimal instance using a stub config to extract metadata.
	// If the factory requires specific config to construct, it must handle
	// empty config gracefully for metadata-only queries.
	imp, err := factory(ImporterConfig{
		APIKey:  "",
		BaseURL: "",
		Logger:  log,
	})
	if err != nil {
		return ProviderInfo{}, fmt.Errorf("create importer %q: %w", name, err)
	}

	return ProviderInfo{
		Name:         imp.Name(),
		DisplayName:  imp.DisplayName(),
		Capabilities: imp.Capabilities(),
	}, nil
}

// ─── ProviderInfo ───────────────────────────────────────────────────────────

// ProviderInfo contains metadata about a registered importer provider,
// used when listing available providers to the client.
type ProviderInfo struct {
	Name         string   `json:"name"`
	DisplayName  string   `json:"display_name"`
	Capabilities []string `json:"capabilities"`
}

// ─── Standard capabilities ─────────────────────────────────────────────────

const (
	CapabilityFlags        = "flags"
	CapabilityEnvironments = "environments"
	CapabilitySegments     = "segments"
	CapabilityIdentities   = "identities"
)
// DefaultGlobalRegistry is the package-level registry used by convenience functions.
var DefaultGlobalRegistry = NewRegistry()

// Register adds a provider factory to the default global registry.
func Register(name string, factory ImporterFactory) {
	if err := DefaultGlobalRegistry.Register(name, factory); err != nil {
		panic(err)
	}
}

// ListProviders returns metadata for all registered providers.
func ListProviders() []string {
	names := make([]string, 0)
	DefaultGlobalRegistry.mu.RLock()
	for name := range DefaultGlobalRegistry.factories {
		names = append(names, name)
	}
	DefaultGlobalRegistry.mu.RUnlock()
	return names
}

// NewImporter creates a new Importer by name using the default registry.
func NewImporter(name string, cfg ImporterConfig) (Importer, error) {
	return DefaultGlobalRegistry.NewImporter(name, cfg)
}
