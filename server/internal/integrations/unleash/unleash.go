// Package unleash provides a stub Unleash importer.
package unleash

import (
	"context"

	"github.com/featuresignals/server/internal/integrations"
)

// NewImporter creates a new Unleash importer stub.
func NewImporter(cfg integrations.ImporterConfig) integrations.Importer {
	return &importer{name: "unleash", displayName: "Unleash"}
}

type importer struct {
	name        string
	displayName string
}

func (i *importer) Name() string                     { return i.name }
func (i *importer) DisplayName() string               { return i.displayName }
func (i *importer) Capabilities() []string             { return []string{"flags", "environments", "segments"} }
func (i *importer) ValidateConnection(ctx context.Context) error { return nil }
func (i *importer) FetchFlags(ctx context.Context) ([]integrations.Flag, error) { return nil, nil }
func (i *importer) FetchEnvironments(ctx context.Context) ([]integrations.Environment, error) { return nil, nil }
func (i *importer) FetchSegments(ctx context.Context) ([]integrations.Segment, error) { return nil, nil }