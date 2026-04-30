// Package launchdarkly provides a stub LaunchDarkly API client.
// This is a minimal stub for the deleted integrations package.
package launchdarkly

import (
	"context"
	"fmt"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/integrations"
)

// Client is a stub LaunchDarkly API client.
type Client struct {
	apiKey  string
	baseURL string
}

// LDEnvironment represents a LaunchDarkly environment.
type LDEnvironment struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

// LDFlag represents a LaunchDarkly feature flag.
type LDFlag struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Kind        string `json:"kind"`
	Description string `json:"description"`
	Archived    bool   `json:"archived"`
	Temporary   bool   `json:"temporary"`
	Variations  []LDVariation `json:"variations"`
}

// LDVariation represents a flag variation in LaunchDarkly.
type LDVariation struct {
	Value interface{} `json:"value"`
	Name  string      `json:"name"`
}

// NewClient creates a new stub LaunchDarkly client.
func NewClient(apiKey, baseURL string) *Client {
	return &Client{apiKey: apiKey, baseURL: baseURL}
}

// FetchEnvironments fetches environments from LaunchDarkly.
// Stub: returns a placeholder environment.
func (c *Client) FetchEnvironments(ctx context.Context, projectKey string) ([]LDEnvironment, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("launchdarkly API key is required")
	}
	return []LDEnvironment{
		{Key: "production", Name: "Production"},
		{Key: "staging", Name: "Staging"},
		{Key: "development", Name: "Development"},
	}, nil
}

// FetchFlags fetches feature flags from LaunchDarkly.
// Stub: returns an empty list.
func (c *Client) FetchFlags(ctx context.Context, projectKey string) ([]LDFlag, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("launchdarkly API key is required")
	}
	return []LDFlag{}, nil
}

// MapLDFlagToDomain stubs the mapping of an LDFlag to a domain import.
func MapLDFlagToDomain(flag LDFlag, envs []LDEnvironment) (*FlagImport, error) {
	return &FlagImport{Flag: domain.Flag{Key: flag.Key, Name: flag.Name}}, nil
}

// FlagImport represents a mapped flag from LaunchDarkly.
type FlagImport struct {
	Flag   domain.Flag
	States map[string]*domain.FlagState
}

// NewImporter creates a new LaunchDarkly importer implementing integrations.Importer.
func NewImporter(cfg integrations.ImporterConfig) integrations.Importer {
	return &ldImporter{
		client: NewClient(cfg.APIKey, cfg.BaseURL),
	}
}

type ldImporter struct {
	client *Client
}

func (i *ldImporter) Name() string         { return "launchdarkly" }
func (i *ldImporter) DisplayName() string   { return "LaunchDarkly" }
func (i *ldImporter) Capabilities() []string { return []string{"flags", "environments", "segments"} }

func (i *ldImporter) ValidateConnection(ctx context.Context) error {
	if i.client.apiKey == "" {
		return fmt.Errorf("launchdarkly API key is required")
	}
	return nil
}

func (i *ldImporter) FetchFlags(ctx context.Context) ([]integrations.Flag, error) {
	ldFlags, err := i.client.FetchFlags(ctx, "")
	if err != nil {
		return nil, err
	}
	flags := make([]integrations.Flag, 0, len(ldFlags))
	for _, f := range ldFlags {
		flags = append(flags, integrations.Flag{
			Key:         f.Key,
			Name:        f.Name,
			Description: f.Description,
			Enabled:     !f.Archived,
		})
	}
	return flags, nil
}

func (i *ldImporter) FetchEnvironments(ctx context.Context) ([]integrations.Environment, error) {
	ldEnvs, err := i.client.FetchEnvironments(ctx, "")
	if err != nil {
		return nil, err
	}
	envs := make([]integrations.Environment, 0, len(ldEnvs))
	for _, e := range ldEnvs {
		envs = append(envs, integrations.Environment{
			Key:  e.Key,
			Name: e.Name,
		})
	}
	return envs, nil
}

func (i *ldImporter) FetchSegments(ctx context.Context) ([]integrations.Segment, error) {
	return nil, nil
}