// =============================================================================
// FeatureSignals — Preview Proxy
// =============================================================================
//
// Dynamic reverse proxy for preview environments. Receives all traffic for
// *.preview.featuresignals.com from the Caddy ingress controller and routes
// it to the correct preview namespace's service.
//
// Subdomain format:
//   api.preview-{N}.preview.featuresignals.com  →  preview-pr-{N}/server:8080
//   app.preview-{N}.preview.featuresignals.com  →  preview-pr-{N}/dashboard:3000
//
// The proxy uses the Kubernetes API to verify namespace existence and builds
// the upstream URL dynamically. No per-preview configuration needed.
//
// Build:
//   CGO_ENABLED=0 go build -ldflags="-s -w" -o preview-proxy .
//
// Container image:
//   docker build -t ghcr.io/featuresignals/preview-proxy:latest .
// =============================================================================

package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// =============================================================================
// Constants
// =============================================================================

const (
	// DefaultPort is the port the proxy listens on.
	DefaultPort = "8080"

	// ProxyTimeout is the maximum time allowed for forwarding a request.
	ProxyTimeout = 30 * time.Second

	// HealthCheckInterval is how often namespace existence is re-checked.
	HealthCheckInterval = 30 * time.Second

	// DnsDomain is the preview DNS suffix.
	DnsDomain = "preview.featuresignals.com"

	// NamespacePrefix is the k8s namespace prefix for previews.
	NamespacePrefix = "preview-pr-"
)

// subdomainPattern matches preview subdomains and captures service type
// (api or app), and the preview number.
//
// Examples:
//   api.preview-42.preview.featuresignals.com
//   app.preview-42.preview.featuresignals.com
//
// Groups: 1 = service (api|app), 2 = preview number
var subdomainPattern = regexp.MustCompile(`^(api|app)\.preview-(\d+)\.` + regexp.QuoteMeta(DnsDomain) + `$`)

// =============================================================================
// Upstream Mapping
// =============================================================================

// upstreamTarget describes where to proxy a request.
type upstreamTarget struct {
	Namespace string // k8s namespace (e.g., "preview-pr-42")
	Service   string // k8s service name (e.g., "server" or "dashboard")
	Port      string // service port (e.g., "8080" or "3000")
}

// serviceMappings maps the subdomain service prefix to k8s service details.
var serviceMappings = map[string]struct {
	Service string
	Port    string
}{
	"api": {Service: "server", Port: "8080"},
	"app": {Service: "dashboard", Port: "3000"},
}

// =============================================================================
// Preview Proxy
// =============================================================================

// PreviewProxy is the main proxy handler. It maintains a cache of verified
// namespace existence to avoid hitting the K8s API on every request.
type PreviewProxy struct {
	clientset kubernetes.Interface

	// namespaceCache tracks which preview namespaces have been verified.
	// Entries expire after HealthCheckInterval.
	namespaceCache sync.Map

	logger *slog.Logger
}

// NewPreviewProxy creates a new PreviewProxy with the given Kubernetes client.
func NewPreviewProxy(clientset kubernetes.Interface, logger *slog.Logger) *PreviewProxy {
	return &PreviewProxy{
		clientset: clientset,
		logger:    logger,
	}
}

// parseSubdomain extracts the upstream target from the request's Host header.
// Returns nil if the host doesn't match the expected pattern.
func (p *PreviewProxy) parseSubdomain(host string) *upstreamTarget {
	matches := subdomainPattern.FindStringSubmatch(host)
	if matches == nil {
		return nil
	}

	serviceType := matches[1]   // "api" or "app"
	previewNum := matches[2]    // the PR number

	mapping, ok := serviceMappings[serviceType]
	if !ok {
		return nil
	}

	return &upstreamTarget{
		Namespace: fmt.Sprintf("%s%s", NamespacePrefix, previewNum),
		Service:   mapping.Service,
		Port:      mapping.Port,
	}
}

// namespaceExists checks if a namespace exists, using the cache if available.
func (p *PreviewProxy) namespaceExists(ctx context.Context, namespace string) bool {
	// Check cache first
	if _, ok := p.namespaceCache.Load(namespace); ok {
		return true
	}

	// Check with K8s API
	_, err := p.clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return false
	}

	// Cache the result with an expiry
	p.namespaceCache.Store(namespace, time.Now())
	return true
}

// startCacheEviction periodically clears the namespace cache so that deleted
// previews stop being routed to.
func (p *PreviewProxy) startCacheEviction(ctx context.Context) {
	ticker := time.NewTicker(HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			p.namespaceCache.Range(func(key, value interface{}) bool {
				ns := key.(string)
				// Re-verify namespace still exists
				_, err := p.clientset.CoreV1().Namespaces().Get(ctx, ns, metav1.GetOptions{})
				if err != nil {
					p.namespaceCache.Delete(ns)
					p.logger.Debug("evicted namespace from cache", "namespace", ns)
				}
				return true
			})
		case <-ctx.Done():
			return
		}
	}
}

