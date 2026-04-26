// Package flagsmith provides a stub Flagsmith importer for feature flag migration.
package flagsmith

import (
	"context"
	"fmt"

	"github.com/featuresignals/server/internal/integrations"
)

// NewImporter creates a new Flagsmith importer.
func NewImporter(cfg integrations.ImporterConfig) integrations.Importer {
	return &importer{cfg: cfg}
}

type importer struct {
	cfg integrations.ImporterConfig
}

func (i *importer) Name() string           { return "flagsmith" }
func (i *importer) DisplayName() string    { return "Flagsmith" }
func (i *importer) Capabilities() []string { return []string{"flags", "environments", "segments"} }

func (i *importer) ValidateConnection(ctx context.Context) error {
	if i.cfg.APIKey == "" {
		return fmt.Errorf("flagsmith: API key is required")
	}
	return nil
}

func (i *importer) FetchFlags(ctx context.Context) ([]integrations.Flag, error) {
	return nil, fmt.Errorf("flagsmith: not implemented in community edition")
}

func (i *importer) FetchEnvironments(ctx context.Context) ([]integrations.Environment, error) {
	return nil, fmt.Errorf("flagsmith: not implemented in community edition")
}

func (i *importer) FetchSegments(ctx context.Context) ([]integrations.Segment, error) {
	return nil, fmt.Errorf("flagsmith: not implemented in community edition")
}