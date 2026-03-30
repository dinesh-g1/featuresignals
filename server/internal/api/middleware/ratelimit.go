package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/httputil"
)

type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int
	window   time.Duration
}

type visitor struct {
	count    int
	resetAt  time.Time
}

func RateLimit(requestsPerMinute int) func(http.Handler) http.Handler {
	rl := &rateLimiter{
		visitors: make(map[string]*visitor),
		rate:     requestsPerMinute,
		window:   time.Minute,
	}

	// Cleanup old entries periodically
	go func() {
		for {
			time.Sleep(time.Minute)
			rl.mu.Lock()
			now := time.Now()
			for k, v := range rl.visitors {
				if now.After(v.resetAt) {
					delete(rl.visitors, k)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.RemoteAddr
			if apiKey := r.Header.Get("X-API-Key"); apiKey != "" {
				key = apiKey[:min(12, len(apiKey))]
			}

			rl.mu.Lock()
			v, exists := rl.visitors[key]
			now := time.Now()
			if !exists || now.After(v.resetAt) {
				rl.visitors[key] = &visitor{count: 1, resetAt: now.Add(rl.window)}
				rl.mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}
			v.count++
			if v.count > rl.rate {
				rl.mu.Unlock()
				httputil.Error(w, http.StatusTooManyRequests, "rate limit exceeded")
				return
			}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
		})
	}
}
