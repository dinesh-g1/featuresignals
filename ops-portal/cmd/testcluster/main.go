package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/featuresignals/ops-portal/internal/testcluster"
)

func main() {
	server, err := testcluster.New()
	if err != nil {
		log.Fatalf("failed to start test cluster: %v", err)
	}

	fmt.Printf("Test cluster listening on 127.0.0.1:%d\n", server.Port())
	fmt.Printf("API Token: %s\n", server.APIToken())

	// Write port to temp file for test script
	portFile := "/tmp/testcluster_port.txt"
	if err := os.WriteFile(portFile, []byte(fmt.Sprintf("%d", server.Port())), 0644); err != nil {
		log.Printf("Warning: failed to write port file: %v", err)
	}

	// Wait for signal
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	fmt.Println("\nShutting down...")
	server.Close()
}