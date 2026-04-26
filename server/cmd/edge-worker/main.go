package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/handlers"
	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/httputil"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := config.Load()
	_ = cfg // config available for future use (DB connection, etc.)

	// Create evaluation engine
	engine := eval.NewEngine()
	cache := handlers.NewRulesetCache()

	// Create minimal router with only evaluation endpoints
	r := chi.NewRouter()

	// Health
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "healthy"})
	})

	// Metrics
	r.Get("/metrics", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("# edge-worker metrics\nedge_worker_up 1\n"))
	})

	// Evaluation endpoints
	evalHandler := handlers.NewEvalHandler(nil, cache, engine, nil, logger, nil, nil)
	r.Post("/v1/evaluate", evalHandler.Evaluate)
	r.Post("/v1/evaluate/bulk", evalHandler.BulkEvaluate)
	r.Get("/v1/client/{envKey}/flags", evalHandler.ClientFlags)

	// Start server
	addr := ":" + os.Getenv("PORT")
	if addr == ":" {
		addr = ":8081"
	}

	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		logger.Info("shutting down edge worker...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
	}()

	logger.Info("edge worker starting", "addr", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}