package metrics

import (
	"sync"
	"time"
)

// Impression records that a specific user saw a specific variant.
type Impression struct {
	FlagKey    string `json:"flag_key"`
	VariantKey string `json:"variant_key"`
	UserKey    string `json:"user_key"`
	Timestamp  int64  `json:"timestamp"`
}

// ImpressionSummary is a per-flag/variant count of impressions.
type ImpressionSummary struct {
	FlagKey    string `json:"flag_key"`
	VariantKey string `json:"variant_key"`
	Count      int64  `json:"count"`
}

// ImpressionCollector stores A/B experiment impressions in memory for export.
type ImpressionCollector struct {
	mu          sync.Mutex
	impressions []Impression
	limit       int
}

func NewImpressionCollector(limit int) *ImpressionCollector {
	if limit <= 0 {
		limit = 100_000
	}
	return &ImpressionCollector{
		impressions: make([]Impression, 0, 1024),
		limit:       limit,
	}
}

func (c *ImpressionCollector) Record(flagKey, variantKey, userKey string) {
	c.mu.Lock()
	if len(c.impressions) >= c.limit {
		c.impressions = c.impressions[len(c.impressions)/2:]
	}
	c.impressions = append(c.impressions, Impression{
		FlagKey:    flagKey,
		VariantKey: variantKey,
		UserKey:    userKey,
		Timestamp:  time.Now().UnixMilli(),
	})
	c.mu.Unlock()
}

// Summary returns per-flag/variant counts.
func (c *ImpressionCollector) Summary() []ImpressionSummary {
	c.mu.Lock()
	defer c.mu.Unlock()

	type key struct{ flag, variant string }
	m := make(map[key]int64)
	for _, imp := range c.impressions {
		m[key{imp.FlagKey, imp.VariantKey}]++
	}

	result := make([]ImpressionSummary, 0, len(m))
	for k, v := range m {
		result = append(result, ImpressionSummary{
			FlagKey:    k.flag,
			VariantKey: k.variant,
			Count:      v,
		})
	}
	return result
}

// Flush returns all impressions and clears the buffer.
func (c *ImpressionCollector) Flush() []Impression {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := c.impressions
	c.impressions = make([]Impression, 0, 1024)
	return out
}
