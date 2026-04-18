package api

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/riandyrn/otelchi"

	"github.com/featuresignals/server/internal/api/docs"
	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/handlers"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/observability"
	"github.com/featuresignals/server/internal/payment"
	"github.com/featuresignals/server/internal/pricing"
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
) http.Handler {
	r := chi.NewRouter()

	// CORS is handled by Caddy at the edge layer in staging/production.
	// See deploy/Caddyfile.region for the full configuration.
	// For local dev only, we inject CORS when CORS_ENABLED=true.
	if os.Getenv("CORS_ENABLED") == "true" {
		r.Use(middleware.CORS())
	}
	r.Use(otelchi.Middleware("featuresignals-api", otelchi.WithChiRoutes(r)))
	r.Use(chimw.Compress(5))
	r.Use(middleware.MaxBodySize(1 << 20)) // 1 MB
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
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

	// API documentation (public, cacheable)
	docsH := docs.NewDocsHandler()
	r.With(middleware.CacheControl("public, max-age=3600")).Get("/docs", docsH.Index)
	r.With(middleware.CacheControl("public, max-age=3600")).Get("/docs/openapi.json", docsH.OpenAPISpec)

	// Swagger UI + OpenAPI spec under /v1 — available in development and cloud modes.
	// In production/staging, these are served from the docs.featuresignals.com domain.
	if deployMode == "development" || deployMode == "cloud" {
		r.Get("/v1/docs", docsH.SwaggerUI)
		r.With(middleware.CacheControl("public, max-age=3600")).Get("/v1/openapi.json", docsH.OpenAPISpec)
	}

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

	jwtAuth := middleware.JWTAuth(jwtMgr, store)

	// SSO public auth endpoints — registered before the main /v1 group
	// because SAML ACS receives form-encoded POSTs (not JSON) and metadata
	// returns XML. These bypass the RequireJSON middleware.
	r.Route("/v1/sso", func(r chi.Router) {
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
			cfg, err := domain.Pricing()
			if err != nil {
				httputil.Error(w, http.StatusInternalServerError, "pricing config unavailable")
				return
			}
			httputil.JSON(w, http.StatusOK, cfg)
		})
		r.With(middleware.CacheControl("public, max-age=3600")).Get("/pricing/regions", pricing.HandleRegionPricing)

		// Public auth routes (rate-limited to prevent brute force)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(20))

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

			r.Get("/capabilities", func(w http.ResponseWriter, r *http.Request) {
				httputil.JSON(w, http.StatusOK, dto.CapabilitiesResponse{
					DeploymentMode: deployMode,
					BillingEnabled: billingEnabled,
					RegionsEnabled: regionsEnabled,
				})
			})
		})

		// Sales inquiry (public)
		r.Post("/sales/inquiry", salesH.SubmitInquiry)

		// Payment gateway callbacks (public)
		r.Group(func(r chi.Router) {
			r.Post("/billing/payu/callback", billingH.PayUCallback)
			r.Post("/billing/payu/failure", billingH.PayUFailure)
			r.Post("/billing/stripe/webhook", billingH.HandleStripeWebhook)
		})

		// Auth verification + logout + MFA (authenticated via JWT)
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

		// Billing & onboarding (authenticated via JWT)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Post("/billing/checkout", billingH.CreateCheckout)
			r.Get("/billing/subscription", billingH.GetSubscription)
			r.Get("/billing/usage", billingH.GetUsage)
			r.Post("/billing/cancel", billingH.CancelSubscription)
			r.Post("/billing/portal", billingH.GetBillingPortalURL)
			r.Put("/billing/gateway", billingH.UpdateGateway)
			r.Get("/onboarding", onboardingH.GetState)
			r.Patch("/onboarding", onboardingH.UpdateState)
		})

		// Evaluation API (authenticated via API key, tier rate limited)
		r.Group(func(r chi.Router) {
			r.Use(middleware.CacheControl("no-store"))
			r.Post("/evaluate", evalH.Evaluate)
			r.Post("/evaluate/bulk", evalH.BulkEvaluate)
			r.Get("/client/{envKey}/flags", evalH.ClientFlags)
			r.Get("/stream/{envKey}", evalH.Stream)
			r.Post("/track", metricsH.TrackImpression)
		})

		// Agent API endpoints (authenticated via API key, stricter rate limits)
		// These endpoints are optimized for AI agent programmatic access with
		// <5ms evaluation latency, structured errors, and agent key scoping.
		r.Route("/agent", func(r chi.Router) {
			agentH := handlers.NewAgentHandler(store, evalCache, engine, nil, logger)
			agentH.RegisterRoutes(r)
		})

		// Management API (authenticated via JWT, with trial expiry and tier enforcement)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
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
				r.Get("/projects/{projectID}/flags/{flagKey}/history", flagHistoryH.ListVersions)
				r.Get("/projects/{projectID}/flags/{flagKey}/history/{version}", flagHistoryH.GetVersion)
				r.Post("/projects/{projectID}/flags/{flagKey}/rollback", flagHistoryH.Rollback)
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
				r.Put("/projects/{projectID}", projectH.Update)
				r.Post("/projects/{projectID}/environments", envH.Create)
				r.Put("/projects/{projectID}/environments/{envID}", envH.Update)
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

			// ── Integrations ───────────────────────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(writers...))
				r.Route("/integrations", integrationH.RegisterRoutes)
			})
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

	// ── Operations Portal API (/api/v1/ops) ─────────────────────────
	// Restricted to @featuresignals.com users via middleware check
	opsH := handlers.NewOpsHandler(store)
	opsAuthH := handlers.NewOpsAuthHandler(store, logger)
		// ── Ops Portal Auth (public) ────────────────────────────────
		r.Post("/api/v1/ops/auth/login", opsAuthH.Login)
		r.Post("/api/v1/ops/auth/refresh", opsAuthH.Refresh)
		r.Post("/api/v1/ops/auth/logout", opsAuthH.Logout)

	r.Route("/api/v1/ops", func(r chi.Router) {
		r.Use(jwtAuth)
		r.Use(middleware.RequireJSON)
		// Domain restriction: only @featuresignals.com users
		r.Use(middleware.RequireDomain("featuresignals.com"))

		// Environments
		r.Get("/environments", opsH.ListEnvironments)
		r.Get("/environments/{id}", opsH.GetEnvironment)
		r.Get("/environments/vps/{vps_id}", opsH.GetEnvironment)
		r.Post("/environments/provision", opsH.ProvisionEnvironment)
		r.Post("/environments/{id}/decommission", opsH.DecommissionEnvironment)
		r.Post("/environments/{id}/maintenance", opsH.ToggleMaintenance)
		r.Post("/environments/{id}/debug", opsH.ToggleDebug)
		r.Post("/environments/{id}/restart", opsH.RestartEnvironment)

		// Licenses
		r.Get("/licenses", opsH.ListLicenses)
		r.Get("/licenses/{id}", opsH.GetLicense)
		r.Get("/licenses/org/{org_id}", opsH.GetLicenseByOrg)
		r.Post("/licenses", opsH.CreateLicense)
		r.Post("/licenses/{id}/revoke", opsH.RevokeLicense)
		r.Post("/licenses/{id}/quota-override", opsH.OverrideLicenseQuota)
		r.Post("/licenses/{id}/reset-usage", opsH.ResetLicenseUsage)

		// Sandboxes
		r.Get("/sandboxes", opsH.ListSandboxes)
		r.Post("/sandboxes", opsH.CreateSandbox)
		r.Post("/sandboxes/{id}/renew", opsH.RenewSandbox)
		r.Post("/sandboxes/{id}/decommission", opsH.DecommissionSandbox)

		// Financial
		r.Get("/financial/costs/daily", opsH.GetCostDaily)
		r.Get("/financial/costs/monthly", opsH.GetCostMonthly)
		r.Get("/financial/summary", opsH.GetFinancialSummary)

		// Customers
		r.Get("/customers", opsH.ListCustomers)
		r.Get("/customers/{org_id}", opsH.GetCustomerDetail)

		// Ops Users
		r.Get("/users", opsH.ListOpsUsers)
		r.Get("/users/{id}", opsH.GetOpsUser)
		r.Get("/users/me", opsH.GetMe)
		r.Post("/users", opsH.CreateOpsUser)
		r.Patch("/users/{id}", opsH.UpdateOpsUser)

		// Audit
		r.Get("/audit", opsH.ListOpsAuditLogs)
	})

	return r
}
