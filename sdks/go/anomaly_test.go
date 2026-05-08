package featuresignals

import (
	"sync"
	"testing"
	"time"
)

func TestAnomalyDetector_RateAnomaly(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 10)
	cfg := AnomalyDetectorConfig{
		RateWindow:       500 * time.Millisecond,
		RateThreshold:    10,
		ContextWindow:    10 * time.Second,
		ContextThreshold: 100,
		DriftWindow:      5 * time.Minute,
	}

	detector := NewAnomalyDetector(&cfg, func(w Warning) {
		warnings <- w
	})

	// Send evaluations below threshold — no warning.
	for i := 0; i < 5; i++ {
		detector.RecordEvaluation("flag-a")
	}

	select {
	case w := <-warnings:
		t.Fatalf("unexpected warning below threshold: %+v", w)
	default:
	}

	// Cross threshold.
	for i := 0; i < 20; i++ {
		detector.RecordEvaluation("flag-a")
	}

	select {
	case w := <-warnings:
		if w.Code != "RATE_ANOMALY" {
			t.Errorf("expected RATE_ANOMALY, got %s", w.Code)
		}
		if w.FlagKey != "flag-a" {
			t.Errorf("expected flag-a, got %s", w.FlagKey)
		}
		if w.Level != WarningWarn {
			t.Errorf("expected WARN level, got %s", w.Level)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for rate anomaly warning")
	}
}

func TestAnomalyDetector_RateAnomaly_Suppression(t *testing.T) {
	t.Parallel()

	var mu sync.Mutex
	var warnings []Warning

	cfg := AnomalyDetectorConfig{
		RateWindow:   500 * time.Millisecond,
		RateThreshold: 5,
	}

	detector := NewAnomalyDetector(&cfg, func(w Warning) {
		mu.Lock()
		warnings = append(warnings, w)
		mu.Unlock()
	})

	// Trigger multiple times rapidly.
	for i := 0; i < 50; i++ {
		detector.RecordEvaluation("flag-b")
	}

	mu.Lock()
	count := len(warnings)
	mu.Unlock()

	// Should only get one warning due to suppression.
	if count != 1 {
		t.Errorf("expected 1 warning due to suppression, got %d", count)
	}
}

func TestAnomalyDetector_ContextAnomaly(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 10)
	cfg := AnomalyDetectorConfig{
		RateWindow:       1 * time.Second,
		RateThreshold:    1000,
		ContextWindow:    500 * time.Millisecond,
		ContextThreshold: 10,
	}

	detector := NewAnomalyDetector(&cfg, func(w Warning) {
		warnings <- w
	})

	// Same flag + same context key repeatedly.
	for i := 0; i < 15; i++ {
		detector.RecordEvaluationWithContext("flag-c", "hardcoded-user")
	}

	select {
	case w := <-warnings:
		if w.Code != "CONTEXT_ANOMALY" {
			t.Errorf("expected CONTEXT_ANOMALY, got %s", w.Code)
		}
		if w.FlagKey != "flag-c" {
			t.Errorf("expected flag-c, got %s", w.FlagKey)
		}
		if w.Level != WarningInfo {
			t.Errorf("expected INFO level, got %s", w.Level)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for context anomaly warning")
	}
}

func TestAnomalyDetector_ContextAnomaly_DifferentFlagsNoTrigger(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 10)
	cfg := AnomalyDetectorConfig{
		RateWindow:       1 * time.Second,
		RateThreshold:    1000,
		ContextWindow:    500 * time.Millisecond,
		ContextThreshold: 10,
	}

	detector := NewAnomalyDetector(&cfg, func(w Warning) {
		warnings <- w
	})

	// Same context across different flags — each composite key stays below
	// threshold, so no warning should fire.
	for i := 0; i < 5; i++ {
		detector.RecordEvaluationWithContext("flag-x", "user-1")
		detector.RecordEvaluationWithContext("flag-y", "user-1")
		detector.RecordEvaluationWithContext("flag-z", "user-1")
	}

	select {
	case w := <-warnings:
		t.Fatalf("unexpected warning for different flags: %+v", w)
	default:
	}
}

func TestAnomalyDetector_DriftAnomaly(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 10)
	detector := NewAnomalyDetector(nil, func(w Warning) {
		warnings <- w
	})

	// First, establish that the flag exists.
	detector.RecordEvaluation("my-feature")

	// Now report it missing — should trigger drift warning.
	detector.RecordMissing("my-feature")

	select {
	case w := <-warnings:
		if w.Code != "DRIFT_ANOMALY" {
			t.Errorf("expected DRIFT_ANOMALY, got %s", w.Code)
		}
		if w.FlagKey != "my-feature" {
			t.Errorf("expected my-feature, got %s", w.FlagKey)
		}
		if w.Level != WarningError {
			t.Errorf("expected ERROR level, got %s", w.Level)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for drift anomaly warning")
	}
}

