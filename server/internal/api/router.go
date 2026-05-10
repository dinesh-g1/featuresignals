package api

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/riandyrn/otelchi"

	"github.com/featuresignals/server/internal/api/docs"
	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/handlers"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/observability"
	"github.com/featuresignals/server/internal/payment"
	"github.com/featuresignals/server/internal/status"
)

// BillingConfig holds payment gateway registry and URL configuration.
type BillingConfig struct {
	Registry     *payment.Registry
	DashboardURL string
	AppBaseURL   string
}

// NewRouter wires all handlers, middleware, and routes. All dependencies are
// passed as interfaces so the router (and the handlers it creates) can be
// tested without real infrastructure.
//
// Route groups follow a consistent structure:
//
//	Public          — No authentication; health, docs, pricing, status, SSO auth, demo
//	Auth            — JWT-authenticated session management, MFA, email verification
//	Billing         — Checkout, subscription, usage, credits, payment webhooks
//	Evaluation      — API-key authenticated flag evaluation (hot path, sub-ms target)
//	Agent           — AI agent-optimized endpoints with structured errors
//	Management/Read — JWT-authenticated read operations for all resources
//	Management/Write— JWT-authenticated write operations (owner, admin, developer)
//	Admin           — Owner/admin-only operations, metrics, member management
//	Enterprise      — Feature-gated Pro/Enterprise capabilities
//	Ops             — Operations portal restricted to @featuresignals.com
func NewRouter(
	ctx context.Context,
	store domain.Store,
	jwtMgr auth.TokenManager,
	evalCache handlers.RulesetCache,
	engine handlers.Evaluator,
	sseServer handlers.StreamServer,
	logger *slog.Logger,
	metricsCollector *metrics.Collector,
	otelInstruments *observability.Instruments,
	billing BillingConfig,
	otpSender domain.OTPSender,
	appBaseURL string,
	dashboardURL string,
	statusHandler *status.Handler,
	deployMode string,
	billingEnabled bool,
	regionsEnabled bool,
	emitter domain.EventEmitter,
	lifecycle handlers.LifecycleSender,
	internalChecker dto.InternalChecker,
	salesNotifier handlers.SalesNotifier,
	salesNotifyEmail string,
	janitorH *handlers.JanitorHandler,
) http.Handler {
	r := chi.NewRouter()

	// Extract config from internalChecker (passed as dto.InternalChecker interface)
	cfg, ok := internalChecker.(*config.Config)
	if !ok {
		// Fallback: create minimal config for safety
		cfg = &config.Config{}
		logger.Warn("internalChecker is not *config.Config, using empty config")
	}

	// ── Global Middleware (applied to every request) ──────────────────
	r.Use(middleware.CORS)
	r.Use(otelchi.Middleware("featuresignals-api", otelchi.WithChiRoutes(r)))
	r.Use(chimw.Compress(5))
	r.Use(middleware.MaxBodySize(1 << 20)) // 1 MB
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.LicenseValidation(cfg, logger))
	r.Use(middleware.SafeRecoverer)

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		httputil.Error(w, http.StatusNotFound, "route not found")
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		httputil.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	})

	// ── Reusable role sets ───────────────────────────────────────────
	ownerAdmin := []domain.Role{domain.RoleOwner, domain.RoleAdmin}
	writers := []domain.Role{domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper}
	allRoles := []domain.Role{domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper, domain.RoleViewer}

	// ── Handler Construction ─────────────────────────────────────────
	// All handlers are constructed here with their narrow interface dependencies.
	// This is the only place concrete implementations are wired together.

	authH := handlers.NewAuthHandler(store, jwtMgr, otpSender, appBaseURL, dashboardURL, internalChecker)
	projectH := handlers.NewProjectHandler(store)
	envH := handlers.NewEnvironmentHandler(store)
	flagH := handlers.NewFlagHandler(store, emitter)
	flagHistoryH := handlers.NewFlagHistoryHandler(store)
	segmentH := handlers.NewSegmentHandler(store)
	apiKeyH := handlers.NewAPIKeyHandler(store)
	auditH := handlers.NewAuditHandler(store)
	auditExportH := handlers.NewAuditExportHandler(store)
	teamH := handlers.NewTeamHandler(store, jwtMgr, emitter, lifecycle, dashboardURL)
	limitsH := handlers.NewLimitsHandler(store, store)
	searchH := handlers.NewSearchHandler(store)
	pinnedH := handlers.NewPinnedHandler(store)
	webhookH := handlers.NewWebhookHandler(store)
	integrationH := handlers.NewIntegrationHandler(store, logger)
	approvalH := handlers.NewApprovalHandler(store)
	evalH := handlers.NewEvalHandler(store, evalCache, engine, sseServer, logger, metricsCollector, otelInstruments)
	insightsH := handlers.NewInsightsHandler(store, evalCache, engine, metricsCollector)
	impressionCollector := metrics.NewImpressionCollector(100_000)
	metricsH := handlers.NewMetricsHandler(store, metricsCollector, impressionCollector)
	billingH := handlers.NewBillingHandler(store, billing.Registry, billing.DashboardURL, billing.AppBaseURL, logger, emitter, lifecycle)
	onboardingH := handlers.NewOnboardingHandler(store, logger)
	signupH := handlers.NewSignupHandler(store, jwtMgr, otpSender, emitter, lifecycle, internalChecker, dashboardURL, appBaseURL)
	salesH := handlers.NewSalesHandler(store, salesNotifier, salesNotifyEmail)

	userPrivacyH := handlers.NewUserPrivacyHandler(store)
	featuresH := handlers.NewFeaturesHandler(store)
	analyticsH := handlers.NewAnalyticsHandler(store)
	preferencesH := handlers.NewPreferencesHandler(store)
	feedbackH := handlers.NewFeedbackHandler(store, emitter)
	ssoH := handlers.NewSSOHandler(store)
	ssoAuthH := handlers.NewSSOAuthHandler(store, jwtMgr, appBaseURL, dashboardURL)
	mfaH := handlers.NewMFAHandler(store)

	// Enterprise feature-gated handlers
	scimH := handlers.NewSCIMHandler(store)
	dataExportH := handlers.NewDataExportHandler(store)
	customRoleH := handlers.NewCustomRoleHandler(store)
	ipAllowlistH := handlers.NewIPAllowlistHandler(store)

	jwtAuth := middleware.JWTAuth(jwtMgr, store)

	// ── Feature Gate Middleware ──────────────────────────────────────
	// Each gate enforces plan requirements for a specific feature.
	// Routes wrapped with a gate return 402 if the org's plan doesn't include it.

	webhookGate := middleware.FeatureGate(domain.FeatureWebhooks, store)
	approvalGate := middleware.FeatureGate(domain.FeatureApprovals, store)
	auditExportGate := middleware.FeatureGate(domain.FeatureAuditExport, store)
	dataExportGate := middleware.FeatureGate(domain.FeatureDataExport, store)
	customRolesGate := middleware.FeatureGate(domain.FeatureCustomRoles, store)
	ssoGate := middleware.FeatureGate(domain.FeatureSSO, store)
	scimGate := middleware.FeatureGate(domain.FeatureSCIM, store)
	mfaGate := middleware.FeatureGate(domain.FeatureMFA, store)
	ipAllowlistGate := middleware.FeatureGate(domain.FeatureIPAllowlist, store)

	// ═══════════════════════════════════════════════════════════════════
	// Public Endpoints — No Authentication Required
	// ═══════════════════════════════════════════════════════════════════
	//
	// These endpoints are accessible without any authentication. They serve
	// health checks, API documentation, pricing information, status page data,
	// SSO authentication flows, marketing/demo tools, and auth initiation.
	// Rate limiting is applied conservatively to prevent abuse.

	// ── Health Check ─────────────────────────────────────────────────
	// Used by load balancers and orchestrators for liveness probes.
	// Returns 200 when the service is alive; no auth, no rate limit.
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "featuresignals"})
	})

	// ── API Documentation ────────────────────────────────────────────
	// Public, cacheable. Serves the developer docs and OpenAPI 3.1 spec.
	docsH := docs.NewDocsHandler()
	r.With(middleware.CacheControl("public, max-age=3600")).Get("/docs", docsH.Index)
	r.With(middleware.CacheControl("public, max-age=3600")).Get("/docs/openapi.json", docsH.OpenAPISpec)

	// Swagger UI + OpenAPI spec under /v1 — available in development and cloud modes.
	// In production/staging, these are served from featuresignals.com/docs.
	if deployMode == "development" || deployMode == "cloud" {
		r.Get("/v1/docs", docsH.SwaggerUI)
		r.With(middleware.CacheControl("public, max-age=3600")).Get("/v1/openapi.json", docsH.OpenAPISpec)
	}

	// ── Status Page ──────────────────────────────────────────────────
	// Public status endpoints with progressive cache TTLs. Longer TTL for
	// historical data, shorter for live status. Serves both local instance
	// status and global aggregate status across all regions.
	if statusHandler != nil {
		r.With(middleware.CacheControl("public, max-age=30")).Get("/v1/status", statusHandler.HandleLocalStatus)
		r.With(middleware.CacheControl("public, max-age=30")).Get("/v1/status/global", statusHandler.HandleGlobalStatus)
		r.With(middleware.CacheControl("public, max-age=300")).Get("/v1/status/history", statusHandler.HandleStatusHistory)
		r.With(middleware.CacheControl("public, max-age=60")).Get("/v1/status/sla", statusHandler.HandleSLA)
	}

	// ── SSO Public Authentication Endpoints ──────────────────────────
	// Registered before the main /v1 group because SAML ACS receives
	// form-encoded POSTs (not JSON) and metadata returns XML.
	// These bypass the RequireJSON middleware.
	r.Route("/v1/sso", func(r chi.Router) {
		r.Get("/discovery/{orgSlug}", ssoAuthH.Discovery)
		r.Get("/saml/metadata/{orgSlug}", ssoAuthH.SAMLMetadata)
		r.Get("/saml/login/{orgSlug}", ssoAuthH.SAMLLogin)
		r.Post("/saml/acs/{orgSlug}", ssoAuthH.SAMLACS)
		r.Get("/oidc/authorize/{orgSlug}", ssoAuthH.OIDCAuthorize)
		r.Get("/oidc/callback/{orgSlug}", ssoAuthH.OIDCCallback)
	})

	// ── Public Marketing & Demo Endpoints ────────────────────────────
	// No authentication required. Heavily rate-limited to prevent abuse.
	// These support the marketing site's migration preview, pricing calculator,
	// live evaluation demo, and migration data persistence flows.
	publicH := NewPublicHandler(store, jwtMgr, logger)
	r.Route("/v1/public", func(r chi.Router) {
		r.Use(middleware.CacheControl("no-store"))

		// Migration preview — 1 req/min (ultra-conservative)
		r.With(middleware.RateLimit(ctx, 1)).Post("/migration/preview", publicH.MigrationPreview)

		// Pricing calculator — 1 req/min (conservative)
		r.With(middleware.RateLimit(ctx, 1)).Post("/calculator", publicH.Calculator)

		// Live eval demo — 2 req/min
		r.With(middleware.RateLimit(ctx, 2)).Get("/evaluate/{flagKey}", publicH.PublicEvaluate)

		// Migration save — 1 req/min (extremely conservative)
		r.With(middleware.RateLimit(ctx, 1)).Post("/migration/save", publicH.MigrationSave)
	})

	// ═══════════════════════════════════════════════════════════════════
	// Main /v1 Route Group
	// ═══════════════════════════════════════════════════════════════════
	//
	// All management, billing, evaluation, and enterprise endpoints live under
	// /v1. The RequireJSON middleware rejects requests that don't have
	// Content-Type: application/json (except for SSE and GET requests).
	// Sub-groups within apply additional authentication, authorization,
	// rate limiting, and feature gating.

	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.RequireJSON)

		// ═══════════════════════════════════════════════════════════
		// Public (within /v1) — No Auth
		// ═══════════════════════════════════════════════════════════

		// ── Pricing ───────────────────────────────────────────────
		// Single source of truth for all plan/pricing data consumed
		// by the marketing site, dashboard, and CLI.
		r.With(middleware.CacheControl("public, max-age=3600")).Get("/pricing", func(w http.ResponseWriter, _ *http.Request) {
			cfg, err := domain.Pricing()
			if err != nil {
				httputil.Error(w, http.StatusInternalServerError, "pricing config unavailable")
				return
			}
			httputil.JSON(w, http.StatusOK, cfg)
		})

		// ── Auth Initiation (rate-limited, no JWT) ───────────────
		// These endpoints initiate authentication flows. Rate limited
		// at 20 req/min to prevent brute force and enumeration attacks.
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(ctx, 20))

			r.Post("/auth/login", authH.Login)
			r.Post("/auth/initiate-signup", signupH.InitiateSignup)
			r.Post("/auth/complete-signup", signupH.CompleteSignup)
			r.Post("/auth/resend-signup-otp", signupH.ResendSignupOTP)
			r.Post("/auth/forgot-password", authH.ForgotPassword)
			r.Post("/auth/reset-password", authH.ResetPassword)
			magicLinkH := handlers.NewMagicLinkHandler(store, jwtMgr, dashboardURL)
			r.Get("/auth/magic-link", magicLinkH.Exchange)
			r.Post("/auth/refresh", authH.Refresh)
			r.Get("/auth/verify-email", authH.VerifyEmail)
			r.Post("/auth/token-exchange", authH.TokenExchange)

			// Available data regions (public)
			r.Get("/regions", func(w http.ResponseWriter, r *http.Request) {
				regions := make([]domain.RegionInfo, 0, len(domain.Regions))
				for _, code := range domain.RegionCodes() {
					regions = append(regions, domain.Regions[code])
				}
				httputil.JSON(w, http.StatusOK, dto.RegionsResponse{Regions: regions})
			})

			// Deployment capabilities (public)
			r.Get("/capabilities", func(w http.ResponseWriter, r *http.Request) {
				httputil.JSON(w, http.StatusOK, dto.CapabilitiesResponse{
					DeploymentMode: deployMode,
					BillingEnabled: billingEnabled,
					RegionsEnabled: regionsEnabled,
				})
			})
		})

		// ── Sales Inquiry (public) ────────────────────────────────
		// Unauthenticated; 6 req/hr (1 req/10min) to prevent spam.
		r.With(middleware.RateLimit(ctx, 1)).Post("/sales/inquiry", salesH.SubmitInquiry)

		// ── Payment Gateway Webhooks (public) ─────────────────────
		// Stripe and PayU callbacks. These endpoints receive POSTs from
		// payment providers and must be accessible without authentication.
		// Webhook signature verification is handled within each handler.
		r.Group(func(r chi.Router) {
			r.Post("/billing/payu/callback", billingH.PayUCallback)
			r.Post("/billing/payu/failure", billingH.PayUFailure)
			r.Post("/billing/stripe/webhook", billingH.HandleStripeWebhook)
		})

		// ═══════════════════════════════════════════════════════════
		// Authenticated — Session, MFA, Billing
		// ═══════════════════════════════════════════════════════════

		// ── Auth Session Management & MFA ─────────────────────────
		// Requires valid JWT. MFA endpoints are additionally gated
		// behind the MFA feature flag (Pro+ plan).
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Post("/auth/send-verification-email", authH.SendVerificationEmail)
			r.Post("/auth/logout", authH.Logout)

			r.Group(func(r chi.Router) {
				r.Use(mfaGate)
				r.Post("/auth/mfa/enable", mfaH.Enable)
				r.Post("/auth/mfa/verify", mfaH.Verify)
				r.Post("/auth/mfa/disable", mfaH.Disable)
				r.Get("/auth/mfa/status", mfaH.Status)
			})
		})

		// ── Billing & Onboarding (JWT auth) ──────────────────────
		// Subscription management, usage tracking, credits, and
		// onboarding state. Rate limited at 60 req/min for billing
		// endpoints to allow normal interactive usage.
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Use(middleware.RateLimit(ctx, 60))

			r.Post("/billing/checkout", billingH.CreateCheckout)
			r.Get("/billing/subscription", billingH.GetSubscription)
			r.Get("/billing/usage", billingH.GetUsage)
			r.Post("/billing/cancel", billingH.CancelSubscription)
			r.Post("/billing/portal", billingH.GetBillingPortalURL)
			r.Put("/billing/gateway", billingH.UpdateGateway)
			r.Get("/billing/credits", billingH.GetCredits)
			r.Get("/billing/credits/balance", billingH.GetCreditBalance)
			r.Get("/billing/credits/history", billingH.GetCreditHistory)
			r.Post("/billing/credits/purchase", billingH.PurchaseCredits)
			r.Get("/onboarding", onboardingH.GetState)
			r.Patch("/onboarding", onboardingH.UpdateState)
		})

		// ═══════════════════════════════════════════════════════════
		// Evaluation API — API Key Authentication
		// ═══════════════════════════════════════════════════════════
		//
		// These endpoints form the flag evaluation hot path. They are
		// authenticated via API key (not JWT) and must serve sub-millisecond
		// p99 latency. The evaluation cache is the source of truth; no
		// database calls occur on this path.
		//
		// Rate limits are tier-based: Free (1K/min), Trial (5K/min),
		// Pro (50K/min), Enterprise (200K/min).

		r.Group(func(r chi.Router) {
			r.Use(middleware.CacheControl("no-store"))
			r.Post("/evaluate", evalH.Evaluate)
			r.Post("/evaluate/bulk", evalH.BulkEvaluate)
			r.Get("/client/{envKey}/flags", evalH.ClientFlags)
			r.Get("/stream/{envKey}", evalH.Stream)
			r.Post("/track", metricsH.TrackImpression)
		})

		// ── Agent API ─────────────────────────────────────────────
		// AI agent-optimized endpoints with <5ms evaluation latency,
		// structured errors, and agent key scoping. Authenticated via
		// API key; stricter rate limits apply for management operations.
		r.Route("/agent", func(r chi.Router) {
			agentH := handlers.NewAgentHandler(store, evalCache, engine, nil, logger)
			agentH.RegisterRoutes(r)
		})

		// ═══════════════════════════════════════════════════════════
		// Management API — JWT Authentication
		// ═══════════════════════════════════════════════════════════
		//
		// All management operations require a valid JWT session. Within this
		// group, routes are further scoped by role (viewer, developer, admin,
		// owner) and plan tier. The TierEnforce middleware prevents resource
		// creation beyond plan limits. TrialExpiry blocks access for expired
		// trials. IPAllowlist restricts access to configured IP ranges.
		//
		// Rate limits scale with plan tier: Free (100/min), Trial (500/min),
		// Pro (500/min), Enterprise (2,000/min).

		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Use(middleware.IPAllowlist(store))
			r.Use(middleware.CacheControl("private, no-cache"))
			r.Use(middleware.TrialExpiry(store, logger))
			r.Use(middleware.TierEnforce(store, logger))
			r.Use(middleware.TierRateLimit(ctx, store))

			// ── Features & Capabilities ──────────────────────────
			// Returns the set of plan-gated features available to the
			// caller's organization, with enabled/disabled status.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))
				r.Get("/features", featuresH.List)
			})

			// ── User Privacy & Preferences ───────────────────────
			// GDPR data subject rights: export personal data, delete
			// account. Also includes hint dismissal, email preferences,
			// and user feedback submission.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))
				r.Get("/users/me/data", userPrivacyH.ExportMyData)
				r.Delete("/users/me", userPrivacyH.DeleteMyAccount)
				r.Get("/users/me/hints", preferencesH.GetHints)
				r.Post("/users/me/hints", preferencesH.DismissHint)
				r.Put("/users/me/email-preferences", preferencesH.UpdateEmailPreferences)
				r.Post("/feedback", feedbackH.Submit)
			})

			// ── Dashboard Summary ────────────────────────────────
			// Returns aggregate stats for a project's dashboard:
			// flag counts, environment health, recent activity, etc.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))
				r.Get("/projects/{projectID}/dashboard", func(w http.ResponseWriter, r *http.Request) {
					// Dashboard aggregates key project statistics into a single
					// response for the project overview page. The handler queries
					// flag counts, environment statuses, and recent audit activity
					// in parallel for fast rendering.
					httputil.LoggerFromContext(r.Context()).With("handler", "dashboard")
					projectID := chi.URLParam(r, "projectID")
					orgID := middleware.GetOrgID(r.Context())

					// TODO: Delegate to a dedicated DashboardHandler when available.
					// For now, return a basic summary using store queries.
					flags, err := store.ListFlags(r.Context(), projectID)
					if err != nil {
						httputil.Error(w, http.StatusInternalServerError, "failed to load dashboard")
						return
					}
					envs, err := store.ListEnvironments(r.Context(), projectID)
					if err != nil {
						httputil.Error(w, http.StatusInternalServerError, "failed to load dashboard")
						return
					}

					type dashboardResponse struct {
						TotalFlags      int `json:"total_flags"`
						TotalEnvs       int `json:"total_environments"`
						ActiveFlags     int `json:"active_flags"`
						ArchivedFlags   int `json:"archived_flags"`
						RolledOutFlags  int `json:"rolled_out_flags"`
						DeprecatedFlags int `json:"deprecated_flags"`
					}
					resp := dashboardResponse{
						TotalFlags: len(flags),
						TotalEnvs:  len(envs),
					}
					for _, f := range flags {
						switch f.Status {
						case domain.StatusActive:
							resp.ActiveFlags++
						case domain.StatusArchived:
							resp.ArchivedFlags++
						case domain.StatusRolledOut:
							resp.RolledOutFlags++
						case domain.StatusDeprecated:
							resp.DeprecatedFlags++
						}
					}
					_ = orgID // reserved for future scoping
					httputil.JSON(w, http.StatusOK, resp)
				})
			})

			// ═══════════════════════════════════════════════════════
			// Management — Read Operations (all authenticated roles)
			// ═══════════════════════════════════════════════════════
			//
			// These endpoints return resource data. All authenticated roles
			// (viewer, developer, admin, owner) can access read endpoints.
			// List endpoints return paginated responses in the form
			// { data: [...], total: N, limit: L, offset: O }.
			// Timestamps are RFC 3339 (UTC).

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))

				// Projects
				r.Get("/projects", projectH.List)
				r.Get("/projects/{projectID}", projectH.Get)

				// Environments
				r.Get("/projects/{projectID}/environments", envH.List)
				r.Get("/projects/{projectID}/environments/{envID}", envH.Get)

				// Flags
				r.Get("/projects/{projectID}/flags", flagH.List)
				r.Get("/flags", flagH.List) // flat endpoint: ?project_id=x&sort=name:asc&label_selector=key==val
				r.Get("/projects/{projectID}/flags/{flagKey}", flagH.Get)
				r.Get("/projects/{projectID}/flags/archived", flagH.ListArchived)

				// Flag history & versioning
				r.Get("/projects/{projectID}/flags/{flagKey}/history", flagHistoryH.ListVersions)
				r.Get("/projects/{projectID}/flags/{flagKey}/history/{version}", flagHistoryH.GetVersion)
				r.Post("/projects/{projectID}/flags/{flagKey}/rollback", flagHistoryH.Rollback)

				// Flag states (per-environment flag configuration)
				r.Get("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.GetState)
				r.Get("/projects/{projectID}/environments/{envID}/flag-states", flagH.ListFlagStates)
				r.Get("/projects/{projectID}/flags/compare-environments", flagH.CompareEnvironments)
				r.Get("/projects/{projectID}/environments/{envID}/flag-insights", insightsH.FlagInsights)

				// Segments
				r.Get("/projects/{projectID}/segments", segmentH.List)
				r.Get("/projects/{projectID}/segments/{segmentKey}", segmentH.Get)
				r.Get("/projects/{projectID}/segments/{segmentKey}/evaluate", segmentH.Evaluate)

				// API Keys
				r.Get("/environments/{envID}/api-keys", apiKeyH.List)

				// Audit & Activity
				r.Get("/audit", auditH.List)
				r.Get("/projects/{projectID}/activity", auditH.List)

				// Limits, Search, Pinned Items
				r.Get("/limits", limitsH.Get)
				r.Get("/search", searchH.Search)
				r.Get("/search/suggest", searchH.Suggest)
				r.Get("/projects/{projectID}/pinned", pinnedH.List)
				r.Post("/pinned", pinnedH.Create)
				r.Delete("/pinned/{pinnedID}", pinnedH.Delete)

				// Team & Members
				r.Get("/members", teamH.List)
				r.Get("/members/{memberID}/permissions", teamH.ListPermissions)
			})

			// ── Approval Read Routes (Pro+, all roles) ──────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))
				r.Use(approvalGate)
				r.Get("/approvals", approvalH.List)
				r.Get("/approvals/{approvalID}", approvalH.Get)
			})

			// ── Audit Export (Pro+, admin-only) ─────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(auditExportGate)
				r.Get("/audit/export", auditExportH.Export)
			})

			// ── Data Export (Pro+, admin-only) ──────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(dataExportGate)
				r.Get("/data/export", dataExportH.Export)
			})

			// ═══════════════════════════════════════════════════════
			// Management — Write Operations (owner, admin, developer)
			// ═══════════════════════════════════════════════════════
			//
			// Mutating operations on resources. Limited to owner, admin,
			// and developer roles. Viewers cannot create, update, or delete.
			// TierEnforce middleware checks plan limits before allowing
			// resource creation (POST).

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(writers...))

				// Projects
				r.Post("/projects", projectH.Create)
				r.Put("/projects/{projectID}", projectH.Update)

				// Environments
				r.Post("/projects/{projectID}/environments", envH.Create)
				r.Put("/projects/{projectID}/environments/{envID}", envH.Update)
				r.Post("/projects/{projectID}/environments/{envID}/clone", envH.Clone)

				// Flags
				r.Post("/projects/{projectID}/flags", flagH.Create)
				r.Put("/projects/{projectID}/flags/{flagKey}", flagH.Update)
				r.Delete("/projects/{projectID}/flags/{flagKey}", flagH.Delete)
				r.Post("/projects/{projectID}/flags/{flagKey}/archive", flagH.Archive)
				r.Post("/projects/{projectID}/flags/{flagKey}/restore", flagH.Restore)

				// Flag states & lifecycle operations
				r.Put("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.UpdateState)
				r.Post("/projects/{projectID}/flags/{flagKey}/promote", flagH.Promote)
				r.Post("/projects/{projectID}/flags/{flagKey}/kill", flagH.Kill)
				r.Post("/projects/{projectID}/flags/sync-environments", flagH.SyncEnvironments)

				// Insights — entity inspection in evaluation context
				r.Post("/projects/{projectID}/environments/{envID}/inspect-entity", insightsH.InspectEntity)
				r.Post("/projects/{projectID}/environments/{envID}/compare-entities", insightsH.CompareEntities)

				// Segments
				r.Post("/projects/{projectID}/segments", segmentH.Create)
				r.Put("/projects/{projectID}/segments/{segmentKey}", segmentH.Update)
				r.Delete("/projects/{projectID}/segments/{segmentKey}", segmentH.Delete)
			})

			// ── Approval Create (Pro+, writers) ─────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(writers...))
				r.Use(approvalGate)
				r.Post("/approvals", approvalH.Create)
			})

			// ═══════════════════════════════════════════════════════
			// Admin Operations (owner, admin only)
			// ═══════════════════════════════════════════════════════
			//
			// Destructive operations, member management, API key
			// management, metrics, and internal analytics. Restricted
			// to owner and admin roles.

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))

				// Destructive resource operations
				r.Delete("/projects/{projectID}", projectH.Delete)
				r.Delete("/projects/{projectID}/environments/{envID}", envH.Delete)

				// API Key management
				r.Post("/environments/{envID}/api-keys", apiKeyH.Create)
				r.Delete("/api-keys/{keyID}", apiKeyH.Revoke)
				r.Post("/api-keys/{keyID}/rotate", apiKeyH.Rotate)

				// Team / Member management
				r.Post("/members/invite", teamH.Invite)
				r.Put("/members/{memberID}", teamH.UpdateRole)
				r.Delete("/members/{memberID}", teamH.Remove)
				r.Put("/members/{memberID}/permissions", teamH.UpdatePermissions)

				// Metrics — evaluation & impression analytics
				r.Get("/metrics/evaluations", metricsH.Summary)
				r.Post("/metrics/evaluations/reset", metricsH.Reset)
				r.Get("/metrics/impressions", metricsH.ImpressionSummary)
				r.Post("/metrics/impressions/flush", metricsH.FlushImpressions)

				// Internal KPI analytics
				r.Get("/analytics/overview", analyticsH.Overview)
			})

			// ── Approval Review (Pro+, admin-only) ──────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(approvalGate)
				r.Post("/approvals/{approvalID}/review", approvalH.Review)
			})

			// ═══════════════════════════════════════════════════════
			// Enterprise Features — Plan-Gated
			// ═══════════════════════════════════════════════════════
			//
			// These endpoints require Pro or Enterprise plans and are
			// gated behind feature flags. Each group specifies which
			// feature it requires. Access returns 402 Payment Required
			// if the org's plan doesn't include the feature.

			// ── Webhooks (Pro+, admin-only) ─────────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(webhookGate)
				r.Post("/webhooks", webhookH.Create)
				r.Get("/webhooks", webhookH.List)
				r.Get("/webhooks/{webhookID}", webhookH.Get)
				r.Put("/webhooks/{webhookID}", webhookH.Update)
				r.Delete("/webhooks/{webhookID}", webhookH.Delete)

				// Integrations — nested under webhooks group, writer access
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(writers...))
					r.Route("/integrations", integrationH.RegisterRoutes)
				})
				r.Get("/webhooks/{webhookID}/deliveries", webhookH.ListDeliveries)
			})

			// ── SSO Configuration (Enterprise, admin-only) ──────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(ssoGate)
				r.Get("/sso/config", ssoH.Get)
				r.Post("/sso/config", ssoH.Upsert)
				r.Delete("/sso/config", ssoH.Delete)
				r.Post("/sso/config/test", ssoH.TestConnection)
			})

			// ── SCIM 2.0 (Enterprise, admin-only) ──────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(scimGate)
				r.Get("/scim/Users", scimH.ListUsers)
				r.Get("/scim/Users/{userID}", scimH.GetUser)
				r.Post("/scim/Users", scimH.CreateUser)
				r.Put("/scim/Users/{userID}", scimH.UpdateUser)
				r.Delete("/scim/Users/{userID}", scimH.DeleteUser)
			})

			// ── IP Allowlist (Enterprise, admin-only) ──────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(ipAllowlistGate)
				r.Get("/ip-allowlist", ipAllowlistH.Get)
				r.Put("/ip-allowlist", ipAllowlistH.Upsert)
			})

			// ── Custom Roles (Enterprise, admin-only) ──────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(customRolesGate)
				r.Get("/roles", customRoleH.List)
				r.Post("/roles", customRoleH.Create)
				r.Get("/roles/{roleID}", customRoleH.Get)
				r.Put("/roles/{roleID}", customRoleH.Update)
				r.Delete("/roles/{roleID}", customRoleH.Delete)
			})
		})

		// ═══════════════════════════════════════════════════════════
		// AI Janitor — Automated Flag Hygiene (Pro+, admin-only)
		// ═══════════════════════════════════════════════════════════
		//
		// The Janitor scans codebases for stale feature flags, generates
		// PRs to remove them, and tracks flag hygiene metrics. These
		// routes sit outside the main management middleware group so they
		// can use their own JWT auth + admin role checks without the
		// TierEnforce/TierRateLimit middleware (janitor operations should
		// not be rate-limited the same way as user-driven management ops).

		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Use(middleware.RequireRole(ownerAdmin...))
			r.Post("/janitor/scan", janitorH.Scan)
			r.Post("/janitor/scans/{id}/cancel", janitorH.CancelScan)
			r.Get("/janitor/scans/{id}", janitorH.GetScanStatus)
			r.Get("/janitor/flags", janitorH.ListStaleFlags)
			r.Post("/janitor/flags/{flagKey}/dismiss", janitorH.DismissFlag)
			r.Post("/janitor/flags/{flagKey}/generate-pr", janitorH.GeneratePR)
			r.Get("/janitor/stats", janitorH.GetStats)
			r.Get("/janitor/config", janitorH.GetConfig)
			r.Put("/janitor/config", janitorH.UpdateConfig)
			r.Get("/janitor/repositories", janitorH.ListRepositories)
			r.Post("/janitor/repositories", janitorH.ConnectRepository)
			r.Delete("/janitor/repositories/{id}", janitorH.DisconnectRepository)
		})
	})

	// ── Janitor SSE Endpoint ─────────────────────────────────────────
	// Mounted outside /v1 group because SSE (Server-Sent Events) uses
	// text/event-stream content type and must not go through RequireJSON.
	// Provides real-time scan progress updates to the dashboard.
	r.Group(func(r chi.Router) {
		r.Use(jwtAuth)
		r.Use(middleware.RequireRole(ownerAdmin...))
		r.Get("/v1/janitor/scans/{scanId}/events", janitorH.ScanEvents)
	})

	// ═══════════════════════════════════════════════════════════════════
	// Operations Portal API (/api/v1/ops)
	// ═══════════════════════════════════════════════════════════════════
	//
	// Internal operations endpoints restricted to @featuresignals.com users.
	// Provides license management, user administration, and cluster health
	// monitoring. The ops dashboard HTML page is served at /ops.

	opsH := handlers.NewOpsHandler(store, lifecycle)
	opsDashboardH := handlers.NewOpsDashboardHandler(store, cfg, logger)
	opsAuthH := handlers.NewOpsAuthHandler(store, jwtMgr, logger)

	// ── Ops Portal Auth (public) ────────────────────────────────────
	r.Post("/api/v1/ops/auth/login", opsAuthH.Login)
	r.Post("/api/v1/ops/auth/refresh", opsAuthH.Refresh)
	r.Post("/api/v1/ops/auth/logout", opsAuthH.Logout)
	r.Post("/api/v1/ops/auth/forgot-password", opsAuthH.ForgotPassword)

	// Ops Dashboard HTML page (requires JWT + @featuresignals.com)
	r.Group(func(r chi.Router) {
		r.Use(jwtAuth)
		r.Use(middleware.RequireDomain("featuresignals.com"))
		r.Get("/ops", opsDashboardH.ServeDashboard)
	})

	r.Route("/api/v1/ops", func(r chi.Router) {
		r.Use(jwtAuth)
		// Domain restriction: only @featuresignals.com users
		r.Use(middleware.RequireDomain("featuresignals.com"))

		// ── Auth ──────────────────────────────────────────────────
		r.Get("/auth/me", opsAuthH.Me)

		// ── License Management ────────────────────────────────────
		r.Get("/licenses", opsH.ListLicenses)
		r.Get("/licenses/{id}", opsH.GetLicense)
		r.Get("/licenses/org/{org_id}", opsH.GetLicenseByOrg)
		r.Post("/licenses", opsH.CreateLicense)
		r.Post("/licenses/{id}/revoke", opsH.RevokeLicense)
		r.Post("/licenses/{id}/quota-override", opsH.OverrideLicenseQuota)
		r.Post("/licenses/{id}/reset-usage", opsH.ResetLicenseUsage)

		// ── Ops User Management ───────────────────────────────────
		r.Get("/users", opsH.ListOpsUsers)
		r.Get("/users/{id}", opsH.GetOpsUser)
		r.Get("/users/me", opsH.GetMe)
		r.Post("/users", opsH.CreateOpsUser)
		r.Patch("/users/{id}", opsH.UpdateOpsUser)

		// ── Cluster Health ────────────────────────────────────────
		r.Get("/clusters", opsDashboardH.ListClusters)
		r.Get("/clusters/{name}/health", opsDashboardH.GetClusterHealth)
	})

	return r
}
