package main

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	"golang.org/x/crypto/acme/autocert"
)

// tlsSetup holds the servers and listeners needed for TLS operation.
// The caller is responsible for calling Serve on the tlsServer with
// tlsListener, and ListenAndServe on the challengeServer. The caller
// must also call Shutdown on both servers during graceful shutdown.
type tlsSetup struct {
	tlsServer       *http.Server
	challengeServer *http.Server
	tlsListener     net.Listener
	certManager     *autocert.Manager
}

// setupTLS configures TLS with Let's Encrypt autocert and returns the
// servers and listener. Does not start serving — the caller must call
// Serve / ListenAndServe on the returned servers.
func (r *Router) setupTLS(handler http.Handler) (*tlsSetup, error) {
	cfg := r.config.Router

	// Collect all domain names for the certificate
	var domains []string
	for _, d := range cfg.Domains {
		domains = append(domains, d.Name)
	}

	if len(domains) == 0 {
		return nil, fmt.Errorf("no domains configured for TLS")
	}

	certManager := &autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domains...),
		Cache:      autocert.DirCache(cfg.TLS.CacheDir),
		Email:      cfg.Email,
	}

	// HTTP-01 challenge server on port 80 — also redirects non-challenge traffic to HTTPS
	challengeSrv := &http.Server{
		Addr:    ":80",
		Handler: certManager.HTTPHandler(http.HandlerFunc(r.redirectHTTP)),
	}

	tlsConfig := &tls.Config{
		GetCertificate: certManager.GetCertificate,
		MinVersion:     tls.VersionTLS13,
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
		return nil, fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	tlsListener := tls.NewListener(listener, tlsConfig)

	tlsSrv := &http.Server{
		Handler:      handler,
		TLSConfig:    tlsConfig,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	slog.Info("TLS configured",
		"domains", domains,
		"tls_port", cfg.TLS.Port,
		"cache_dir", cfg.TLS.CacheDir,
	)

	return &tlsSetup{
		tlsServer:       tlsSrv,
		challengeServer: challengeSrv,
		tlsListener:     tlsListener,
		certManager:     certManager,
	}, nil
}

func (r *Router) redirectHTTP(w http.ResponseWriter, req *http.Request) {
	if !r.allowedDomains[req.Host] {
		http.Error(w, "400 Bad Request", http.StatusBadRequest)
		return
	}
	target := "https://" + req.Host + req.URL.RequestURI()
	http.Redirect(w, req, target, http.StatusMovedPermanently)
}

// updateDomains refreshes the autocert HostWhitelist with domains from a new config.
// Called on SIGHUP to support adding domains without restarting.
func (ts *tlsSetup) updateDomains(newCfg *Config) {
	var domains []string
	for _, d := range newCfg.Router.Domains {
		domains = append(domains, d.Name)
	}
	ts.certManager.HostPolicy = autocert.HostWhitelist(domains...)
	slog.Info("autocert host whitelist updated", "domains", domains)
}
