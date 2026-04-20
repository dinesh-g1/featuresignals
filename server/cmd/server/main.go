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
	"github.com/joho/godotenv"
	"go.opentelemetry.io/contrib/bridges/otelslog"

	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/events"
	"github.com/featuresignals/server/internal/lifecycle"
	"github.com/featuresignals/server/internal/mailer"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/migrate"
	"github.com/featuresignals/server/internal/observability"
	"github.com/featuresignals/server/internal/payment"
	payupkg "github.com/featuresignals/server/internal/payment/payu"
	stripepkg "github.com/featuresignals/server/internal/payment/stripe"
	"github.com/featuresignals/server/internal/scheduler"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/status"
	"github.com/featuresignals/server/internal/store/cache"
	"github.com/featuresignals/server/internal/store/postgres"
	"github.com/featuresignals/server/internal/webhook"
	"github.com/featuresignals/server/internal/zeptomail"
)

func main() {
	// Load .env file for local development (no-op in production)
	_ = godotenv.Load()

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

	// Database (with optional pgx tracing via otelpgx)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgxCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to parse database URL", "error", err)
		os.Exit(1)
	}
	pgxCfg.MaxConns = int32(cfg.DBMaxConns)
	pgxCfg.MinConns = int32(cfg.DBMinConns)
	pgxCfg.MaxConnLifetime = 30 * time.Minute
	pgxCfg.MaxConnIdleTime = 5 * time.Minute
	logger.Info("database pool configured", "max_conns", cfg.DBMaxConns, "min_conns", cfg.DBMinConns)
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

	// Run embedded migrations to ensure schema is up to date
	if err := migrate.RunUp(ctx, cfg.DatabaseURL, logger, migrate.ShouldSkip()); err != nil {
		logger.Error("database migration failed", "error", err)
		os.Exit(1)
	}

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
	whDispatcher := webhook.NewDispatcher(store, logger, otelInstruments)
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

	// Email provider — OTP sender + lifecycle mailer selected by EMAIL_PROVIDER
	var otpSender domain.OTPSender
	var lifecycleMailer domain.Mailer

	switch cfg.EmailProvider {
	case "zeptomail":
		zm, err := zeptomail.NewMailer(cfg.ZeptoMailToken, cfg.ZeptoMailFromEmail, cfg.ZeptoMailFromName, cfg.ZeptoMailBaseURL, cfg.DashboardURL, logger)
		if err != nil {
			logger.Error("failed to create ZeptoMail mailer", "error", err)
			lifecycleMailer = mailer.NewNoopMailer(logger)
		} else {
			lifecycleMailer = zm
			logger.Info("ZeptoMail lifecycle mailer configured", "from", cfg.ZeptoMailFromEmail)
		}

		zOTP, err := zeptomail.NewOTPSender(cfg.ZeptoMailToken, cfg.ZeptoMailFromEmail, cfg.ZeptoMailFromName, cfg.ZeptoMailBaseURL, cfg.DashboardURL, logger)
		if err != nil {
			logger.Error("failed to create ZeptoMail OTP sender", "error", err)
		} else {
			otpSender = zOTP
			logger.Info("ZeptoMail OTP sender configured")
		}

	case "smtp":
		if cfg.SMTPHost != "" {
			s, err := email.NewSMTPSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom, cfg.SMTPFromName, cfg.DashboardURL, logger)
			if err != nil {
				logger.Warn("failed to initialize SMTP OTP sender, falling back to noop", "error", err)
				otpSender = mailer.NewNoopMailer(logger)
			} else {
				otpSender = s
				logger.Info("SMTP email OTP sender configured", "host", cfg.SMTPHost, "port", cfg.SMTPPort)
			}
		} else {
			logger.Warn("EMAIL_PROVIDER=smtp but SMTP_HOST not set; email disabled")
			lifecycleMailer = mailer.NewNoopMailer(logger)
		}

	case "none":
		lifecycleMailer = mailer.NewNoopMailer(logger)
		logger.Info("email sending disabled (EMAIL_PROVIDER=none)")

	default:
		lifecycleMailer = mailer.NewNoopMailer(logger)
		logger.Warn("unknown EMAIL_PROVIDER, email disabled", "provider", cfg.EmailProvider)
	}

	// Status handler (public, multi-region health aggregation)
	poolAdapter := status.NewPgxPoolAdapter(pool)
	statusH := status.NewHandler(poolAdapter, poolAdapter, cfg.LocalRegion, store, evalCache, sseServer)

	// Payment gateway registry (Strategy pattern)
	paymentRegistry := payment.NewRegistry()
	if cfg.PayUMerchantKey != "" {
		if err := paymentRegistry.Register(payupkg.NewProvider(cfg.PayUMerchantKey, cfg.PayUSalt, cfg.PayUMode)); err != nil {
			logger.Error("failed to register PayU payment gateway", "error", err)
		} else {
			logger.Info("PayU payment gateway registered", "mode", cfg.PayUMode)
		}
	}
	if cfg.StripeSecretKey != "" {
		if err := paymentRegistry.Register(stripepkg.NewProvider(cfg.StripeSecretKey, cfg.StripeWebhookSecret, cfg.StripePriceID)); err != nil {
			logger.Error("failed to register Stripe payment gateway", "error", err)
		} else {
			logger.Info("Stripe payment gateway registered", "mode", cfg.StripeMode)
		}
	}

	// Product event emitter (async, non-blocking, batched writes)
	eventEmitter := events.NewAsyncEmitter(store, logger)
	defer func() {
		drainCtx, drainCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer drainCancel()
		eventEmitter.Close(drainCtx)
	}()
	logger.Info("product event emitter started")

	// Lifecycle processor gates email delivery via user preferences
	lifecycleProcessor := lifecycle.NewProcessor(lifecycleMailer, store, eventEmitter, logger)
	logger.Info("lifecycle processor started")

	// Lifecycle scheduler (trial reminders, weekly digests, re-engagement)
	settingsURL := cfg.DashboardURL + "/settings"
	lifecycleSched := lifecycle.NewScheduler(store, lifecycleProcessor, eventEmitter, logger, 1*time.Hour, cfg.DashboardURL, settingsURL)
	lifecycleSchedCtx, lifecycleSchedCancel := context.WithCancel(context.Background())
	defer lifecycleSchedCancel()
	go lifecycleSched.Run(lifecycleSchedCtx)

	// Status recorder (records health checks every 5 minutes for uptime history)
	statusRecorderCtx, statusRecorderCancel := context.WithCancel(context.Background())
	defer statusRecorderCancel()
	go runStatusRecorder(statusRecorderCtx, store, statusH, logger)

	// Router with context for rate limiter cleanup
	routerCtx, cancelRouter := context.WithCancel(context.Background())
	defer cancelRouter()
	regionsEnabled := !cfg.IsOnPrem()

	router := api.NewRouter(routerCtx, store, jwtMgr, evalCache, engine, sseServer, logger, metricsCollector, otelInstruments, api.BillingConfig{
		Registry:     paymentRegistry,
		DashboardURL: cfg.DashboardURL,
		AppBaseURL:   cfg.AppBaseURL,
	}, otpSender, cfg.AppBaseURL, cfg.DashboardURL, statusH, cfg.DeploymentMode, cfg.BillingEnabled(), regionsEnabled, eventEmitter, lifecycleProcessor, cfg, lifecycleMailer, cfg.SalesNotifyEmail)

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

