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
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/store/cache"
)

func NewRouter(
	store domain.Store,
	jwtMgr *auth.JWTManager,
	evalCache *cache.Cache,
	engine *eval.Engine,
	sseServer *sse.Server,
	logger *slog.Logger,
	corsOrigins []string,
) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logging(logger))
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-API-Key"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "featuresignals"})
	})

	// Init handlers
	authH := handlers.NewAuthHandler(store, jwtMgr)
	projectH := handlers.NewProjectHandler(store)
	envH := handlers.NewEnvironmentHandler(store)
	flagH := handlers.NewFlagHandler(store)
	segmentH := handlers.NewSegmentHandler(store)
	apiKeyH := handlers.NewAPIKeyHandler(store)
	auditH := handlers.NewAuditHandler(store)
	evalH := handlers.NewEvalHandler(store, evalCache, engine, sseServer, logger)

	r.Route("/v1", func(r chi.Router) {
		// Public auth routes
		r.Post("/auth/register", authH.Register)
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/refresh", authH.Refresh)

		// Evaluation API (authenticated via API key, rate limited)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(1000))
			r.Post("/evaluate", evalH.Evaluate)
			r.Post("/evaluate/bulk", evalH.BulkEvaluate)
			r.Get("/client/{envKey}/flags", evalH.ClientFlags)
			r.Get("/stream/{envKey}", evalH.Stream)
		})

		// Management API (authenticated via JWT)
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtMgr))

			// Projects
			r.Post("/projects", projectH.Create)
			r.Get("/projects", projectH.List)
			r.Get("/projects/{projectID}", projectH.Get)
			r.Delete("/projects/{projectID}", projectH.Delete)

			// Environments
			r.Post("/projects/{projectID}/environments", envH.Create)
			r.Get("/projects/{projectID}/environments", envH.List)
			r.Delete("/projects/{projectID}/environments/{envID}", envH.Delete)

			// Flags
			r.Post("/projects/{projectID}/flags", flagH.Create)
			r.Get("/projects/{projectID}/flags", flagH.List)
			r.Get("/projects/{projectID}/flags/{flagKey}", flagH.Get)
			r.Put("/projects/{projectID}/flags/{flagKey}", flagH.Update)
			r.Delete("/projects/{projectID}/flags/{flagKey}", flagH.Delete)

			// Flag states (per environment)
			r.Put("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.UpdateState)
			r.Get("/projects/{projectID}/flags/{flagKey}/environments/{envID}", flagH.GetState)

			// Segments
			r.Post("/projects/{projectID}/segments", segmentH.Create)
			r.Get("/projects/{projectID}/segments", segmentH.List)
			r.Get("/projects/{projectID}/segments/{segmentKey}", segmentH.Get)
			r.Delete("/projects/{projectID}/segments/{segmentKey}", segmentH.Delete)

			// API Keys
			r.Post("/environments/{envID}/api-keys", apiKeyH.Create)
			r.Get("/environments/{envID}/api-keys", apiKeyH.List)
			r.Delete("/api-keys/{keyID}", apiKeyH.Revoke)

			// Audit
			r.Get("/audit", auditH.List)
		})
	})

	return r
}
