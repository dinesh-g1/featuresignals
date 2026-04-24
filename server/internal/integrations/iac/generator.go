package iac

import (
	"context"
	"fmt"
	"sync"
)

// Generator defines the contract for producing IaC configs.
type Generator interface {
	Name() string                          // "terraform", "pulumi", "ansible", "crossplane", "cdk"
	FileExtension() string                 // ".tf", ".ts", ".yml", ".yaml"
	Generate(ctx context.Context, model ResourceModel) ([]GeneratedFile, error)
}

// GeneratedFile represents a single file in the output.
type GeneratedFile struct {
	Path    string `json:"path"`    // relative file path
	Content []byte `json:"content"` // file contents
	Comment string `json:"comment"` // human description (displayed in UI)
}

// ExportConfig controls the migration export behavior.
type ExportConfig struct {
	Format         string // "terraform", "pulumi", "ansible", "crossplane", "cdk", "all"
	OutputDir      string // directory to write generated files
	Namespace      string // namespace / module name for generated configs
	IncludeAPIKeys bool   // whether to include API keys (sensitive)
}

// MultiExporter manages export to multiple IaC formats.
type MultiExporter struct {
	generators map[string]Generator
}

// NewMultiExporter creates a MultiExporter from the global generator registry.
func NewMultiExporter() *MultiExporter {
	return &MultiExporter{
		generators: make(map[string]Generator),
	}
}

// RegisterGenerator adds a generator to the MultiExporter.
func (e *MultiExporter) RegisterGenerator(name string, gen Generator) {
	e.generators[name] = gen
}

// Export generates IaC configs from the common resource model.
func (e *MultiExporter) Export(ctx context.Context, model ResourceModel, config ExportConfig) (map[string][]GeneratedFile, error) {
	results := make(map[string][]GeneratedFile)

	if config.Format == "all" {
		for name, gen := range e.generators {
			files, err := gen.Generate(ctx, model)
			if err != nil {
				return nil, fmt.Errorf("%s: %w", name, err)
			}
			results[name] = files
		}
		return results, nil
	}

	gen, ok := e.generators[config.Format]
	if !ok {
		return nil, fmt.Errorf("unsupported export format: %s", config.Format)
	}

	files, err := gen.Generate(ctx, model)
	if err != nil {
		return nil, err
	}
	results[config.Format] = files
	return results, nil
}

// ─── Registry Pattern ───────────────────────────────────────────────────────
//
// New IaC generators are added by implementing the Generator interface and
// registering the factory in main(). No switch statements. No code changes
// to existing files. Open/Closed Principle.

// GeneratorRegistry holds all registered IaC generator factory functions.
type GeneratorRegistry struct {
	mu        sync.RWMutex
	factories map[string]GeneratorFactory
}

// GeneratorFactory creates a configured Generator instance.
type GeneratorFactory func() Generator

var generatorRegistry = &GeneratorRegistry{
	factories: make(map[string]GeneratorFactory),
}

// RegisterGenerator adds a generator factory to the global registry.
// Called during application startup in main().
//
// Usage:
//
//	import "github.com/featuresignals/server/internal/integrations/iac"
//	iac.RegisterGenerator("terraform", NewTerraformGenerator)
func RegisterGenerator(name string, factory GeneratorFactory) {
	generatorRegistry.mu.Lock()
	defer generatorRegistry.mu.Unlock()
	if _, exists := generatorRegistry.factories[name]; exists {
		panic(fmt.Sprintf("iac: generator %q already registered", name))
	}
	generatorRegistry.factories[name] = factory
}

// NewGenerator creates the appropriate generator for the given provider name.
func NewGenerator(provider string) (Generator, error) {
	generatorRegistry.mu.RLock()
	factory, ok := generatorRegistry.factories[provider]
	generatorRegistry.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("unsupported IaC provider %q — "+
			"available: %v", provider, ListGenerators())
	}

	return factory(), nil
}

// ListGenerators returns all registered generator names.
func ListGenerators() []string {
	generatorRegistry.mu.RLock()
	defer generatorRegistry.mu.RUnlock()

	names := make([]string, 0, len(generatorRegistry.factories))
	for name := range generatorRegistry.factories {
		names = append(names, name)
	}
	return names
}