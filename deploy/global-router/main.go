package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Global Router starting...")

	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		configPath = "/etc/router/config.yaml"
	}

	cfg, err := LoadConfig(configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	router := NewRouter(cfg)

	// Start rate limiter cleanup goroutine
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go router.defaultRateLimiter.CleanupLoop(ctx)

	// Start DNS server (if enabled)
	dnsServer := NewDNSServer(cfg)
	go func() {
		if err := dnsServer.Start(); err != nil {
			log.Printf("DNS server error: %v", err)
		}
	}()

	// Dev mode: HTTP only, no TLS
	if devPort := os.Getenv("DEV_PORT"); devPort != "" {
		log.Printf("DEV MODE: starting HTTP server on :%s", devPort)
		httpServer := &http.Server{
			Addr:    ":" + devPort,
			Handler: router.securityMiddleware(router),
		}
		go func() {
			log.Printf("HTTP server listening on :%s", devPort)
			if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatalf("HTTP server error: %v", err)
			}
		}()

		// Graceful shutdown for dev mode
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig

		log.Println("Shutting down dev server...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()
		httpServer.Shutdown(shutdownCtx)
		cancel()
		log.Println("Global Router stopped")
		return
	}

	// Production mode: TLS with Let's Encrypt
	go func() {
		if err := router.startTLS(); err != nil {
			log.Fatalf("TLS server error: %v", err)
		}
	}()

	log.Println("Global Router started successfully (TLS mode)")

	// Graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	log.Println("Shutting down...")
	cancel()
	log.Println("Global Router stopped")
}