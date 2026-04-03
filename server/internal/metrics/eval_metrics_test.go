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

func TestCollector_RecordValue_BoolDistribution(t *testing.T) {
	c := NewCollector()
	c.RecordValue("flag-1", "env-1", true)
	c.RecordValue("flag-1", "env-1", true)
	c.RecordValue("flag-1", "env-1", false)
	c.RecordValue("flag-2", "env-1", false)
	c.RecordValue("flag-2", "env-1", false)

	insights := c.Insights("env-1")
	if len(insights) != 2 {
		t.Fatalf("expected 2 flag insights, got %d", len(insights))
	}

	byFlag := make(map[string]FlagInsight)
	for _, i := range insights {
		byFlag[i.FlagKey] = i
	}

	f1 := byFlag["flag-1"]
	if f1.TrueCount != 2 || f1.FalseCount != 1 || f1.TotalCount != 3 {
		t.Errorf("flag-1 wrong: true=%d false=%d total=%d", f1.TrueCount, f1.FalseCount, f1.TotalCount)
	}
	if f1.TruePercentage < 66 || f1.TruePercentage > 67 {
		t.Errorf("flag-1 pct should be ~66.67, got %f", f1.TruePercentage)
	}

	f2 := byFlag["flag-2"]
	if f2.TrueCount != 0 || f2.FalseCount != 2 || f2.TotalCount != 2 {
		t.Errorf("flag-2 wrong: true=%d false=%d total=%d", f2.TrueCount, f2.FalseCount, f2.TotalCount)
	}
}

func TestCollector_Insights_EnvScoped(t *testing.T) {
	c := NewCollector()
	c.RecordValue("flag-1", "env-1", true)
	c.RecordValue("flag-1", "env-2", false)

	insights := c.Insights("env-1")
	if len(insights) != 1 {
		t.Fatalf("expected 1 insight for env-1, got %d", len(insights))
	}
	if insights[0].TrueCount != 1 {
		t.Errorf("expected true_count=1, got %d", insights[0].TrueCount)
	}
}

func TestCollector_Reset_ClearsValues(t *testing.T) {
	c := NewCollector()
	c.RecordValue("flag-1", "env-1", true)
	c.Reset()
	insights := c.Insights("env-1")
	if len(insights) != 0 {
		t.Errorf("expected 0 insights after reset, got %d", len(insights))
	}
}
