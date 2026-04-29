package main

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/featuresignals/ops-portal/internal/api"
	"github.com/featuresignals/ops-portal/internal/cloudflare"
	"github.com/featuresignals/ops-portal/internal/cluster"
	"github.com/featuresignals/ops-portal/internal/config"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/github"
	"github.com/featuresignals/ops-portal/internal/hetzner"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/featuresignals/ops-portal/internal/store/postgres"
	"github.com/featuresignals/ops-portal/web"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		logger.Error("invalid configuration", "error", err)
		os.Exit(1)
	}

	if !cfg.IsProduction() {
		logger.Warn("running in development mode — JWT secret is insecure default")
	}

	// Template FS
	templateFS, err := fs.Sub(web.FS, "templates")
	if err != nil {
		logger.Error("failed to get template sub-filesystem", "error", err)
		os.Exit(1)
	}
	httputil.InitTemplates(templateFS, !cfg.IsProduction())

	// PostgreSQL database
	logger.Info("connecting to database", "url", cfg.DatabaseURL)
	store, err := postgres.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer store.Close()

	// Seed default admin user
	seedAdminUser(store.Users, cfg, logger)

	// External API clients
	clusterClient := cluster.NewClient()
	githubClient := github.NewClient(cfg.GitHubToken, cfg.GitHubOwner, cfg.GitHubRepo)
	hetznerClient := hetzner.NewClient(cfg.HetznerToken)
	cloudflareClient := cloudflare.NewClient(cfg.CloudflareToken, cfg.CloudflareZoneID)

	// Wired domain store
	domainStore := &domain.Store{
		Clusters:        store.Clusters,
		Users:           store.Users,
		Deploy:          store.Deploy,
		Config:          store.Config,
		Audit:           store.Audit,
		ConfigTemplates: store.ConfigTemplates,
	}

	// Build router with all clients
	handler := api.NewRouter(domainStore, clusterClient, githubClient, hetznerClient, cloudflareClient, cfg, logger, web.FS)

	// HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("ops portal starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	logger.Info("shutting down", "signal", sig.String())

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("server stopped gracefully")
}

func seedAdminUser(users domain.OpsUserStore, cfg *config.Config, logger *slog.Logger) {
	ctx := context.Background()
	existing, err := users.List(ctx)
	if err == nil && len(existing) > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.SeedPassword), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("failed to hash seed password", "error", err)
		return
	}

	admin := &domain.OpsUser{
		ID:           uuid.New().String(),
		Email:        cfg.SeedEmail,
		PasswordHash: string(hash),
		Name:         cfg.SeedName,
		Role:         "admin",
		CreatedAt:    time.Now().UTC(),
	}

	if err := users.Create(ctx, admin); err != nil {
		logger.Warn("failed to create seed admin user (may already exist)", "error", err)
		return
	}

	logger.Info("seed admin user created", "email", cfg.SeedEmail, "name", cfg.SeedName)
}