func TestAnomalyDetector_DriftAnomaly_NoSecondWarning(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 10)
	detector := NewAnomalyDetector(nil, func(w Warning) {
		warnings <- w
	})

	detector.RecordEvaluation("flag-d")
	detector.RecordMissing("flag-d")

	// Drain first warning.
	<-warnings

	// Second miss should NOT fire because we removed from seenFlags.
	detector.RecordMissing("flag-d")

	select {
	case w := <-warnings:
		t.Fatalf("unexpected second drift warning: %+v", w)
	default:
	}
}

func TestAnomalyDetector_NoWarningIfNeverSeen(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 10)
	detector := NewAnomalyDetector(nil, func(w Warning) {
		warnings <- w
	})

	// Flag was never seen — missing should not trigger drift.
	detector.RecordMissing("never-existed")

	select {
	case w := <-warnings:
		t.Fatalf("unexpected drift warning for never-seen flag: %+v", w)
	default:
	}
}

func TestAnomalyDetector_Reset(t *testing.T) {
	t.Parallel()

	var mu sync.Mutex
	var warnings []Warning
	detector := NewAnomalyDetector(nil, func(w Warning) {
		mu.Lock()
		warnings = append(warnings, w)
		mu.Unlock()
	})

	detector.RecordEvaluation("flag-e")
	detector.RecordMissing("flag-e")

	mu.Lock()
	hasWarning := len(warnings) > 0
	mu.Unlock()

	if !hasWarning {
		t.Fatal("expected drift warning before reset")
	}

	detector.Reset()

	// After reset, missing should NOT trigger (no prior seen).
	detector.RecordMissing("flag-e")

	mu.Lock()
	countAfter := len(warnings)
	mu.Unlock()

	if countAfter != 1 {
		t.Errorf("expected no new warnings after reset, got %d total", countAfter)
	}
}

func TestAnomalyDetector_NilHandler(t *testing.T) {
	t.Parallel()

	// Should not panic.
	detector := NewAnomalyDetector(nil, nil)
	detector.RecordEvaluation("f")
	detector.RecordEvaluationWithContext("f", "ctx")
	detector.RecordMissing("f")
	detector.RecordMissing("unknown")
}

func TestAnomalyDetector_SetHandler(t *testing.T) {
	t.Parallel()

	warnings := make(chan Warning, 5)
	detector := NewAnomalyDetector(nil, nil)

	// No handler — no warning.
	detector.RecordEvaluation("g")
	detector.RecordMissing("g")

	detector.SetHandler(func(w Warning) {
		warnings <- w
	})

	// Now set handler and trigger.
	detector.RecordEvaluation("h")
	detector.RecordMissing("h")

	select {
	case w := <-warnings:
		if w.Code != "DRIFT_ANOMALY" {
			t.Errorf("expected DRIFT_ANOMALY, got %s", w.Code)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for warning after SetHandler")
	}
}

func TestAnomalyDetector_Pruning(t *testing.T) {
	t.Parallel()

	cfg := AnomalyDetectorConfig{
		RateWindow:       50 * time.Millisecond,
		RateThreshold:    100,
		ContextWindow:    50 * time.Millisecond,
		ContextThreshold: 100,
	}

	var warnings []Warning
	detector := NewAnomalyDetector(&cfg, func(w Warning) {
		warnings = append(warnings, w)
	})

	// Send a few evaluations.
	for i := 0; i < 5; i++ {
		detector.RecordEvaluation("prune-test")
	}

	// Wait for the window to expire.
	time.Sleep(100 * time.Millisecond)

	// Send one more — the old ones should have been pruned.
	detector.RecordEvaluation("prune-test")

	// If pruning worked, we should have far fewer than 6 in the bucket.
	// We can't inspect internal state directly, but we can verify no
	// false positive warnings were emitted.
	if len(warnings) > 0 {
		t.Errorf("unexpected warnings after pruning: %d", len(warnings))
	}
}

func TestDefaultAnomalyConfig(t *testing.T) {
	cfg := DefaultAnomalyConfig()
	if cfg.RateWindow != 1*time.Second {
		t.Errorf("expected RateWindow 1s, got %v", cfg.RateWindow)
	}
	if cfg.RateThreshold != 1000 {
		t.Errorf("expected RateThreshold 1000, got %d", cfg.RateThreshold)
	}
	if cfg.ContextWindow != 10*time.Second {
		t.Errorf("expected ContextWindow 10s, got %v", cfg.ContextWindow)
	}
	if cfg.ContextThreshold != 100 {
		t.Errorf("expected ContextThreshold 100, got %d", cfg.ContextThreshold)
	}
	if cfg.DriftWindow != 5*time.Minute {
		t.Errorf("expected DriftWindow 5m, got %v", cfg.DriftWindow)
	}
}
