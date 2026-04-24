// Command relay runs a lightweight relay proxy that sits between SDKs and the
// FeatureSignals API. It caches rulesets locally and evaluates flags with zero
// latency after the initial sync. Useful for:
//   - On-premises deployments with intermittent connectivity
//   - Reducing load on the central API
//   - Serving SDKs that can't maintain streaming connections
//
// Usage:
//
//	relay -api-key <key> -env-key <env> -upstream https://api.featuresignals.com -port 8090
//
// Redis integration:
//
//	relay -api-key <key> -env-key <env> -redis-url redis://localhost:6379/0
//
// When -redis-url is provided, the relay subscribes to the ruleset:updates
// channel for real-time flag invalidation from all server instances. When
// Redis is not configured, it falls back to polling or SSE.
//
// To build with a real Redis driver:
//
//	go get github.com/redis/go-redis/v9
//	go build -tags redis ./cmd/relay
//
// Without the redis build tag, all Redis operations are no-ops (logged at
// debug level and discarded).
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/featuresignals/server/internal/events"
)

func main() {
	var (
		apiKey   = flag.String("api-key", os.Getenv("FS_API_KEY"), "FeatureSignals environment API key")
		envKey   = flag.String("env-key", os.Getenv("FS_ENV_KEY"), "Environment slug (e.g. production)")
		upstream = flag.String("upstream", envOr("FS_UPSTREAM", "https://api.featuresignals.com"), "Upstream API URL")
		port     = flag.Int("port", 8090, "Port to listen on")
		poll     = flag.Duration("poll", 30*time.Second, "Polling interval (used when SSE and Redis are disabled)")
		sse      = flag.Bool("sse", true, "Use SSE streaming for real-time updates (fallback when Redis not configured)")
		redisURL = flag.String("redis-url", os.Getenv("FS_REDIS_URL"), "Redis URL for Pub/Sub cross-instance communication (e.g. redis://localhost:6379/0)")
	)
	flag.Parse()

	if *apiKey == "" || *envKey == "" {
		fmt.Fprintln(os.Stderr, "error: -api-key and -env-key are required (or set FS_API_KEY / FS_ENV_KEY)")
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	proxy := &RelayProxy{
		apiKey:   *apiKey,
		envKey:   *envKey,
		upstream: strings.TrimRight(*upstream, "/"),
		pollDur:  *poll,
		useSSE:   *sse,
		http:     &http.Client{Timeout: 15 * time.Second},
		logger:   logger,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initial sync — populate the local flag cache before serving requests.
	if err := proxy.Sync(ctx); err != nil {
		logger.Error("initial sync failed", "error", err)
		os.Exit(1)
	}
	logger.Info("initial sync complete", "flags", proxy.FlagCount())

	// ── Redis subscription ────────────────────────────────────────────────
	// If a Redis URL is configured, subscribe to ruleset:updates for
	// cross-instance flag cache invalidation. Otherwise fall back to the
	// traditional polling or SSE mechanism.
	redisClient := connectRedis(*redisURL, logger)

	// Wrap the RedisClient in a subscriber. The subscriber handles
	// reconnection with exponential backoff internally.
	subscriber := events.NewRedisSubscriber(
		func() (events.RedisClient, error) {
			// On reconnection we return a fresh client. The actual reconnection
			// logic depends on the underlying driver; for the no-op client this
			// is a trivial no-op.
			return connectRedis(*redisURL, logger), nil
		},
		events.RulesetChannel,
		logger,
	)

	// Start Redis listener in a goroutine. Each received RulesetEvent triggers
	// a full sync of that environment's flags.
	go func() {
		logger.Info("starting Redis subscriber", "channel", events.RulesetChannel)
		if err := subscriber.Listen(ctx, func(event events.RulesetEvent) {
			logger.Info("received ruleset update via Redis, re-syncing",
				"org_id", event.OrgID,
				"project_id", event.ProjectID,
				"env_id", event.EnvID,
				"type", event.Type,
				"flag_key", event.FlagKey,
			)
			// Re-sync the full flag set. In a more advanced implementation we
			// could sync only the affected environment, but a full sync is
			// inexpensive given the expected data volume.
			if err := proxy.Sync(ctx); err != nil {
				logger.Error("sync after Redis event failed", "error", err)
			}
		}); err != nil && ctx.Err() == nil {
			logger.Error("Redis subscriber exited unexpectedly", "error", err)
		}
	}()

	// ── Fallback update mechanisms ───────────────────────────────────────
	// These run only when Redis is not configured. When Redis IS configured,
	// the subscriber above handles all real-time updates and these loops
	// log a debug message and do nothing.
	if *redisURL == "" {
		if *sse {
			go proxy.StreamLoop(ctx)
		} else {
			go proxy.PollLoop(ctx)
		}
	} else {
		logger.Info("redis configured, disabling poll/SSE fallback")
		// Still start poll as a safety net in case Redis subscription drops
		// and the subscriber reconnection takes longer than expected.
		go proxy.PollLoop(ctx)
	}

	// ── HTTP server ──────────────────────────────────────────────────────
	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/client/{envKey}/flags", proxy.HandleFlags)
	mux.HandleFunc("GET /health", proxy.HandleHealth)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", *port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Info("relay proxy starting",
			"port", *port,
			"upstream", *upstream,
			"redis", *redisURL != "",
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// ── Graceful shutdown ────────────────────────────────────────────────
	<-done
	logger.Info("shutting down...")

	// Shutdown the subscriber first to stop processing new events.
	subscriber.Close()
	redisClient.Close()

	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	srv.Shutdown(shutCtx)
}

// ─── Redis client wiring ──────────────────────────────────────────────────────

// connectRedis returns a RedisClient for the given URL. If the URL is empty,
// it returns a no-op client. If the URL is non-empty but no real Redis driver
// has been compiled in (via the "redis" build tag), it logs a warning and
// returns a no-op client.
//
// To enable real Redis support, build with:
//
//	go build -tags redis ./cmd/relay
//
// and ensure github.com/redis/go-redis/v9 is in go.mod.
// connectRedis returns a RedisClient for the given URL. It is set by an init
// function in one of the rediswire_*.go files — the default is a no-op client
// that logs and discards everything; building with -tags redis wires in a real
// Redis driver.
var connectRedis func(url string, logger *slog.Logger) events.RedisClient

// ─── RelayProxy ──────────────────────────────────────────────────────────────

// RelayProxy caches flags from the upstream FeatureSignals API.
type RelayProxy struct {
	apiKey   string
	envKey   string
	upstream string
	pollDur  time.Duration
	useSSE   bool
	http     *http.Client
	logger   *slog.Logger

	mu    sync.RWMutex
	flags map[string]interface{}
	ready bool
}

func (p *RelayProxy) Sync(ctx context.Context) error {
	url := fmt.Sprintf("%s/v1/client/%s/flags?key=relay", p.upstream, p.envKey)
	reqCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, "GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-API-Key", p.apiKey)

	resp, err := p.http.Do(req)
	if err != nil {
		return fmt.Errorf("sync: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sync: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var flags map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&flags); err != nil {
		return fmt.Errorf("sync decode: %w", err)
	}

	p.mu.Lock()
	p.flags = flags
	p.ready = true
	p.mu.Unlock()

	p.logger.Debug("synced flags", "count", len(flags))
	return nil
}

func (p *RelayProxy) FlagCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.flags)
}

