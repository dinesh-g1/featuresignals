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

type valueKey struct {
	FlagKey string
	EnvID   string
	Bucket  string // "true", "false", or truncated string for non-boolean values
}

// FlagInsight holds per-flag value distribution data.
type FlagInsight struct {
	FlagKey        string  `json:"flag_key"`
	TotalCount     int64   `json:"total_count"`
	TrueCount      int64   `json:"true_count"`
	FalseCount     int64   `json:"false_count"`
	TruePercentage float64 `json:"true_percentage"`
}

// Collector tracks flag evaluation counts in memory. Thread-safe.
type Collector struct {
	mu            sync.RWMutex
	counters      map[counterKey]int64
	valueCounters map[valueKey]int64
	total         int64
	windowStart   time.Time
}

func NewCollector() *Collector {
	return &Collector{
		counters:      make(map[counterKey]int64),
		valueCounters: make(map[valueKey]int64),
		windowStart:   time.Now(),
	}
}

func (c *Collector) Record(flagKey, envID, reason string) {
	c.mu.Lock()
	c.counters[counterKey{FlagKey: flagKey, EnvID: envID, Reason: reason}]++
	c.total++
	c.mu.Unlock()
}

// RecordValue tracks the evaluated value for insights (true/false distribution).
func (c *Collector) RecordValue(flagKey, envID string, value interface{}) {
	bucket := "other"
	switch v := value.(type) {
	case bool:
		if v {
			bucket = "true"
		} else {
			bucket = "false"
		}
	case string:
		if len(v) > 20 {
			bucket = v[:20]
		} else {
			bucket = v
		}
	}
	c.mu.Lock()
	c.valueCounters[valueKey{FlagKey: flagKey, EnvID: envID, Bucket: bucket}]++
	c.mu.Unlock()
}

// Insights returns per-flag value distribution for a given environment.
func (c *Collector) Insights(envID string) []FlagInsight {
	c.mu.RLock()
	defer c.mu.RUnlock()

	totals := make(map[string]int64)
	trueCounts := make(map[string]int64)
	falseCounts := make(map[string]int64)

	for k, v := range c.valueCounters {
		if k.EnvID != envID {
			continue
		}
		totals[k.FlagKey] += v
		switch k.Bucket {
		case "true":
			trueCounts[k.FlagKey] += v
		case "false":
			falseCounts[k.FlagKey] += v
		}
	}

	insights := make([]FlagInsight, 0, len(totals))
	for flagKey, total := range totals {
		tc := trueCounts[flagKey]
		pct := float64(0)
		if total > 0 {
			pct = float64(tc) / float64(total) * 100
		}
		insights = append(insights, FlagInsight{
			FlagKey:        flagKey,
			TotalCount:     total,
			TrueCount:      tc,
			FalseCount:     falseCounts[flagKey],
			TruePercentage: pct,
		})
	}
	return insights
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
	c.valueCounters = make(map[valueKey]int64)
	c.total = 0
	c.windowStart = time.Now()
	c.mu.Unlock()
}
