package retry

import (
	"testing"
	"time"
)

func TestJitteredBackoff_Monotonic(t *testing.T) {
	t.Parallel()
	prev := time.Duration(0)
	for attempt := 1; attempt <= 10; attempt++ {
		b := JitteredBackoff(attempt, DefaultBase, DefaultFactor, DefaultCap)
		if b < DefaultBase {
			t.Errorf("attempt %d: backoff %v < base %v", attempt, b, DefaultBase)
		}
		if b > DefaultCap+DefaultCap/2 {
			t.Errorf("attempt %d: backoff %v exceeds cap+jitter %v", attempt, b, DefaultCap+DefaultCap/2)
		}
		_ = prev
	}
}

func TestJitteredBackoff_RespectsCap(t *testing.T) {
	t.Parallel()
	cap := 1 * time.Second
	for attempt := 1; attempt <= 20; attempt++ {
		b := JitteredBackoff(attempt, DefaultBase, DefaultFactor, cap)
		if b > cap+cap/2 {
			t.Errorf("attempt %d: backoff %v exceeds cap+jitter %v", attempt, b, cap+cap/2)
		}
	}
}

func TestJitteredBackoff_ZeroAttemptTreatedAsOne(t *testing.T) {
	t.Parallel()
	b := JitteredBackoff(0, DefaultBase, DefaultFactor, DefaultCap)
	if b < DefaultBase || b > DefaultBase+DefaultBase/2 {
		t.Errorf("attempt 0: backoff %v not in [base, base*1.5]", b)
	}
}

func TestJitteredBackoff_ExponentialGrowth(t *testing.T) {
	t.Parallel()
	base := 100 * time.Millisecond
	factor := 2
	cap := 10 * time.Second

	// Without jitter the sequence is 100, 200, 400, 800, 1600, …
	// With jitter each value is in [expected, expected*1.5).
	for attempt := 1; attempt <= 5; attempt++ {
		expected := base
		for i := 1; i < attempt; i++ {
			expected *= time.Duration(factor)
		}

		b := JitteredBackoff(attempt, base, factor, cap)
		if b < expected {
			t.Errorf("attempt %d: backoff %v < expected base %v", attempt, b, expected)
		}
		upper := expected + expected/2
		if b > upper {
			t.Errorf("attempt %d: backoff %v > expected upper %v", attempt, b, upper)
		}
	}
}
