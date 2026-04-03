package metrics

import (
	"sync"
	"testing"
)

func TestCollector_Record(t *testing.T) {
	c := NewCollector()
	c.Record("flag-1", "env-1", "match")
	c.Record("flag-1", "env-1", "match")
	c.Record("flag-2", "env-1", "default")

	summary := c.Summary()
	if summary.TotalEvaluations != 3 {
		t.Errorf("expected 3 evaluations, got %d", summary.TotalEvaluations)
	}
	if len(summary.Counters) != 2 {
		t.Errorf("expected 2 counters, got %d", len(summary.Counters))
	}
}

func TestCollector_Summary_Empty(t *testing.T) {
	c := NewCollector()
	summary := c.Summary()
	if summary.TotalEvaluations != 0 {
		t.Errorf("expected 0, got %d", summary.TotalEvaluations)
	}
	if len(summary.Counters) != 0 {
		t.Errorf("expected empty counters, got %d", len(summary.Counters))
	}
}

func TestCollector_Reset(t *testing.T) {
	c := NewCollector()
	c.Record("flag-1", "env-1", "match")
	c.Reset()
	summary := c.Summary()
	if summary.TotalEvaluations != 0 {
		t.Errorf("expected 0 after reset, got %d", summary.TotalEvaluations)
	}
}

func TestCollector_Concurrent(t *testing.T) {
	c := NewCollector()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Record("flag-1", "env-1", "match")
		}()
	}
	wg.Wait()

	summary := c.Summary()
	if summary.TotalEvaluations != 100 {
		t.Errorf("expected 100 after concurrent writes, got %d", summary.TotalEvaluations)
	}
}
