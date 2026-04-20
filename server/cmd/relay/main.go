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
)

func main() {
	var (
		apiKey   = flag.String("api-key", os.Getenv("FS_API_KEY"), "FeatureSignals environment API key")
		envKey   = flag.String("env-key", os.Getenv("FS_ENV_KEY"), "Environment slug (e.g. production)")
		upstream = flag.String("upstream", envOr("FS_UPSTREAM", "https://api.featuresignals.com"), "Upstream API URL")
		port     = flag.Int("port", 8090, "Port to listen on")
		poll     = flag.Duration("poll", 30*time.Second, "Polling interval")
		sse      = flag.Bool("sse", true, "Use SSE streaming for real-time updates")
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

	if err := proxy.Sync(ctx); err != nil {
		logger.Error("initial sync failed", "error", err)
		os.Exit(1)
	}
	logger.Info("initial sync complete", "flags", proxy.FlagCount())

	if *sse {
		go proxy.StreamLoop(ctx)
	} else {
		go proxy.PollLoop(ctx)
	}

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
		logger.Info("relay proxy starting", "port", *port, "upstream", *upstream)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-done
	logger.Info("shutting down...")
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutCancel()
	srv.Shutdown(shutCtx)
}

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
