package api

import (
	"io/fs"
	"log/slog"
	"net/http"
	"strings"

	"github.com/featuresignals/ops-portal/internal/api/handlers"
	"github.com/featuresignals/ops-portal/internal/api/middleware"
	"github.com/featuresignals/ops-portal/internal/cloudflare"
	"github.com/featuresignals/ops-portal/internal/cluster"
	"github.com/featuresignals/ops-portal/internal/config"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/github"
	"github.com/featuresignals/ops-portal/internal/hetzner"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

func NewRouter(
	store *domain.Store,
	clusterClient *cluster.Client,
	githubClient *github.Client,
	hetznerClient *hetzner.Client,
	cloudflareClient *cloudflare.Client,
	cfg *config.Config,
	logger *slog.Logger,
	webFS fs.FS,
) http.Handler {
	r := chi.NewRouter()

	// ── Global middleware ──────────────────────────────────────────────
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Compress(5))
	r.Use(middleware.SecureHeaders)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.SafeRecoverer)

	// ── Static files ──────────────────────────────────────────────────
	staticFS, err := fs.Sub(webFS, "static")
	if err != nil {
		logger.Error("failed to get static sub-filesystem", "error", err)
	}
	fileServer := http.FileServer(http.FS(staticFS))
	r.Handle("/static/*", http.StripPrefix("/static/", fileServer))

	// ── Health (no auth) ──────────────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "ops-portal",
		})
	})

	// ── Auth routes (no auth required) ─────────────────────────────────
	authHandler := handlers.NewAuthHandler(store.Users, store.Audit, cfg, logger)
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/login", authHandler.Login)
		r.Post("/refresh", authHandler.Refresh)
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(authHandler))
			r.Post("/logout", authHandler.Logout)
			r.Get("/me", authHandler.Me)
		})
	})

	// ── Login page (no auth) ──────────────────────────────────────────
	r.Get("/login", func(w http.ResponseWriter, r *http.Request) {
		httputil.RenderTemplate(w, "login", nil)
	})

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/login", http.StatusFound)
	})

	// ── Authenticated API routes ───────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.JWTAuth(authHandler))

		// Dashboard
		dashboardHandler := handlers.NewDashboardHandler(store.Clusters, clusterClient, logger)
		r.Get("/api/v1/dashboard", dashboardHandler.Dashboard)

		// Clusters
		clusterHandler := handlers.NewClusterHandler(store.Clusters, clusterClient, logger)
		r.Route("/api/v1/clusters", func(r chi.Router) {
			r.Get("/", clusterHandler.List)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/", clusterHandler.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", clusterHandler.Get)
				r.With(middleware.RequireRole(middleware.RoleAdmin)).Put("/", clusterHandler.Update)
				r.With(middleware.RequireRole(middleware.RoleAdmin)).Delete("/", clusterHandler.Delete)
				r.Get("/health", clusterHandler.Health)
				r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/provision", clusterHandler.Provision)
				r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/deprovision", clusterHandler.Deprovision)
				r.Get("/metrics", clusterHandler.Metrics)

				// Config sub-routes (engineer+)
				configHandler := handlers.NewConfigHandler(store.Clusters, store.Config, clusterClient, store.Audit, logger)
				r.Route("/config", func(r chi.Router) {
					r.Use(middleware.RequireRoleOrAbove(middleware.RoleEngineer))
					r.Get("/", configHandler.Get)
					r.Put("/", configHandler.Update)
					r.Get("/history", configHandler.History)
					r.Get("/resolved", configHandler.Resolved)
					r.Get("/rate-limits", configHandler.RateLimits)
					r.Put("/rate-limits", configHandler.UpdateRateLimits)
				})

				// Deployments for this cluster
				deployHandler := handlers.NewDeploymentHandler(store.Deploy, store.Clusters, logger)
				r.Get("/deployments", deployHandler.ListByCluster)
			})
		})

		// Deployments
		deployHandler := handlers.NewDeploymentHandler(store.Deploy, store.Clusters, logger)
		r.Route("/api/v1/deployments", func(r chi.Router) {
			r.Get("/", deployHandler.List)
			r.With(middleware.RequireRoleOrAbove(middleware.RoleEngineer)).Post("/", deployHandler.Create)
			r.With(middleware.RequireRoleOrAbove(middleware.RoleEngineer)).Post("/canary", deployHandler.CanaryCreate)
			r.Route("/{deploymentID}", func(r chi.Router) {
				r.Get("/", deployHandler.Get)
				r.With(middleware.RequireRoleOrAbove(middleware.RoleEngineer)).Post("/rollback", deployHandler.Rollback)
				r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/approve-canary", deployHandler.ApproveCanary)
				r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/reject-canary", deployHandler.RejectCanary)
			})
		})

		// Users (admin-only)
		userHandler := handlers.NewUserHandler(store.Users, store.Audit, logger)
		r.Route("/api/v1/users", func(r chi.Router) {
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Get("/", userHandler.List)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/", userHandler.Create)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireRole(middleware.RoleAdmin))
				r.Route("/{id}", func(r chi.Router) {
					r.Get("/", userHandler.Get)
					r.Put("/", userHandler.Update)
					r.Delete("/", userHandler.Delete)
				})
			})
		})

		// Audit (engineer+)
		auditHandler := handlers.NewAuditHandler(store.Audit, logger)
		r.With(middleware.RequireRoleOrAbove(middleware.RoleEngineer)).Get("/api/v1/audit", auditHandler.List)
		r.With(middleware.RequireRoleOrAbove(middleware.RoleEngineer)).Get("/api/v1/audit/export", auditHandler.ExportCSV)

		// DNS (admin)
		dnsHandler := handlers.NewDNSHandler(cloudflareClient, store.Clusters, store.Audit, logger)
		r.Route("/api/v1/dns", func(r chi.Router) {
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Get("/records", dnsHandler.List)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/records", dnsHandler.Create)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Put("/records/{id}", dnsHandler.Update)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/sync", dnsHandler.Sync)
		})

		// Config Templates (admin)
		configTemplateHandler := handlers.NewConfigTemplateHandler(store.ConfigTemplates, logger)
		r.Route("/api/v1/config-templates", func(r chi.Router) {
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Get("/", configTemplateHandler.List)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Post("/", configTemplateHandler.Create)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Put("/{id}", configTemplateHandler.Update)
			r.With(middleware.RequireRole(middleware.RoleAdmin)).Delete("/{id}", configTemplateHandler.Delete)
		})

		// ── HTML page routes ──────────────────────────────────────────
		r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
			r.Header.Set("Accept", "text/html")
			dashboardHandler.Dashboard(w, r)
		})
		r.Get("/clusters", func(w http.ResponseWriter, r *http.Request) {
			httputil.RenderTemplate(w, "clusters-list", nil)
		})
		r.Get("/clusters/{id}", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			httputil.RenderTemplate(w, "clusters-detail", map[string]string{"ID": id})
		})
		r.Get("/clusters/{id}/config", func(w http.ResponseWriter, r *http.Request) {
			id := chi.URLParam(r, "id")
			httputil.RenderTemplate(w, "config-view", map[string]string{"ID": id})
		})
		r.Get("/deployments", func(w http.ResponseWriter, r *http.Request) {
			httputil.RenderTemplate(w, "deployments-list", nil)
		})
		r.Get("/deployments/new", func(w http.ResponseWriter, r *http.Request) {
			httputil.RenderTemplate(w, "deployments-new", nil)
		})
		r.Get("/audit", func(w http.ResponseWriter, r *http.Request) {
			httputil.RenderTemplate(w, "audit", nil)
		})
		r.Get("/users", func(w http.ResponseWriter, r *http.Request) {
			httputil.RenderTemplate(w, "users-list", nil)
		})
		r.Get("/dns", func(w http.ResponseWriter, r *http.Request) {
			httputil.RenderTemplate(w, "dns-list", nil)
		})
	})

	// ── 404 handler ──────────────────────────────────────────────────
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			httputil.Error(w, http.StatusNotFound, "route not found")
		} else {
			httputil.RenderTemplate(w, "404", nil)
		}
	})

	return r
}