func (p *RelayProxy) PollLoop(ctx context.Context) {
	ticker := time.NewTicker(p.pollDur)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := p.Sync(ctx); err != nil {
				p.logger.Error("poll sync failed", "error", err)
			}
		}
	}
}

func (p *RelayProxy) StreamLoop(ctx context.Context) {
	for {
		if err := p.connectSSE(ctx); err != nil {
			p.logger.Error("SSE failed", "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(5 * time.Second):
		}
	}
}

func (p *RelayProxy) connectSSE(ctx context.Context) error {
	url := fmt.Sprintf("%s/v1/stream/%s?api_key=%s", p.upstream, p.envKey, p.apiKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")

	sseClient := &http.Client{Timeout: 5 * 60 * time.Second}
	resp, err := sseClient.Do(req)
	if err != nil {
		return fmt.Errorf("SSE connect: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("SSE: HTTP %d: %s", resp.StatusCode, string(body))
	}

	scanner := bufio.NewScanner(resp.Body)
	var eventType string
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "event:") {
			eventType = strings.TrimSpace(line[6:])
		} else if strings.HasPrefix(line, "data:") {
			if eventType == "flag-update" {
				if err := p.Sync(ctx); err != nil {
					p.logger.Error("sync after SSE event failed", "error", err)
				}
			}
			eventType = ""
		}
	}
	return scanner.Err()
}

func (p *RelayProxy) HandleFlags(w http.ResponseWriter, r *http.Request) {
	p.mu.RLock()
	flags := p.flags
	p.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(flags)
}

func (p *RelayProxy) HandleHealth(w http.ResponseWriter, r *http.Request) {
	p.mu.RLock()
	ready := p.ready
	count := len(p.flags)
	p.mu.RUnlock()

	status := "ok"
	code := 200
	if !ready {
		status = "not_ready"
		code = 503
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": status,
		"flags":  count,
	})
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}