package main

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/exaring/otelpgx"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"go.opentelemetry.io/contrib/bridges/otelslog"

	"github.com/featuresignals/server/internal/agent"
	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/api/handlers"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/events"
	"github.com/featuresignals/server/internal/integrations"
	"github.com/featuresignals/server/internal/integrations/flagsmith"
	"github.com/featuresignals/server/internal/integrations/iac"
	"github.com/featuresignals/server/internal/integrations/launchdarkly"
	"github.com/featuresignals/server/internal/integrations/unleash"
	"github.com/featuresignals/server/internal/janitor"
	"github.com/featuresignals/server/internal/janitor/bitbucket"
	"github.com/featuresignals/server/internal/janitor/codeanalysis"
	"github.com/featuresignals/server/internal/janitor/codeanalysis/deepseek"
	"github.com/featuresignals/server/internal/janitor/codeanalysis/openai"
	"github.com/featuresignals/server/internal/janitor/codeanalysis/regex"
	"github.com/featuresignals/server/internal/janitor/github"
	"github.com/featuresignals/server/internal/janitor/gitlab"
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
	"github.com/featuresignals/server/internal/store/clickhouse"
	"github.com/featuresignals/server/internal/store/postgres"
	"github.com/featuresignals/server/internal/version"
	"github.com/featuresignals/server/internal/webhook"
	"github.com/featuresignals/server/internal/zeptomail"
)

// banner is the ASCII art startup banner displayed when the server starts.
// It includes trademark and version information.
const banner = `
  ███████╗███████╗ █████╗ ████████╗██╗   ██╗██████╗ ███████╗
  ██╔════╝██╔════╝██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██╔════╝
  █████╗  █████╗  ███████║   ██║   ██║   ██║██████╔╝█████╗
  ██╔══╝  ██╔══╝  ██╔══██║   ██║   ██║   ██║██╔══██╗██╔══╝
  ██║     ███████╗██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗
  ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝

  ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗     ███████╗
  ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║     ██╔════╝
  ███████╗██║██║  ███╗██╔██╗ ██║███████║██║     ███████╗
  ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║     ╚════██║
  ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗███████║
  ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚══════╝

  FeatureSignals v%s — Enterprise Feature Management Platform
  Copyright © %d FeatureSignals Inc. All rights reserved.
  FeatureSignals is a trademark of FeatureSignals Inc.
  Licensed under the Apache License, Version 2.0.
`

// printBanner prints the startup banner to stderr.
// It is skipped during test runs.
func printBanner() {
	if len(os.Args) > 0 {
		// Skip banner during test runs
		for _, arg := range os.Args {
			if arg == "-test.v" || arg == "-test.run" || arg == "-test.count" {
				return
			}
		}
	}
	// Only print to stderr, not stdout (stdout is for structured JSON logs)
	fmt.Fprintf(os.Stderr, banner, version.Version, time.Now().Year())
	fmt.Fprintln(os.Stderr)
}

