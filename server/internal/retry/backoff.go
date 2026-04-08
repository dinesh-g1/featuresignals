package retry

import (
	"math/rand/v2"
	"time"
)

const (
	DefaultBase   = 200 * time.Millisecond
	DefaultFactor = 2
	DefaultCap    = 30 * time.Second
)

// JitteredBackoff returns an exponentially increasing duration with random
// jitter. attempt is 1-based: attempt 1 returns ~base, attempt 2 returns
// ~base*factor, etc. The result is capped at cap and a random jitter of
// up to 50% of the computed backoff is added.
func JitteredBackoff(attempt int, base time.Duration, factor int, cap time.Duration) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	backoff := base
	for i := 1; i < attempt; i++ {
		backoff *= time.Duration(factor)
		if backoff > cap {
			backoff = cap
			break
		}
	}
	if backoff > cap {
		backoff = cap
	}
	jitter := time.Duration(rand.Int64N(int64(backoff) / 2))
	return backoff + jitter
}
