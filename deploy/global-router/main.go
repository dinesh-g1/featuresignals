package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	// ── Structured JSON logging ──────────────────────────────────────
	logLevel := parseLogLevel(os.Getenv("LOG_LEVEL"))
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	// ── Load configuration ───────────────────────────────────────────
	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		configPath = "/etc/router/config.yaml"
	}

	cfg, err := LoadConfig(configPath)
	if err != nil {
		logger.Error("failed to load config", "error", err, "path", configPath)
		os.Exit(1)
	}

	// ── Validate configuration ───────────────────────────────────────
	if err := cfg.Validate(); err != nil {
		logger.Error("invalid configuration", "error", err, "path", configPath)
		os.Exit(1)
	}

	// ── Startup log ──────────────────────────────────────────────────
	tlsStatus := "enabled"
	if os.Getenv("DEV_PORT") != "" {
		tlsStatus = "disabled (dev mode)"
	}
	domainNames := make([]string, len(cfg.Router.Domains))
	for i, d := range cfg.Router.Domains {
		domainNames[i] = d.Name
	}
	logger.Info("global router starting",
		"version", version,
		"config_path", configPath,
		"domain_count", len(cfg.Router.Domains),
		"domains", domainNames,
		"tls", tlsStatus,
		"log_level", logLevel.String(),
	)

	// ── Create router with metrics ───────────────────────────────────
	metrics := NewMetrics()
	router := NewRouter(cfg, metrics)

	// ── Start rate limiter cleanup goroutine ─────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go router.defaultRateLimiter.CleanupLoop(ctx)

	// ── Start DNS server (if enabled) ────────────────────────────────
	dnsServer := NewDNSServer(cfg)
	go func() {
		if err := dnsServer.Start(); err != nil {
			logger.Error("dns server error", "error", err)
		}
	}()

	// ── Build middleware chain ───────────────────────────────────────
	// Order: request ID → metrics → security headers → WAF → rate limiter → conn limiter → serve
	handler := chainMiddleware(
		router,
		router.requestIDMiddleware,
		router.metricsMiddleware,
		router.securityHeadersMiddleware,
		router.wafMiddleware,
		router.rateLimitMiddleware,
		router.connLimitMiddleware,
	)

	// ── Dev mode: HTTP only, no TLS ──────────────────────────────────
	if devPort := os.Getenv("DEV_PORT"); devPort != "" {
		logger.Info("starting dev server", "port", devPort)
		srv := &http.Server{
			Addr:    ":" + devPort,
			Handler: handler,
		}

		go func() {
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				logger.Error("dev server error", "error", err)
				os.Exit(1)
			}
		}()

		// Graceful shutdown
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig

		logger.Info("shutting down")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error("shutdown error", "error", err)
		}
		cancel()
		logger.Info("global router stopped")
		return
	}

	// ── Production mode: TLS with Let's Encrypt ──────────────────────
	tlsSetup, err := router.setupTLS(handler)
	if err != nil {
		logger.Error("failed to configure TLS", "error", err)
		os.Exit(1)
	}

	// HTTP-01 challenge + redirect server on :80
	go func() {
		logger.Info("starting HTTP challenge/redirect server", "addr", ":80")
		if err := tlsSetup.challengeServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP challenge server error", "error", err)
		}
	}()

	// TLS server
	go func() {
		logger.Info("starting TLS server",
			"port", cfg.Router.TLS.Port,
			"domains", domainNames,
		)
		if err := tlsSetup.tlsServer.Serve(tlsSetup.tlsListener); err != nil && err != http.ErrServerClosed {
			logger.Error("TLS server error", "error", err)
			os.Exit(1)
		}
	}()

	// ── Graceful shutdown ────────────────────────────────────────────
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	sigReceived := <-sig

	logger.Info("shutting down", "signal", sigReceived.String())

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Shutdown TLS server first, then challenge server
	if err := tlsSetup.tlsServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("TLS server shutdown error", "error", err)
	}
	if err := tlsSetup.challengeServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("challenge server shutdown error", "error", err)
	}

	cancel()
	logger.Info("global router stopped")
}

// parseLogLevel converts a string to slog.Level. Defaults to info.
func parseLogLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// chainMiddleware composes middleware from outermost to innermost.
// The first middleware in the list is the outermost (runs first on request, last on response).
func chainMiddleware(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}
