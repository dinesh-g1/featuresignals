package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"

	"golang.org/x/crypto/acme/autocert"
)

func (r *Router) startTLS() error {
	cfg := r.config.Router

	// Collect all domain names for the certificate
	var domains []string
	for _, d := range cfg.Domains {
		domains = append(domains, d.Name)
	}

	certManager := &autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domains...),
		Cache:      autocert.DirCache(cfg.TLS.CacheDir),
		Email:      cfg.Email,
	}

	// HTTP-01 challenge server on port 80 (redirects to HTTPS)
	go func() {
		httpServer := &http.Server{
			Addr:    ":80",
			Handler: certManager.HTTPHandler(http.HandlerFunc(r.redirectHTTP)),
		}
		log.Printf("HTTP redirect server listening on :80")
		if err := httpServer.ListenAndServe(); err != nil {
			log.Printf("HTTP redirect server error: %v", err)
		}
	}()

	tlsConfig := &tls.Config{
		GetCertificate: certManager.GetCertificate,
		MinVersion:     tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{
			tls.X25519,
			tls.CurveP256,
		},
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
	}

	addr := fmt.Sprintf(":%d", cfg.TLS.Port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	tlsListener := tls.NewListener(listener, tlsConfig)

	server := &http.Server{
		Handler: r.securityMiddleware(r),
	}

	log.Printf("TLS server listening on %s", addr)
	return server.Serve(tlsListener)
}

func (r *Router) redirectHTTP(w http.ResponseWriter, req *http.Request) {
	target := "https://" + req.Host + req.URL.RequestURI()
	http.Redirect(w, req, target, http.StatusMovedPermanently)
}