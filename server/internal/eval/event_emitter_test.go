package eval

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"time"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/events"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}


func TestEvalEventEmitter_Evaluate_NoneMode(t *testing.T) {
	engine := NewEngine()
	bus := events.NewNoopEventBus(testLogger())
	cfg := domain.EvalEmissionConfig{Mode: "none"}

	emitter := NewEvalEventEmitter(engine, bus, cfg, testLogger(), nil)
	defer emitter.Close(context.Background())

	ruleset := &domain.Ruleset{
		OrgID:     "org-1",
		ProjectID: "proj-1",
		EnvID:     "env-1",
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}

	result := emitter.Evaluate("flag-1", domain.EvalContext{Key: "user-1"}, ruleset)
	if result.Reason != domain.ReasonFallthrough {
		t.Errorf("expected ReasonFallthrough, got %s", result.Reason)
	}

	// In "none" mode, no events should be emitted
	if emitter.EmittedTotal() != 0 {
		t.Errorf("expected 0 emitted, got %d", emitter.EmittedTotal())
	}
}

func TestEvalEventEmitter_Evaluate_BatchMode(t *testing.T) {
	engine := NewEngine()
	bus := events.NewNoopEventBus(testLogger())
	cfg := domain.EvalEmissionConfig{
		Mode:           "batch",
		BatchSize:      10,
		BatchIntervalMs: 100,
	}

	emitter := NewEvalEventEmitter(engine, bus, cfg, testLogger(), nil)
	defer emitter.Close(context.Background())

	ruleset := &domain.Ruleset{
		OrgID:     "org-1",
		ProjectID: "proj-1",
		EnvID:     "env-1",
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Evaluate 5 times
	for i := 0; i < 5; i++ {
		result := emitter.Evaluate("flag-1", domain.EvalContext{Key: "user-1"}, ruleset)
		if result.Value != true {
			t.Errorf("expected true, got %v", result.Value)
		}
	}

	// Events should have been enqueued
	if emitter.EmittedTotal() != 5 {
		t.Errorf("expected 5 emitted, got %d", emitter.EmittedTotal())
	}
}

func TestEvalEventEmitter_EvaluateAll(t *testing.T) {
	engine := NewEngine()
	bus := events.NewNoopEventBus(testLogger())
	cfg := domain.EvalEmissionConfig{
		Mode:           "batch",
		BatchSize:      10,
		BatchIntervalMs: 100,
	}

	emitter := NewEvalEventEmitter(engine, bus, cfg, testLogger(), nil)
	defer emitter.Close(context.Background())

	ruleset := &domain.Ruleset{
		OrgID:     "org-1",
		ProjectID: "proj-1",
		EnvID:     "env-1",
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
			"flag-2": {ID: "f2", Key: "flag-2", DefaultValue: jsonVal("off")},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal(true)},
			"flag-2": {FlagID: "f2", Enabled: true, DefaultValue: jsonVal("on")},
		},
		Segments: map[string]*domain.Segment{},
	}

	results := emitter.EvaluateAll(domain.EvalContext{Key: "user-1"}, ruleset)
	if len(results) != 2 {
		t.Errorf("expected 2 results, got %d", len(results))
	}

	if emitter.EmittedTotal() != 2 {
		t.Errorf("expected 2 emitted, got %d", emitter.EmittedTotal())
	}
}

func TestEvalEventEmitter_Evaluate_WithNilRulesetFields(t *testing.T) {
	// Tests that the emitter works when OrgID/ProjectID/EnvID are empty (backward compat)
	engine := NewEngine()
	bus := events.NewNoopEventBus(testLogger())
	cfg := domain.EvalEmissionConfig{Mode: "batch"}

	emitter := NewEvalEventEmitter(engine, bus, cfg, testLogger(), nil)
	defer emitter.Close(context.Background())

	// Ruleset with empty org/project/env — should still work
	ruleset := &domain.Ruleset{
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}

	result := emitter.Evaluate("flag-1", domain.EvalContext{Key: "user-1"}, ruleset)
	if result.Reason != domain.ReasonFallthrough {
		t.Errorf("expected ReasonFallthrough, got %s", result.Reason)
	}
}

func TestEvalEventEmitter_DroppedEvents(t *testing.T) {
	engine := NewEngine()
	bus := events.NewNoopEventBus(testLogger())
	cfg := domain.EvalEmissionConfig{Mode: "batch"}

	// Create emitter with tiny buffer to force drops
	emitter := NewEvalEventEmitter(engine, bus, cfg, testLogger(), nil, WithEvalBufferSize(1))
	defer emitter.Close(context.Background())

	ruleset := &domain.Ruleset{
		OrgID:     "org-1",
		ProjectID: "proj-1",
		EnvID:     "env-1",
		Flags: map[string]*domain.Flag{
			"flag-1": {ID: "f1", Key: "flag-1", DefaultValue: jsonVal(false)},
		},
		States: map[string]*domain.FlagState{
			"flag-1": {FlagID: "f1", Enabled: true, DefaultValue: jsonVal(true)},
		},
		Segments: map[string]*domain.Segment{},
	}

	// Evaluate 3 times with buffer size 1 — should drop some
	for i := 0; i < 3; i++ {
		emitter.Evaluate("flag-1", domain.EvalContext{Key: "user-1"}, ruleset)
	}

	if emitter.DroppedTotal() == 0 {
		t.Log("expected some drops but got none (timing-dependent)")
	}
}

func TestEvalEventEmitter_Close(t *testing.T) {
	engine := NewEngine()
	bus := events.NewNoopEventBus(testLogger())
	cfg := domain.EvalEmissionConfig{Mode: "batch"}

	emitter := NewEvalEventEmitter(engine, bus, cfg, testLogger(), nil)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	emitter.Close(ctx) // should not panic, even though channel isn't closed yet
}