// runStatusRecorder periodically records health checks for uptime history.
// It checks all regions every 5 minutes and persists per-component status,
// then prunes records older than 91 days to bound table growth.
func runStatusRecorder(ctx context.Context, store domain.StatusRecorder, statusH *status.Handler, logger *slog.Logger) {
	const interval = 5 * time.Minute
	const retentionDays = 91

	logger.Info("status recorder started", "interval", interval.String(), "retention_days", retentionDays)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	record := func() {
		start := time.Now()
		checkCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()

		gs := statusH.CheckAllRegions(checkCtx)
		now := time.Now().UTC()

		var checks []domain.StatusCheck
		for _, region := range gs.Regions {
			for _, svc := range region.Services {
				checks = append(checks, domain.StatusCheck{
					Region:    region.Region,
					Component: svc.Name,
					Status:    svc.Status,
					LatencyMs: int(svc.Latency),
					Message:   svc.Message,
					CheckedAt: now,
				})
			}
		}

		if err := store.InsertStatusChecks(checkCtx, checks); err != nil {
			logger.Error("status recorder: failed to insert checks", "error", err, "check_count", len(checks))
			return
		}

		logger.Info("status recorder: checks recorded",
			"check_count", len(checks),
			"regions", len(gs.Regions),
			"duration_ms", time.Since(start).Milliseconds(),
		)
	}

	record()

	for {
		select {
		case <-ctx.Done():
			logger.Info("status recorder stopped")
			return
		case <-ticker.C:
			record()
		}
	}
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
