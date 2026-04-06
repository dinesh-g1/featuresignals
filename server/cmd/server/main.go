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

	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.opentelemetry.io/contrib/bridges/otelslog"

	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/observability"
	"github.com/featuresignals/server/internal/scheduler"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/status"
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
	var logLevel slog.Level
	switch cfg.LogLevel {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	// OpenTelemetry (async, non-blocking -- safe to init before anything else)
	var otelShutdown func(context.Context) error
	if cfg.OTELEnabled && cfg.OTELEndpoint != "" {
		var otelErr error
		otelShutdown, otelErr = observability.Init(context.Background(), observability.Config{
			Endpoint:       cfg.OTELEndpoint,
			IngestionKey:   cfg.OTELIngestionKey,
			ServiceName:    cfg.OTELServiceName,
			ServiceRegion:  cfg.OTELServiceRegion,
			TracesEnabled:  cfg.OTELTracesEnabled,
			MetricsEnabled: cfg.OTELMetricsEnabled,
			LogsEnabled:    cfg.OTELLogsEnabled,
			SampleRate:     cfg.OTELSampleRate,
		})
		if otelErr != nil {
			logger.Warn("failed to initialize OpenTelemetry (continuing without tracing)", "error", otelErr)
		} else {
			logger.Info("OpenTelemetry initialized",
				"endpoint", cfg.OTELEndpoint,
				"service", cfg.OTELServiceName,
				"region", cfg.OTELServiceRegion,
				"traces", cfg.OTELTracesEnabled,
				"metrics", cfg.OTELMetricsEnabled,
				"logs", cfg.OTELLogsEnabled,
				"sample_rate", cfg.OTELSampleRate,
			)

			if cfg.OTELLogsEnabled {
				otelHandler := otelslog.NewHandler(cfg.OTELServiceName)
				multiHandler := newMultiHandler(logger.Handler(), otelHandler)
				logger = slog.New(multiHandler)
				slog.SetDefault(logger)
			}
		}
	}
	otelInstruments := observability.NewInstruments()
	_ = otelInstruments // used by handlers via closure; full wiring in router TODO

	// Database (with optional pgx tracing via otelpgx)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgxCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to parse database URL", "error", err)
		os.Exit(1)
	}
	if cfg.OTELEnabled && cfg.OTELTracesEnabled {
		pgxCfg.ConnConfig.Tracer = otelpgx.NewTracer()
	}
	pool, err := pgxpool.NewWithConfig(ctx, pgxCfg)
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

	// DB connection pool metrics (reported every 60s via OTEL async reader)
	if cfg.OTELEnabled && cfg.OTELMetricsEnabled {
		observability.StartDBPoolMetrics(context.Background(), pool, cfg.OTELServiceRegion)
	}

	// Components
	store := postgres.NewStore(pool)
	jwtMgr := auth.NewJWTManager(cfg.JWTSecret, cfg.TokenTTL, cfg.RefreshTTL)
	evalMiddlewares := []eval.Middleware{eval.WithLogging(logger)}
	if cfg.OTELEnabled && cfg.OTELTracesEnabled {
		evalMiddlewares = append(evalMiddlewares, eval.WithTracing())
	}
	engine := eval.Chain(eval.NewEngine(), evalMiddlewares...)
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

	// Status handler (public, multi-region health aggregation)
	poolAdapter := status.NewPgxPoolAdapter(pool)
	statusH := status.NewHandler(poolAdapter, poolAdapter, cfg.OTELServiceRegion)

	// Router
	logger.Info("CORS allowed origins", "origins", cfg.CORSOrigins)
	router := api.NewRouter(store, jwtMgr, evalCache, engine, sseServer, logger, cfg.CORSOrigins, metricsCollector, api.BillingConfig{
		PayUMerchantKey: cfg.PayUMerchantKey,
		PayUSalt:        cfg.PayUSalt,
		PayUMode:        cfg.PayUMode,
		DashboardURL:    cfg.DashboardURL,
		AppBaseURL:      cfg.AppBaseURL,
	}, otpSender, cfg.AppBaseURL, cfg.DashboardURL, statusH)

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

	// Drain pending OTEL telemetry before exiting
	if otelShutdown != nil {
		otelDrainCtx, otelDrainCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer otelDrainCancel()
		if err := otelShutdown(otelDrainCtx); err != nil {
			logger.Warn("failed to flush OpenTelemetry telemetry", "error", err)
		}
	}

	logger.Info("server stopped")
}

// multiHandler fans out slog records to multiple handlers (stdout + OTEL).
type multiHandler struct {
	handlers []slog.Handler
}

func newMultiHandler(handlers ...slog.Handler) *multiHandler {
	return &multiHandler{handlers: handlers}
}

func (m *multiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range m.handlers {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (m *multiHandler) Handle(ctx context.Context, r slog.Record) error {
	for _, h := range m.handlers {
		if h.Enabled(ctx, r.Level) {
			if err := h.Handle(ctx, r.Clone()); err != nil {
				return err
			}
		}
	}
	return nil
}

func (m *multiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	handlers := make([]slog.Handler, len(m.handlers))
	for i, h := range m.handlers {
		handlers[i] = h.WithAttrs(attrs)
	}
	return &multiHandler{handlers: handlers}
}

func (m *multiHandler) WithGroup(name string) slog.Handler {
	handlers := make([]slog.Handler, len(m.handlers))
	for i, h := range m.handlers {
		handlers[i] = h.WithGroup(name)
	}
	return &multiHandler{handlers: handlers}
}
