package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/riandyrn/otelchi"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/handlers"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/payment"
	"github.com/featuresignals/server/internal/pricing"
	"github.com/featuresignals/server/internal/proxy"
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
func NewRouter(
	store domain.Store,
	jwtMgr auth.TokenManager,
	evalCache handlers.RulesetCache,
	engine handlers.Evaluator,
	sseServer handlers.StreamServer,
	logger *slog.Logger,
	corsOrigins []string,
	metricsCollector *metrics.Collector,
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
	cfg *config.Config,
) http.Handler {
	r := chi.NewRouter()

	// CORS must be first so every response (including panic recoveries) gets headers.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-API-Key", "X-Target-Region"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(otelchi.Middleware("featuresignals-api", otelchi.WithChiRoutes(r)))
	r.Use(chimw.Compress(5))
	r.Use(middleware.MaxBodySize(1 << 20)) // 1 MB
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.SafeRecoverer)

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		httputil.Error(w, http.StatusNotFound, "route not found")
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		httputil.Error(w, http.StatusMethodNotAllowed, "method not allowed")
	})

	// Health check (no auth, no rate limit)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "featuresignals"})
	})

	// Status page endpoints (public, cacheable)
	if statusHandler != nil {
		r.With(middleware.CacheControl("public, max-age=30")).Get("/v1/status", statusHandler.HandleLocalStatus)
		r.With(middleware.CacheControl("public, max-age=30")).Get("/v1/status/global", statusHandler.HandleGlobalStatus)
		r.With(middleware.CacheControl("public, max-age=300")).Get("/v1/status/history", statusHandler.HandleStatusHistory)
		r.With(middleware.CacheControl("public, max-age=60")).Get("/v1/status/sla", statusHandler.HandleSLA)
	}

	// Reusable role sets
	ownerAdmin := []domain.Role{domain.RoleOwner, domain.RoleAdmin}
	writers := []domain.Role{domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper}
	allRoles := []domain.Role{domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper, domain.RoleViewer}

	// Init handlers
	authH := handlers.NewAuthHandler(store, jwtMgr, appBaseURL, dashboardURL, internalChecker)
	projectH := handlers.NewProjectHandler(store)
	envH := handlers.NewEnvironmentHandler(store)
	flagH := handlers.NewFlagHandler(store, emitter)
	segmentH := handlers.NewSegmentHandler(store)
	apiKeyH := handlers.NewAPIKeyHandler(store)
	auditH := handlers.NewAuditHandler(store)
	auditExportH := handlers.NewAuditExportHandler(store)
	teamH := handlers.NewTeamHandler(store, jwtMgr, emitter, lifecycle, dashboardURL)
	webhookH := handlers.NewWebhookHandler(store)
	approvalH := handlers.NewApprovalHandler(store)
	evalH := handlers.NewEvalHandler(store, evalCache, engine, sseServer, logger, metricsCollector)
	insightsH := handlers.NewInsightsHandler(store, evalCache, engine, metricsCollector)
	impressionCollector := metrics.NewImpressionCollector(100_000)
	metricsH := handlers.NewMetricsHandler(store, metricsCollector, impressionCollector)
	billingH := handlers.NewBillingHandler(store, billing.Registry, billing.DashboardURL, billing.AppBaseURL, logger, emitter, lifecycle)
	onboardingH := handlers.NewOnboardingHandler(store, logger)
	signupH := handlers.NewSignupHandler(store, jwtMgr, otpSender, emitter, lifecycle, internalChecker, dashboardURL)
	salesH := handlers.NewSalesHandler(store, salesNotifier, salesNotifyEmail)

	userPrivacyH := handlers.NewUserPrivacyHandler(store)
	featuresH := handlers.NewFeaturesHandler(store)
	analyticsH := handlers.NewAnalyticsHandler(store)
	preferencesH := handlers.NewPreferencesHandler(store)
	feedbackH := handlers.NewFeedbackHandler(store, emitter)
	ssoH := handlers.NewSSOHandler(store)
	ssoAuthH := handlers.NewSSOAuthHandler(store, jwtMgr, appBaseURL, dashboardURL)
	mfaH := handlers.NewMFAHandler(store)

	jwtAuth := middleware.JWTAuth(jwtMgr, store)

	// SSO public auth endpoints — registered before the main /v1 group
	// because SAML ACS receives form-encoded POSTs (not JSON) and metadata
	// returns XML. These bypass the RequireJSON middleware.
	r.Route("/v1/sso", func(r chi.Router) {
		r.Use(middleware.RateLimit(30))
		r.Get("/discovery/{orgSlug}", ssoAuthH.Discovery)
		r.Get("/saml/metadata/{orgSlug}", ssoAuthH.SAMLMetadata)
		r.Get("/saml/login/{orgSlug}", ssoAuthH.SAMLLogin)
		r.Post("/saml/acs/{orgSlug}", ssoAuthH.SAMLACS)
		r.Get("/oidc/authorize/{orgSlug}", ssoAuthH.OIDCAuthorize)
		r.Get("/oidc/callback/{orgSlug}", ssoAuthH.OIDCCallback)
	})

	// Feature gate middleware constructors — each wraps a route group to
	// enforce plan requirements without touching handler code.
	scimH := handlers.NewSCIMHandler(store)

	dataExportH := handlers.NewDataExportHandler(store)
	customRoleH := handlers.NewCustomRoleHandler(store)

	webhookGate := middleware.FeatureGate(domain.FeatureWebhooks, store)
	approvalGate := middleware.FeatureGate(domain.FeatureApprovals, store)
	auditExportGate := middleware.FeatureGate(domain.FeatureAuditExport, store)
	dataExportGate := middleware.FeatureGate(domain.FeatureDataExport, store)
	customRolesGate := middleware.FeatureGate(domain.FeatureCustomRoles, store)
	ssoGate := middleware.FeatureGate(domain.FeatureSSO, store)
	scimGate := middleware.FeatureGate(domain.FeatureSCIM, store)
	mfaGate := middleware.FeatureGate(domain.FeatureMFA, store)
	ipAllowlistGate := middleware.FeatureGate(domain.FeatureIPAllowlist, store)
	ipAllowlistH := handlers.NewIPAllowlistHandler(store)

	r.Route("/v1", func(r chi.Router) {
		r.Use(middleware.RequireJSON)

		// Public pricing endpoint — single source of truth for all clients
		r.With(middleware.CacheControl("public, max-age=3600")).Get("/pricing", func(w http.ResponseWriter, _ *http.Request) {
			httputil.JSON(w, http.StatusOK, domain.Pricing)
		})
		r.With(middleware.CacheControl("public, max-age=3600")).Get("/pricing/regions", pricing.HandleRegionPricing)

		// Public auth routes (rate-limited to prevent brute force)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(20))

			if cfg != nil && cfg.IsGlobalRouter() {
				r.Post("/auth/login", proxy.MultiRegionLogin(
					http.HandlerFunc(authH.Login), cfg.LocalRegion, cfg.RegionEndpoints, logger,
				).ServeHTTP)
				r.Post("/auth/initiate-signup", proxy.TargetRegionProxy(
					http.HandlerFunc(signupH.InitiateSignup), cfg.LocalRegion, cfg.RegionEndpoints, logger,
				).ServeHTTP)
				r.Post("/auth/complete-signup", proxy.TargetRegionProxy(
					http.HandlerFunc(signupH.CompleteSignup), cfg.LocalRegion, cfg.RegionEndpoints, logger,
				).ServeHTTP)
				r.Post("/auth/resend-signup-otp", proxy.TargetRegionProxy(
					http.HandlerFunc(signupH.ResendSignupOTP), cfg.LocalRegion, cfg.RegionEndpoints, logger,
				).ServeHTTP)
			} else {
				r.Post("/auth/login", authH.Login)
				r.Post("/auth/initiate-signup", signupH.InitiateSignup)
				r.Post("/auth/complete-signup", signupH.CompleteSignup)
				r.Post("/auth/resend-signup-otp", signupH.ResendSignupOTP)
			}

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

			r.Get("/capabilities", func(w http.ResponseWriter, r *http.Request) {
				httputil.JSON(w, http.StatusOK, dto.CapabilitiesResponse{
					DeploymentMode: deployMode,
					BillingEnabled: billingEnabled,
					RegionsEnabled: regionsEnabled,
				})
			})
		})

		// Sales inquiry (public, rate-limited)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(10))
			r.Post("/sales/inquiry", salesH.SubmitInquiry)
		})

		// Payment gateway callbacks (public, rate-limited)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(30))
			r.Post("/billing/payu/callback", billingH.PayUCallback)
			r.Post("/billing/payu/failure", billingH.PayUFailure)
			r.Post("/billing/stripe/webhook", billingH.HandleStripeWebhook)
		})

		// Auth verification + logout + MFA (authenticated via JWT)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			if cfg != nil && cfg.IsGlobalRouter() {
				r.Use(proxy.RegionRouter(cfg.LocalRegion, cfg.RegionEndpoints, logger))
			}
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

		// Billing & onboarding (authenticated via JWT)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			if cfg != nil && cfg.IsGlobalRouter() {
				r.Use(proxy.RegionRouter(cfg.LocalRegion, cfg.RegionEndpoints, logger))
			}
			r.Post("/billing/checkout", billingH.CreateCheckout)
			r.Get("/billing/subscription", billingH.GetSubscription)
			r.Get("/billing/usage", billingH.GetUsage)
			r.Post("/billing/cancel", billingH.CancelSubscription)
			r.Post("/billing/portal", billingH.GetBillingPortalURL)
			r.Put("/billing/gateway", billingH.UpdateGateway)
			r.Get("/onboarding", onboardingH.GetState)
			r.Patch("/onboarding", onboardingH.UpdateState)
		})

		// Evaluation API (authenticated via API key, rate limited)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(1000))
			r.Use(middleware.CacheControl("no-store"))
			r.Post("/evaluate", evalH.Evaluate)
			r.Post("/evaluate/bulk", evalH.BulkEvaluate)
			r.Get("/client/{envKey}/flags", evalH.ClientFlags)
			r.Get("/stream/{envKey}", evalH.Stream)
			r.Post("/track", metricsH.TrackImpression)
		})

		// Management API (authenticated via JWT, with trial expiry and tier enforcement)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			if cfg != nil && cfg.IsGlobalRouter() {
				r.Use(proxy.RegionRouter(cfg.LocalRegion, cfg.RegionEndpoints, logger))
			}
			r.Use(middleware.IPAllowlist(store))
			r.Use(middleware.CacheControl("private, no-cache"))
			r.Use(middleware.TrialExpiry(store, logger))
			r.Use(middleware.TierEnforce(store, logger))
			r.Use(middleware.TierRateLimit(store))

		// ── Features endpoint (returns plan capabilities) ──────
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(allRoles...))
			r.Get("/features", featuresH.List)
		})

		// ── User privacy / GDPR data subject rights ─────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(allRoles...))
			r.Get("/users/me/data", userPrivacyH.ExportMyData)
			r.Delete("/users/me", userPrivacyH.DeleteMyAccount)
			r.Get("/users/me/hints", preferencesH.GetHints)
			r.Post("/users/me/hints", preferencesH.DismissHint)
			r.Put("/users/me/email-preferences", preferencesH.UpdateEmailPreferences)
			r.Post("/feedback", feedbackH.Submit)
		})

			// ── Read-only routes (all authenticated roles) ───────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))

				r.Get("/projects", projectH.List)
				r.Get("/projects/{projectID}", projectH.Get)
				r.Get("/projects/{projectID}/environments", envH.List)
				r.Get("/projects/{projectID}/flags", flagH.List)
				r.Get("/projects/{projectID}/flags/{flagKey}", flagH.Get)
				r.Get("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.GetState)
				r.Get("/projects/{projectID}/environments/{envID}/flag-states", flagH.ListFlagStates)
				r.Get("/projects/{projectID}/flags/compare-environments", flagH.CompareEnvironments)
				r.Get("/projects/{projectID}/environments/{envID}/flag-insights", insightsH.FlagInsights)
				r.Get("/projects/{projectID}/segments", segmentH.List)
				r.Get("/projects/{projectID}/segments/{segmentKey}", segmentH.Get)
				r.Get("/environments/{envID}/api-keys", apiKeyH.List)
				r.Get("/audit", auditH.List)
				r.Get("/members", teamH.List)
				r.Get("/members/{memberID}/permissions", teamH.ListPermissions)
			})

			// ── Approval read routes (Pro+, all roles) ──────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))
				r.Use(approvalGate)
				r.Get("/approvals", approvalH.List)
				r.Get("/approvals/{approvalID}", approvalH.Get)
			})

		// ── Audit export (Pro+, admin-only) ─────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(ownerAdmin...))
			r.Use(auditExportGate)
			r.Get("/audit/export", auditExportH.Export)
		})

		// ── Data export (Pro+, admin-only) ──────────────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(ownerAdmin...))
			r.Use(dataExportGate)
			r.Get("/data/export", dataExportH.Export)
		})

			// ── Write routes (owner, admin, developer) ───────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(writers...))

				r.Post("/projects", projectH.Create)
				r.Post("/projects/{projectID}/environments", envH.Create)
				r.Post("/projects/{projectID}/flags", flagH.Create)
				r.Put("/projects/{projectID}/flags/{flagKey}", flagH.Update)
				r.Delete("/projects/{projectID}/flags/{flagKey}", flagH.Delete)
				r.Put("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.UpdateState)
				r.Post("/projects/{projectID}/flags/{flagKey}/promote", flagH.Promote)
				r.Post("/projects/{projectID}/flags/{flagKey}/kill", flagH.Kill)
				r.Post("/projects/{projectID}/flags/sync-environments", flagH.SyncEnvironments)
				r.Post("/projects/{projectID}/environments/{envID}/inspect-entity", insightsH.InspectEntity)
				r.Post("/projects/{projectID}/environments/{envID}/compare-entities", insightsH.CompareEntities)
				r.Post("/projects/{projectID}/segments", segmentH.Create)
				r.Put("/projects/{projectID}/segments/{segmentKey}", segmentH.Update)
				r.Delete("/projects/{projectID}/segments/{segmentKey}", segmentH.Delete)
			})

			// ── Approval create (Pro+, writers) ─────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(writers...))
				r.Use(approvalGate)
				r.Post("/approvals", approvalH.Create)
			})

			// ── Admin-only routes (owner, admin) ─────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))

				r.Delete("/projects/{projectID}", projectH.Delete)
				r.Delete("/projects/{projectID}/environments/{envID}", envH.Delete)
				r.Post("/environments/{envID}/api-keys", apiKeyH.Create)
				r.Delete("/api-keys/{keyID}", apiKeyH.Revoke)
				r.Post("/api-keys/{keyID}/rotate", apiKeyH.Rotate)
				r.Post("/members/invite", teamH.Invite)
				r.Put("/members/{memberID}", teamH.UpdateRole)
				r.Delete("/members/{memberID}", teamH.Remove)
				r.Put("/members/{memberID}/permissions", teamH.UpdatePermissions)

			// Metrics
			r.Get("/metrics/evaluations", metricsH.Summary)
			r.Post("/metrics/evaluations/reset", metricsH.Reset)
			r.Get("/metrics/impressions", metricsH.ImpressionSummary)
			r.Post("/metrics/impressions/flush", metricsH.FlushImpressions)

			// Internal KPI analytics
			r.Get("/analytics/overview", analyticsH.Overview)
			})

			// ── Approval review (Pro+, admin-only) ──────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(approvalGate)
				r.Post("/approvals/{approvalID}/review", approvalH.Review)
			})

			// ── Webhooks (Pro+, admin-only) ─────────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(webhookGate)
				r.Post("/webhooks", webhookH.Create)
				r.Get("/webhooks", webhookH.List)
				r.Get("/webhooks/{webhookID}", webhookH.Get)
				r.Put("/webhooks/{webhookID}", webhookH.Update)
				r.Delete("/webhooks/{webhookID}", webhookH.Delete)
				r.Get("/webhooks/{webhookID}/deliveries", webhookH.ListDeliveries)
			})

			// ── SSO Config (Enterprise, admin-only) ────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(ssoGate)
				r.Get("/sso/config", ssoH.Get)
				r.Post("/sso/config", ssoH.Upsert)
				r.Delete("/sso/config", ssoH.Delete)
				r.Post("/sso/config/test", ssoH.TestConnection)
			})

			// ── SCIM 2.0 (Enterprise, admin-only) ─────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))
				r.Use(scimGate)
				r.Get("/scim/Users", scimH.ListUsers)
				r.Get("/scim/Users/{userID}", scimH.GetUser)
				r.Post("/scim/Users", scimH.CreateUser)
				r.Put("/scim/Users/{userID}", scimH.UpdateUser)
				r.Delete("/scim/Users/{userID}", scimH.DeleteUser)
			})

		// ── IP Allowlist (Enterprise, admin-only) ─────────────
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(ownerAdmin...))
			r.Use(ipAllowlistGate)
			r.Get("/ip-allowlist", ipAllowlistH.Get)
			r.Put("/ip-allowlist", ipAllowlistH.Upsert)
		})

		// ── Custom Roles (Enterprise, admin-only) ─────────────
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
	})

	return r
}