func main() {
	printBanner()

	// Load .env file for local development (no-op in production).
	// godotenv does NOT override existing env vars, so the OS environment
	// always wins. Load .env.local FIRST (gitignored, local secrets), then
	// .env (committed defaults) which won't override what .env.local set.
	_ = godotenv.Load("../.env.local") // .env.local (gitignored, local secrets)
	_ = godotenv.Load(".env.local")    // also try server/.env.local
	_ = godotenv.Load()                 // .env (committed defaults — won't override)

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

	// ─── Config Validation ──────────────────────────────────────────
	if cfg.DatabaseURL == "" {
		logger.Error("DATABASE_URL is required")
		os.Exit(1)
	}

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
	if cfg.DBMaxConns > math.MaxInt32 || cfg.DBMinConns > math.MaxInt32 {
		logger.Error("database pool size exceeds max", "max_conns", cfg.DBMaxConns, "min_conns", cfg.DBMinConns, "max_allowed", math.MaxInt32)
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
	if cfg.EncryptionMasterKey != "" {
		store.SetAuditIntegrityKey(cfg.EncryptionMasterKey)
	}
	jwtMgr := auth.NewJWTManager(cfg.JWTSecret, cfg.TokenTTL, cfg.RefreshTTL)
	evalMiddlewares := []eval.Middleware{eval.WithLogging(logger)}
	if cfg.OTELEnabled && cfg.OTELTracesEnabled {
		evalMiddlewares = append(evalMiddlewares, eval.WithTracing())
	}
	engine := eval.Chain(eval.NewEngine(), evalMiddlewares...)
	sseServer := sse.NewServer(logger)
	evalCache := cache.NewCache(store, logger, sseServer)

	// PGInvalidator: cross-instance cache invalidation via PostgreSQL LISTEN/NOTIFY.
	// Wired into both the Store (for legacy ListenForChanges) and the Cache
	// (for the new CacheInvalidator interface).
	pgInvalidator := postgres.NewPGInvalidator(pool, logger)
	store.SetInvalidator(pgInvalidator)
	evalCache.SetInvalidator(pgInvalidator)

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

	// Start listening for PG NOTIFY changes in background.
	// StartListening blocks until ctx is cancelled, so it must run in a goroutine.
	listenCtx, listenCancel := context.WithCancel(context.Background())
	defer listenCancel()
	go func() {
		if err := evalCache.StartListening(listenCtx); err != nil {
			logger.Warn("PG LISTEN stopped", "error", err)
		}
	}()

	// Evaluation metrics collector
	metricsCollector := metrics.NewCollector()


	// EventBus (abstract messaging between services)
	eventBus, eventBusCleanup, busErr := events.NewEventBus(cfg, logger, otelInstruments)
	if busErr != nil {
		logger.Error("failed to create event bus", "error", busErr)
		os.Exit(1)
	}
	defer eventBusCleanup()
	logger.Info("event bus started", "provider", cfg.EventBusProvider)
	// Email provider — OTP sender + lifecycle mailer selected by EMAIL_PROVIDER

	// Eval event emitter (non-blocking, wraps the eval engine)
	// Events flow through EventBus to billing meter, analytics, and audit.
	evalEmissionConfig := domain.EvalEmissionConfig{
		Mode:           "batch",
		BatchSize:      50,
		BatchIntervalMs: 5000,
	}
	evalEventEmitter := eval.NewEvalEventEmitter(engine, eventBus, evalEmissionConfig, logger, otelInstruments)

	// ── ClickHouse (conditional) ──────────────────────────────────
	// ClickHouse is the analytics store for evaluation events.
	// When disabled, the server runs without ClickHouse (graceful degradation).
	var chConsumer *events.ClickHouseConsumer
	var chWriter *clickhouse.BatchWriter

	if cfg.ClickHouseEnabled {
		chConfig := clickhouse.ClickHouseConfig{
			Addrs:         []string{fmt.Sprintf("%s:%d", cfg.ClickHouseHost, cfg.ClickHousePort)},
			Database:      cfg.ClickHouseDatabase,
			Username:      cfg.ClickHouseUser,
			Password:      cfg.ClickHousePassword,
			MaxOpenConns:  cfg.ClickHouseMaxOpenConns,
			DialTimeout:   cfg.ClickHouseDialTimeout,
			QueryTimeout:  cfg.ClickHouseQueryTimeout,
			BatchSize:     cfg.ClickHouseBatchSize,
			FlushInterval: cfg.ClickHouseFlushInterval,
			MaxRetries:    cfg.ClickHouseMaxRetries,
			RetryBackoff:  cfg.ClickHouseRetryBackoff,
		}

		chStore, chErr := clickhouse.NewClickHouseEvalEventStore(chConfig, logger)
		if chErr != nil {
			logger.Error("failed to create clickhouse store", "error", chErr)
			// Graceful degradation: server runs without ClickHouse.
		} else {
			if connErr := chStore.Connect(ctx); connErr != nil {
				logger.Error("failed to connect to clickhouse", "error", connErr)
				// Graceful degradation: server runs without ClickHouse.
			} else {
				chWriter = clickhouse.NewBatchWriter(chStore,
					clickhouse.WithBatchSize(cfg.ClickHouseBatchSize),
					clickhouse.WithFlushInterval(cfg.ClickHouseFlushInterval),
					clickhouse.WithMaxRetries(cfg.ClickHouseMaxRetries),
					clickhouse.WithRetryBackoff(cfg.ClickHouseRetryBackoff),
				)
				chWriter.Start(context.Background())

				chConsumer = events.NewClickHouseConsumer(eventBus, chWriter, logger, otelInstruments)
				if startErr := chConsumer.Start(ctx); startErr != nil {
					logger.Error("failed to start clickhouse consumer", "error", startErr)
				} else {
					logger.Info("clickhouse pipeline started",
						"host", cfg.ClickHouseHost,
						"port", cfg.ClickHousePort,
						"database", cfg.ClickHouseDatabase,
					)
				}
			}
		}
	}

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
		otpSender = mailer.NewNoopMailer(logger)
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
		evalEventEmitter.Close(drainCtx)
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

	// ── AI Janitor Setup ──────────────────────────────────────────
	var janitorH *handlers.JanitorHandler
	var janitorStore *postgres.JanitorStore
	{
		janitorLogger := logger.With("component", "janitor")
		janitorStore = postgres.NewJanitorStore(pool)
		complianceStore := postgres.NewComplianceStore(pool)
		eventBus := sse.NewScanEventBus(janitorLogger)

		// Code analysis provider registry
		analysisRegistry := codeanalysis.NewProviderRegistry()
		_ = regex.NewRegexProvider(janitorLogger)

		// Register DeepSeek
		if cfg.DeepSeekAPIKey != "" {
			deepseekCfg := codeanalysis.ProviderConfig{
				APIKey:  cfg.DeepSeekAPIKey,
				Model:   cfg.DeepSeekModel,
				Timeout: cfg.JanitorLLMTimeout,
			}
			deepseekProvider, dsErr := deepseek.NewDeepSeekProvider(deepseekCfg)
			if dsErr == nil {
				if regErr := analysisRegistry.Register(deepseekProvider.Name(), func(cfg codeanalysis.ProviderConfig) (codeanalysis.CodeAnalysisProvider, error) {
					return deepseek.NewDeepSeekProvider(cfg)
				}, codeanalysis.ProviderCapabilities{
					SupportsSelfHosted: true,
					RequiresAPIKey:     true,
					Status:             "active",
				}); regErr == nil {
					janitorLogger.Info("DeepSeek provider registered", "model", cfg.DeepSeekModel)
				}
			}
			_ = deepseekProvider
		} else {
			janitorLogger.Warn("DEEPSEEK_API_KEY not set — DeepSeek LLM analysis unavailable")
		}

		// Register OpenAI
		if cfg.OpenAIAPIKey != "" {
			if regErr := analysisRegistry.Register("openai", func(cfg codeanalysis.ProviderConfig) (codeanalysis.CodeAnalysisProvider, error) {
				return openai.NewOpenAIProvider(cfg)
			}, codeanalysis.ProviderCapabilities{
				SupportsSelfHosted: false,
				RequiresAPIKey:     true,
				Status:             "active",
			}); regErr == nil {
				janitorLogger.Info("OpenAI provider registered", "model", cfg.OpenAIModel)
			}
		}

		// Register Azure OpenAI
		if cfg.AzureOpenAIAPIKey != "" && cfg.AzureOpenAIEndpoint != "" {
			azureEndpoint := cfg.AzureOpenAIEndpoint
			if regErr := analysisRegistry.Register("azure-openai", func(pCfg codeanalysis.ProviderConfig) (codeanalysis.CodeAnalysisProvider, error) {
				pCfg.BaseURL = azureEndpoint
				return openai.NewOpenAIProvider(pCfg)
			}, codeanalysis.ProviderCapabilities{
				SupportsSelfHosted: false,
				RequiresAPIKey:     true,
				Status:             "active",
			}); regErr == nil {
				janitorLogger.Info("Azure OpenAI provider registered", "model", cfg.AzureOpenAIModel)
			}
		}

		// Git provider registry — register with global singleton
		janitor.RegisterGitProvider("github", func(config janitor.GitProviderConfig) (janitor.GitProvider, error) {
			return github.NewGitHubProvider(config)
		})
		janitor.RegisterGitProvider("gitlab", func(config janitor.GitProviderConfig) (janitor.GitProvider, error) {
			return gitlab.NewGitLabProvider(config)
		})
		janitor.RegisterGitProvider("bitbucket", func(config janitor.GitProviderConfig) (janitor.GitProvider, error) {
			return bitbucket.NewBitbucketProvider(config)
		})
		janitorLogger.Info("Git providers registered", "providers", janitor.ListGitProviders())

		// Token encryptor (best-effort — tokens stored in plaintext if key is missing)
		var tokenEncryptor *janitor.TokenEncryptor
		if cfg.JanitorEncryptionKey != "" {
			var encErr error
			tokenEncryptor, encErr = janitor.NewTokenEncryptor(cfg.JanitorEncryptionKey)
			if encErr != nil {
				janitorLogger.Warn("failed to create token encryptor, tokens stored in plaintext", "error", encErr)
			} else {
				janitorLogger.Info("token encryptor initialized")
			}
		} else {
			janitorLogger.Warn("JANITOR_ENCRYPTION_KEY not set — Git tokens stored in plaintext")
		}

		janitorH = handlers.NewJanitorHandler(
			store,              // domain.Store (implements FlagReader + others)
			janitorStore,       // store.JanitorStore
			store,              // domain.Store (implements CreditStore)
			analysisRegistry,   // Code analysis provider registry
			complianceStore,    // Compliance store for provider selection
			eventBus,           // SSE event bus for scan progress
			tokenEncryptor,     // Token encryption/decryption
			cfg.JanitorLLMMinConfidence,
			janitorLogger,
		)

		// Register regex provider (always last, lowest priority)
		if regErr := analysisRegistry.Register("regex", func(cfg codeanalysis.ProviderConfig) (codeanalysis.CodeAnalysisProvider, error) {
			return regex.NewRegexProvider(janitorLogger), nil
		}, codeanalysis.ProviderCapabilities{
			SupportsSelfHosted: true,
			RequiresAPIKey:     false,
			Status:             "active",
		}); regErr != nil {
			janitorLogger.Warn("failed to register regex provider", "error", regErr)
		}

		janitorLogger.Info("AI Janitor initialized",
			"llm_providers", analysisRegistry.ListProviders(),
			"git_providers", janitor.ListGitProviders(),
			"encryption", tokenEncryptor != nil,
		)
	}

	// ── Agent Governance Pipeline (7-step pipeline) ───────────────
	// The governance pipeline enforces the 7-step protocol on every
	// agent action: auth → authz → policy → maturity → rate_limit →
	// blast_radius → audit. Steps can be reordered or extended per
	// organization via the Process Alignment Architecture.
	celTimeout := time.Duration(cfg.PolicyEvalTimeoutMs) * time.Millisecond
	celEvaluator := agent.NewCELEvaluator(celTimeout)
	governancePipeline := agent.NewInMemoryPipeline(logger, otelInstruments)

	// Step 1: Auth — validate agent identity and org membership
	governancePipeline.AddStep(agent.NewAuthGovernanceStep(logger))
	// Step 2: AuthZ — validate agent scopes cover required scopes
	governancePipeline.AddStep(agent.NewAuthZGovernanceStep(logger))
	// Step 3: Policy — evaluate CEL policies against the action
	governancePipeline.AddStep(agent.NewPolicyGovernanceStep(store, celEvaluator, logger, otelInstruments))
	// Step 4: Maturity — check agent maturity level meets requirements
	governancePipeline.AddStep(agent.NewMaturityGovernanceStep(logger))
	// Step 5: Rate Limit — enforce per-minute, per-hour, concurrent limits
	governancePipeline.AddStep(agent.NewRateLimitGovernanceStep(logger))
	// Step 6: Blast Radius — validate estimated impact scope
	governancePipeline.AddStep(agent.NewBlastRadiusGovernanceStep(logger))
	// Step 7: Audit — record action in tamper-evident audit log
	governancePipeline.AddStep(agent.NewAuditGovernanceStep(store, logger))

	logger.Info("agent governance pipeline initialized",
		"steps", governancePipeline.Steps(),
		"cel_timeout_ms", celTimeout.Milliseconds(),
		"policy_eval_timeout_ms", cfg.PolicyEvalTimeoutMs,
	)

	// ── Code2Flag ───────────────────────────────────────────────
	c2fStore := postgres.NewCode2FlagStore(pool, logger)
	c2fHandler := handlers.NewCode2FlagHandler(c2fStore, c2fStore, janitorStore, logger)

	// ── Preflight ──────────────────────────────────────────────
	pflStore := postgres.NewPreflightStore(pool, logger)
	pflHandler := handlers.NewPreflightHandler(pflStore, pflStore, store, store, c2fStore, logger)

	// ── IncidentFlag ───────────────────────────────────────────
	incStore := postgres.NewIncidentStore(pool, logger)
	incHandler := handlers.NewIncidentHandler(incStore, incStore, store, store, store, logger)

	// ── Impact Analyzer ────────────────────────────────────────
	impStore := postgres.NewImpactStore(pool, logger)
	impHandler := handlers.NewImpactHandler(impStore, impStore, store, c2fStore, logger)

	router := api.NewRouter(routerCtx, store, jwtMgr, evalCache, evalEventEmitter, sseServer, logger, metricsCollector, otelInstruments, governancePipeline, api.BillingConfig{
		Registry:     paymentRegistry,
		DashboardURL: cfg.DashboardURL,
		AppBaseURL:   cfg.AppBaseURL,
	}, otpSender, cfg.AppBaseURL, cfg.DashboardURL, statusH, cfg.DeploymentMode, cfg.BillingEnabled(), regionsEnabled, eventEmitter, lifecycleProcessor, cfg, lifecycleMailer, cfg.SalesNotifyEmail, janitorH, c2fHandler, pflHandler, incHandler, impHandler)

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

	// Shutdown ClickHouse pipeline (before EventBus cleanup, since the
	// consumer subscribes to the EventBus).
	if chConsumer != nil {
		chShutdownCtx, chShutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := chConsumer.Close(chShutdownCtx); err != nil {
			logger.Error("clickhouse consumer close failed", "error", err)
		}
		chShutdownCancel()
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


// initProviders registers all provider factories at startup.
// Called explicitly from main() — no init() functions with side effects.
func initProviders() {
	// ─── 1. Migration Importers (feature flag providers) ──────────────
	integrations.Register("launchdarkly", launchdarkly.NewImporter)
	integrations.Register("unleash", unleash.NewImporter)
	integrations.Register("flagsmith", flagsmith.NewImporter)

	// ─── 2. Git Providers (AI Janitor PR generation) ─────────────────
	// Git provider implementations (GitHub, GitLab, Bitbucket) are not yet
	// fully implemented. When ready, register them here:
	// janitor.RegisterGitProvider("github", github.NewProvider)
	// janitor.RegisterGitProvider("gitlab", gitlab.NewProvider)
	// janitor.RegisterGitProvider("bitbucket", bitbucket.NewProvider)

	// ─── 3. LLM Code Analysis Providers (AI Janitor) ─────────────────
	// Register LLM providers for AI-powered stale flag analysis.
	// Provider selection per org is handled by the compliance layer.
	providers := []struct {
		name     string
		register func(*codeanalysis.ProviderRegistry) error
	}{
		{name: "deepseek", register: deepseek.Register},
		{name: "openai-compatible", register: openai.Register},
		{name: "openai", register: openai.RegisterAsOpenAI},
		{name: "azure-openai", register: openai.RegisterAsAzureOpenAI},
	}

	registry := codeanalysis.NewProviderRegistry()
	for _, p := range providers {
		if err := p.register(registry); err != nil {
			panic("failed to register LLM provider " + p.name + ": " + err.Error())
		}
	}
	slog.Info("LLM providers registered", "count", registry.ProviderCount(), "providers", registry.ListProviders())

	// ─── 4. IaC Generators (config export to any format) ────────────
	iac.RegisterGenerator("terraform", func() iac.Generator { return iac.NewTerraformGenerator() })
	iac.RegisterGenerator("pulumi", func() iac.Generator { return iac.NewPulumiGenerator() })
	iac.RegisterGenerator("ansible", func() iac.Generator { return iac.NewAnsibleGenerator() })
}
