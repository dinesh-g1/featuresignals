// Package integrations provides a stub provider registry for feature flag
// migration importers. This is a replacement for the deleted integrations
// package that was removed in Phase 0 cleanup.
package integrations

import (
	"context"
	"fmt"
)

// ImporterConfig holds configuration for creating an importer instance.
type ImporterConfig struct {
	APIKey     string
	BaseURL    string
	ProjectKey string
}

// Importer defines the interface for a migration source provider.
type Importer interface {
	Name() string
	DisplayName() string
	Capabilities() []string
	ValidateConnection(ctx context.Context) error
	FetchFlags(ctx context.Context) ([]Flag, error)
	FetchEnvironments(ctx context.Context) ([]Environment, error)
	FetchSegments(ctx context.Context) ([]Segment, error)
}

// Flag represents a feature flag from a source provider.
type Flag struct {
	Key          string
	Name         string
	Enabled      bool
	Description  string
	Environments map[string]bool
}

// Environment represents an environment from a source provider.
type Environment struct {
	Key  string
	Name string
}

// Segment represents a user segment from a source provider.
type Segment struct {
	Key         string
	Name        string
	Description string
}

// ImporterFactory creates a new Importer with the given config.
type ImporterFactory func(ImporterConfig) Importer

var (
	providers   = make(map[string]ImporterFactory)
	providerErr error
)

// Register registers a named importer factory.
func Register(name string, factory ImporterFactory) {
	providers[name] = factory
}

// ListProviders returns all registered provider names.
func ListProviders() []string {
	names := make([]string, 0, len(providers))
	for name := range providers {
		names = append(names, name)
	}
	return names
}

// NewImporter creates a new Importer for the named provider.
func NewImporter(name string, config ImporterConfig) (Importer, error) {
	factory, ok := providers[name]
	if !ok {
		return nil, fmt.Errorf("unknown provider: %s", name)
	}
	return factory(config), nil
}