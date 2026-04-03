package metrics

import (
	"sync"
	"testing"
)

func TestImpressionCollector_Record(t *testing.T) {
	c := NewImpressionCollector(1000)
	c.Record("flag-1", "variant-a", "user-1")
	c.Record("flag-1", "variant-b", "user-2")

	summary := c.Summary()
	if len(summary) != 2 {
		t.Errorf("expected 2 summaries, got %d", len(summary))
	}
}

func TestImpressionCollector_Summary_Aggregation(t *testing.T) {
	c := NewImpressionCollector(1000)
	c.Record("flag-1", "variant-a", "user-1")
	c.Record("flag-1", "variant-a", "user-2")
	c.Record("flag-1", "variant-a", "user-3")

	summary := c.Summary()
	if len(summary) != 1 {
		t.Fatalf("expected 1 aggregated summary, got %d", len(summary))
	}
	if summary[0].Count != 3 {
		t.Errorf("expected count 3, got %d", summary[0].Count)
	}
}

func TestImpressionCollector_Flush(t *testing.T) {
	c := NewImpressionCollector(1000)
	c.Record("flag-1", "variant-a", "user-1")
	c.Record("flag-1", "variant-a", "user-2")

	flushed := c.Flush()
	if len(flushed) != 2 {
		t.Errorf("expected 2 flushed impressions, got %d", len(flushed))
	}

	summary := c.Summary()
	if len(summary) != 0 {
		t.Errorf("expected empty summary after flush, got %d", len(summary))
	}
}

func TestImpressionCollector_FlushEmpty(t *testing.T) {
	c := NewImpressionCollector(1000)
	flushed := c.Flush()
	if len(flushed) != 0 {
		t.Errorf("expected 0 flushed impressions, got %d", len(flushed))
	}
}

func TestImpressionCollector_Limit(t *testing.T) {
	c := NewImpressionCollector(10)
	for i := 0; i < 20; i++ {
		c.Record("flag-1", "variant-a", "user")
	}

	flushed := c.Flush()
	if len(flushed) > 15 {
		t.Errorf("expected impressions to be capped around limit, got %d", len(flushed))
	}
}

func TestImpressionCollector_Concurrent(t *testing.T) {
	c := NewImpressionCollector(10000)
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.Record("flag-1", "variant-a", "user")
		}()
	}
	wg.Wait()

	flushed := c.Flush()
	if len(flushed) != 100 {
		t.Errorf("expected 100 impressions after concurrent writes, got %d", len(flushed))
	}
}
