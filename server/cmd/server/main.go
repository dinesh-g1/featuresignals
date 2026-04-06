package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/scheduler"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/store/cache"
	"github.com/featuresignals/server/internal/store/postgres"
	"github.com/featuresignals/server/internal/webhook"
)

func main() {
	cfg := config.Load()

	if cfg.JWTSecret == "dev-secret-change-in-production" && cfg.LogLevel != "debug" {
		fmt.Fprintln(os.Stderr, "FATAL: JWT_SECRET is set to the default value. Set a strong secret for non-development environments.")
		os.Exit(1)
	}

	// Logger
	logLevel := slog.LevelInfo
	if cfg.LogLevel == "debug" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	// Database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Error("failed to ping database", "error", err)
		os.Exit(1)
	}
	logger.Info("connected to database")

	// Components
	store := postgres.NewStore(pool)
	jwtMgr := auth.NewJWTManager(cfg.JWTSecret, cfg.TokenTTL, cfg.RefreshTTL)
	engine := eval.Chain(eval.NewEngine(), eval.WithLogging(logger))
	sseServer := sse.NewServer(logger)
	evalCache := cache.NewCache(store, logger, sseServer)

	// Webhook dispatcher
	whDispatcher := webhook.NewDispatcher(store, logger)
	whCtx, whCancel := context.WithCancel(context.Background())
	defer whCancel()
	whDispatcher.Start(whCtx)

	// Wire webhook notifier into cache so PG NOTIFY triggers webhook dispatch.
	// The store implements OrgResolver, resolving orgID from envID via the projects table.
	evalCache.SetWebhookNotifier(webhook.NewNotifier(whDispatcher, store))

	// Flag scheduler (auto-enable/disable at scheduled times)
	sched := scheduler.New(store, logger, 30*time.Second, cfg.AuditRetentionDays)
	schedCtx, schedCancel := context.WithCancel(context.Background())
	defer schedCancel()
	go sched.Start(schedCtx)

	// Start listening for PG NOTIFY changes
	listenCtx, listenCancel := context.WithCancel(context.Background())
	defer listenCancel()
	if err := evalCache.StartListening(listenCtx); err != nil {
		logger.Warn("failed to start PG LISTEN (cache invalidation disabled)", "error", err)
	}

	// Evaluation metrics collector
	metricsCollector := metrics.NewCollector()

	// OTP email sender (MSG91 Email API)
	var otpSender email.OTPSender
	if cfg.MSG91AuthKey != "" && cfg.MSG91EmailTemplateID != "" {
		msg91Sender, err := email.NewMSG91Sender(
			cfg.MSG91AuthKey,
			cfg.MSG91EmailTemplateID,
			cfg.MSG91EmailDomain,
			cfg.MSG91EmailFrom,
			cfg.MSG91EmailFromName,
		)
		if err != nil {
			logger.Error("failed to create MSG91 email sender", "error", err)
		} else {
			otpSender = msg91Sender
			logger.Info("MSG91 email OTP sender configured", "domain", cfg.MSG91EmailDomain)
		}
	}

	// Router
	logger.Info("CORS allowed origins", "origins", cfg.CORSOrigins)
	router := api.NewRouter(store, jwtMgr, evalCache, engine, sseServer, logger, cfg.CORSOrigins, metricsCollector, api.BillingConfig{
		PayUMerchantKey: cfg.PayUMerchantKey,
		PayUSalt:        cfg.PayUSalt,
		PayUMode:        cfg.PayUMode,
		DashboardURL:    cfg.DashboardURL,
		AppBaseURL:      cfg.AppBaseURL,
	}, otpSender, cfg.AppBaseURL, cfg.DashboardURL)

	// Server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-done
	logger.Info("shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown error", "error", err)
	}
	logger.Info("server stopped")
}