// buildUpstreamURL constructs the target URL for the reverse proxy.
func buildUpstreamURL(target *upstreamTarget) *url.URL {
	// Use the Kubernetes internal DNS name:
	//   <service>.<namespace>.svc.cluster.local:<port>
	host := fmt.Sprintf("%s.%s.svc.cluster.local:%s", target.Service, target.Namespace, target.Port)
	return &url.URL{
		Scheme: "http",
		Host:   host,
	}
}

// ServeHTTP implements the http.Handler interface.
func (p *PreviewProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	logger := p.logger.With("request_id", r.Header.Get("X-Request-ID"))

	// Parse subdomain
	target := p.parseSubdomain(r.Host)
	if target == nil {
		logger.Warn("unrecognized preview subdomain",
			"host", r.Host,
			"path", r.URL.Path,
		)
		http.Error(w, fmt.Sprintf("unrecognized preview subdomain: %s", r.Host), http.StatusNotFound)
		return
	}

	// Check namespace exists
	if !p.namespaceExists(r.Context(), target.Namespace) {
		logger.Warn("preview namespace not found",
			"namespace", target.Namespace,
			"service", target.Service,
			"host", r.Host,
		)
		http.Error(w, fmt.Sprintf("preview %s is not available", target.Namespace), http.StatusNotFound)
		return
	}

	// Build upstream URL
	upstreamURL := buildUpstreamURL(target)

	logger.Info("proxying request",
		"namespace", target.Namespace,
		"service", target.Service,
		"upstream", upstreamURL.Host,
		"path", r.URL.Path,
		"method", r.Method,
	)

	// Create reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(upstreamURL)

	// Configure the proxy
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)

		// Preserve the original Host header for the backend
		req.Host = fmt.Sprintf("%s.%s.%s", target.Service, target.Namespace, DnsDomain)

		// Set forwarded headers
		req.Header.Set("X-Forwarded-Host", r.Host)
		req.Header.Set("X-Forwarded-For", r.RemoteAddr)
		req.Header.Set("X-Forwarded-Proto", r.URL.Scheme)
		req.Header.Set("X-Preview-Namespace", target.Namespace)
		req.Header.Set("X-Preview-Number", strings.TrimPrefix(target.Namespace, NamespacePrefix))

		// Propagate trace headers
		if traceID := r.Header.Get("X-Trace-ID"); traceID != "" {
			req.Header.Set("X-Trace-ID", traceID)
		}
	}

	// Error handler for upstream failures
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		logger.Error("upstream proxy error",
			"error", err,
			"namespace", target.Namespace,
			"service", target.Service,
			"upstream", upstreamURL.Host,
		)
		http.Error(w, "upstream service unavailable", http.StatusBadGateway)
	}

	// Set a timeout on the request context
	ctx, cancel := context.WithTimeout(r.Context(), ProxyTimeout)
	defer cancel()

	// Forward the request with timeout
	proxy.ServeHTTP(w, r.WithContext(ctx))

	// Log completion
	elapsed := time.Since(startTime)
	logger.Debug("request completed",
		"duration_ms", elapsed.Milliseconds(),
		"status", "forwarded",
	)
}

// =============================================================================
// Health Handler
// =============================================================================

// healthHandler responds to health check requests.
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"ok","service":"preview-proxy"}`)
}

// =============================================================================
// Main
// =============================================================================

func main() {
	// ---- Structured Logger ----
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	logger = logger.With("service", "preview-proxy")

	// ---- Kubernetes Client ----
	config, err := rest.InClusterConfig()
	if err != nil {
		logger.Error("failed to create in-cluster config (are we running in k8s?)", "error", err)
		os.Exit(1)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		logger.Error("failed to create kubernetes client", "error", err)
		os.Exit(1)
	}

	// ---- Proxy Setup ----
	proxy := NewPreviewProxy(clientset, logger)

	// Start background cache eviction
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go proxy.startCacheEviction(ctx)

	// ---- HTTP Server ----
	port := os.Getenv("PORT")
	if port == "" {
		port = DefaultPort
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/healthz", healthHandler)
	mux.Handle("/", proxy)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ---- Graceful Shutdown ----
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("starting preview proxy", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for shutdown signal
	sig := <-quit
	logger.Info("shutting down", "signal", sig)

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("forced shutdown", "error", err)
		os.Exit(1)
	}

	logger.Info("shutdown complete")
}