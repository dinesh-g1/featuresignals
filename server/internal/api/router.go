package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/featuresignals/server/internal/api/handlers"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/sms"
)

// BillingConfig holds PayU credentials passed through from config.
type BillingConfig struct {
	PayUMerchantKey string
	PayUSalt        string
	PayUMode        string
	DashboardURL    string
	AppBaseURL      string
}

// NewRouter wires all handlers, middleware, and routes. All dependencies are
// passed as interfaces so the router (and the handlers it creates) can be
// tested without real infrastructure.
func NewRouter(
	store domain.Store,
	jwtMgr auth.TokenManager,
	evalCache handlers.RulesetCache,
	engine *eval.Engine,
	sseServer handlers.StreamServer,
	logger *slog.Logger,
	corsOrigins []string,
	metricsCollector *metrics.Collector,
	billing BillingConfig,
	smsClient sms.Sender,
	emailSender email.VerificationSender,
	appBaseURL string,
	dashboardURL string,
) http.Handler {
	r := chi.NewRouter()

	// CORS must be first so every response (including panic recoveries) gets headers.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-API-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logging(logger))
	r.Use(chimw.Recoverer)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "featuresignals"})
	})

	// Reusable role sets
	ownerAdmin := []domain.Role{domain.RoleOwner, domain.RoleAdmin}
	writers := []domain.Role{domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper}
	allRoles := []domain.Role{domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper, domain.RoleViewer}

	// Init handlers
	authH := handlers.NewAuthHandler(store, jwtMgr, smsClient, emailSender, appBaseURL, dashboardURL)
	projectH := handlers.NewProjectHandler(store)
	envH := handlers.NewEnvironmentHandler(store)
	flagH := handlers.NewFlagHandler(store)
	segmentH := handlers.NewSegmentHandler(store)
	apiKeyH := handlers.NewAPIKeyHandler(store)
	auditH := handlers.NewAuditHandler(store)
	teamH := handlers.NewTeamHandler(store, jwtMgr)
	webhookH := handlers.NewWebhookHandler(store)
	approvalH := handlers.NewApprovalHandler(store)
	evalH := handlers.NewEvalHandler(store, evalCache, engine, sseServer, logger, metricsCollector)
	impressionCollector := metrics.NewImpressionCollector(100_000)
	metricsH := handlers.NewMetricsHandler(metricsCollector, impressionCollector)
	billingH := handlers.NewBillingHandler(store, billing.PayUMerchantKey, billing.PayUSalt, billing.PayUMode, billing.DashboardURL, billing.AppBaseURL, logger)
	onboardingH := handlers.NewOnboardingHandler(store, logger)
	demoH := handlers.NewDemoHandler(handlers.DemoHandlerConfig{
		Store:           store,
		JWTMgr:          jwtMgr,
		Logger:          logger,
		SMSClient:       smsClient,
		EmailSender:     emailSender,
		AppBaseURL:      appBaseURL,
		DashboardURL:    dashboardURL,
		PayUMerchantKey: billing.PayUMerchantKey,
		PayUSalt:        billing.PayUSalt,
		PayUMode:        billing.PayUMode,
	})

	jwtAuth := middleware.JWTAuth(jwtMgr)

	r.Route("/v1", func(r chi.Router) {
		// Public auth routes
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/refresh", authH.Refresh)
		r.Get("/auth/verify-email", authH.VerifyEmail)
		r.Post("/auth/token-exchange", authH.TokenExchange)

		// PayU callbacks (public — PayU redirects here after payment)
		r.Post("/billing/payu/callback", billingH.PayUCallback)
		r.Post("/billing/payu/failure", billingH.PayUFailure)

		// Demo routes (session creation is public + rate-limited; convert/feedback require JWT)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(10))
			r.Post("/demo/session", demoH.CreateSession)
		})
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Post("/demo/convert", demoH.Convert)
			r.Post("/demo/select-plan", demoH.SelectPlan)
			r.Post("/demo/feedback", demoH.Feedback)
		})

		// Auth verification (authenticated via JWT)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Post("/auth/send-otp", authH.SendOTP)
			r.Post("/auth/verify-otp", authH.VerifyOTP)
			r.Post("/auth/send-verification-email", authH.SendVerificationEmail)
		})

		// Billing & onboarding (authenticated via JWT)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Post("/billing/checkout", billingH.CreateCheckout)
			r.Get("/billing/subscription", billingH.GetSubscription)
			r.Get("/billing/usage", billingH.GetUsage)
			r.Get("/onboarding", onboardingH.GetState)
			r.Patch("/onboarding", onboardingH.UpdateState)
		})

		// Evaluation API (authenticated via API key, rate limited)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(1000))
			r.Post("/evaluate", evalH.Evaluate)
			r.Post("/evaluate/bulk", evalH.BulkEvaluate)
			r.Get("/client/{envKey}/flags", evalH.ClientFlags)
			r.Get("/stream/{envKey}", evalH.Stream)
			r.Post("/track", metricsH.TrackImpression)
		})

		// Management API (authenticated via JWT, with demo expiry and tier enforcement)
		r.Group(func(r chi.Router) {
			r.Use(jwtAuth)
			r.Use(middleware.DemoExpiry(dashboardURL + "/demo/register"))
			r.Use(middleware.TierEnforce(store, logger))

			// ── Read-only routes (all authenticated roles) ───────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(allRoles...))

				r.Get("/projects", projectH.List)
				r.Get("/projects/{projectID}", projectH.Get)
				r.Get("/projects/{projectID}/environments", envH.List)
				r.Get("/projects/{projectID}/flags", flagH.List)
				r.Get("/projects/{projectID}/flags/{flagKey}", flagH.Get)
				r.Get("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.GetState)
				r.Get("/projects/{projectID}/segments", segmentH.List)
				r.Get("/projects/{projectID}/segments/{segmentKey}", segmentH.Get)
				r.Get("/environments/{envID}/api-keys", apiKeyH.List)
				r.Get("/audit", auditH.List)
				r.Get("/members", teamH.List)
				r.Get("/members/{memberID}/permissions", teamH.ListPermissions)
				r.Get("/approvals", approvalH.List)
				r.Get("/approvals/{approvalID}", approvalH.Get)
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
				r.Post("/approvals", approvalH.Create)
				r.Post("/projects/{projectID}/segments", segmentH.Create)
				r.Put("/projects/{projectID}/segments/{segmentKey}", segmentH.Update)
				r.Delete("/projects/{projectID}/segments/{segmentKey}", segmentH.Delete)
			})

			// ── Admin-only routes (owner, admin) ─────────────────────
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(ownerAdmin...))

				r.Delete("/projects/{projectID}", projectH.Delete)
				r.Delete("/projects/{projectID}/environments/{envID}", envH.Delete)
				r.Post("/environments/{envID}/api-keys", apiKeyH.Create)
				r.Delete("/api-keys/{keyID}", apiKeyH.Revoke)
				r.Post("/approvals/{approvalID}/review", approvalH.Review)
				r.Post("/members/invite", teamH.Invite)
				r.Put("/members/{memberID}", teamH.UpdateRole)
				r.Delete("/members/{memberID}", teamH.Remove)
				r.Put("/members/{memberID}/permissions", teamH.UpdatePermissions)

				// Metrics
				r.Get("/metrics/evaluations", metricsH.Summary)
				r.Post("/metrics/evaluations/reset", metricsH.Reset)
				r.Get("/metrics/impressions", metricsH.ImpressionSummary)
				r.Post("/metrics/impressions/flush", metricsH.FlushImpressions)

				// Webhooks
				r.Post("/webhooks", webhookH.Create)
				r.Get("/webhooks", webhookH.List)
				r.Get("/webhooks/{webhookID}", webhookH.Get)
				r.Put("/webhooks/{webhookID}", webhookH.Update)
				r.Delete("/webhooks/{webhookID}", webhookH.Delete)
				r.Get("/webhooks/{webhookID}/deliveries", webhookH.ListDeliveries)
			})
		})
	})

	return r
}
