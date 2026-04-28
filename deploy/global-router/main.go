package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
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

	// Start TLS server with Let's Encrypt
	// The health endpoint is handled inline inside router.ServeHTTP
	go func() {
		if err := router.startTLS(); err != nil {
			log.Fatalf("TLS server error: %v", err)
		}
	}()

	log.Println("Global Router started successfully")

	// Graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	log.Println("Shutting down...")
	cancel()
	log.Println("Global Router stopped")
}