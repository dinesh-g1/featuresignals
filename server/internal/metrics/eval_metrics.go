package metrics

import (
	"sync"
	"time"
)

type EvalCounter struct {
	FlagKey string `json:"flag_key"`
	EnvID   string `json:"env_id"`
	Reason  string `json:"reason"`
	Count   int64  `json:"count"`
}

type EvalSummary struct {
	TotalEvaluations int64         `json:"total_evaluations"`
	WindowStart      time.Time     `json:"window_start"`
	Counters         []EvalCounter `json:"counters"`
}

type counterKey struct {
	FlagKey string
	EnvID   string
	Reason  string
}

// Collector tracks flag evaluation counts in memory. Thread-safe.
type Collector struct {
	mu          sync.RWMutex
	counters    map[counterKey]int64
	total       int64
	windowStart time.Time
}

func NewCollector() *Collector {
	return &Collector{
		counters:    make(map[counterKey]int64),
		windowStart: time.Now(),
	}
}

func (c *Collector) Record(flagKey, envID, reason string) {
	c.mu.Lock()
	c.counters[counterKey{FlagKey: flagKey, EnvID: envID, Reason: reason}]++
	c.total++
	c.mu.Unlock()
}

func (c *Collector) Summary() EvalSummary {
	c.mu.RLock()
	defer c.mu.RUnlock()

	counters := make([]EvalCounter, 0, len(c.counters))
	for k, v := range c.counters {
		counters = append(counters, EvalCounter{
			FlagKey: k.FlagKey,
			EnvID:   k.EnvID,
			Reason:  k.Reason,
			Count:   v,
		})
	}

	return EvalSummary{
		TotalEvaluations: c.total,
		WindowStart:      c.windowStart,
		Counters:         counters,
	}
}

// Reset clears all counters and starts a new window.
func (c *Collector) Reset() {
	c.mu.Lock()
	c.counters = make(map[counterKey]int64)
	c.total = 0
	c.windowStart = time.Now()
	c.mu.Unlock()
}
