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

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/store/cache"
	"github.com/featuresignals/server/internal/store/postgres"
)

func main() {
	cfg := config.Load()

	// Logger
	logLevel := slog.LevelInfo
	if cfg.LogLevel == "debug" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: logLevel}))
	slog.SetDefault(logger)

	// Database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
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

	// Components
	store := postgres.NewStore(pool)
	jwtMgr := auth.NewJWTManager(cfg.JWTSecret, cfg.TokenTTL, cfg.RefreshTTL)
	engine := eval.NewEngine()
	sseServer := sse.NewServer(logger)
	evalCache := cache.NewCache(store, logger)

	// Start listening for PG NOTIFY changes
	listenCtx, listenCancel := context.WithCancel(context.Background())
	defer listenCancel()
	if err := evalCache.StartListening(listenCtx); err != nil {
		logger.Warn("failed to start PG LISTEN (cache invalidation disabled)", "error", err)
	}

	// Router
	router := api.NewRouter(store, jwtMgr, evalCache, engine, sseServer, logger, cfg.CORSOrigins)

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
	logger.Info("server stopped")
}
