package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// ── Test helpers ────────────────────────────────────────────────────

// createTempStaticDir creates a temporary directory with the given files
// and returns the directory path. The caller should defer os.RemoveAll.
func createTempStaticDir(t *testing.T, files map[string]string) string {
	t.Helper()

	dir, err := os.MkdirTemp("", "router-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	for name, content := range files {
		fullPath := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
			os.RemoveAll(dir)
			t.Fatalf("failed to create parent dir for %s: %v", name, err)
		}
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			os.RemoveAll(dir)
			t.Fatalf("failed to write %s: %v", name, err)
		}
	}

	return dir
}

// ── 1. TestStaticFileServing ────────────────────────────────────────

func TestStaticFileServing(t *testing.T) {
	t.Parallel()

	staticDir := createTempStaticDir(t, map[string]string{
		"index.html":      "<html><body>Home</body></html>",
		"about.html":      "<html><body>About</body></html>",
		"styles/main.css": "body { color: red; }",
		"js/app.js":       "console.log('hello');",
	})
	defer os.RemoveAll(staticDir)

	cfg := testConfig([]Domain{
		{Name: "example.com", Type: "static", Root: staticDir},
	})
	_, handler := newTestRouter(cfg)

	tests := []struct {
		name           string
		path           string
		wantStatus     int
		wantContent    string
		wantCacheCtrl  string
	}{
		{
			name:          "root path serves index.html",
			path:          "/",
			wantStatus:    http.StatusOK,
			wantContent:   "<html><body>Home</body></html>",
			wantCacheCtrl: "public, max-age=3600",
		},
		{
			name:          "explicit index.html",
			path:          "/index.html",
			wantStatus:    http.StatusMovedPermanently,
			wantContent:   "",
			wantCacheCtrl: "",
		},
		{
			name:          "html file without extension",
			path:          "/about",
			wantStatus:    http.StatusOK,
			wantContent:   "<html><body>About</body></html>",
			wantCacheCtrl: "public, max-age=3600",
		},
		{
			name:          "css file with caching",
			path:          "/styles/main.css",
			wantStatus:    http.StatusOK,
			wantContent:   "body { color: red; }",
			wantCacheCtrl: "public, max-age=86400",
		},
		{
			name:          "js file with caching",
			path:          "/js/app.js",
			wantStatus:    http.StatusOK,
			wantContent:   "console.log('hello');",
			wantCacheCtrl: "public, max-age=86400",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := newRequest("GET", tc.path, "example.com")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}

			if tc.wantContent != "" && rec.Body.String() != tc.wantContent {
				t.Errorf("expected body %q, got %q", tc.wantContent, rec.Body.String())
			}

			if tc.wantCacheCtrl != "" {
				got := rec.Header().Get("Cache-Control")
				if got != tc.wantCacheCtrl {
					t.Errorf("expected Cache-Control %q, got %q", tc.wantCacheCtrl, got)
				}
			}
		})
	}
}

// ── 2. TestStaticFileNotFound ───────────────────────────────────────

func TestStaticFileNotFound(t *testing.T) {
	t.Parallel()

	staticDir := createTempStaticDir(t, map[string]string{
		"index.html": "<html><body>Home</body></html>",
	})
	defer os.RemoveAll(staticDir)

	cfg := testConfig([]Domain{
		{Name: "example.com", Type: "static", Root: staticDir},
	})
	_, handler := newTestRouter(cfg)

	tests := []struct {
		name string
		path string
	}{
		{"nonexistent file", "/nonexistent.html"},
		{"nonexistent directory", "/nonexistent/page.html"},
		{"nonexistent path", "/api/endpoint"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := newRequest("GET", tc.path, "example.com")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			if rec.Code != http.StatusNotFound {
				t.Errorf("expected 404 Not Found for %q, got %d", tc.path, rec.Code)
			}
		})
	}
}

// ── 3. TestProxyForwarding ──────────────────────────────────────────

func TestProxyForwarding(t *testing.T) {
	t.Parallel()

	// Create a test backend server
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Backend", "true")
		w.Header().Set("X-Received-Host", r.Host)
		w.Header().Set("X-Forwarded-Host", r.Header.Get("X-Forwarded-Host"))
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("backend response"))
	}))
	defer backend.Close()

	cfg := testConfig([]Domain{
		{Name: "proxy.example.com", Type: "proxy", Target: backend.URL},
	})
	_, handler := newTestRouter(cfg)

	req := newRequest("GET", "/api/data", "proxy.example.com")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}

	if rec.Body.String() != "backend response" {
		t.Errorf("expected 'backend response', got %q", rec.Body.String())
	}

	// Verify X-Backend header from backend
	if rec.Header().Get("X-Backend") != "true" {
		t.Error("expected X-Backend header from backend")
	}
}

// ── 4. TestProxyErrorHandling ───────────────────────────────────────

func TestProxyErrorHandling(t *testing.T) {
	t.Parallel()

	// Create a backend that immediately closes (simulating a down backend)
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate a connection failure by hijacking
		hj, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "hijacking not supported", http.StatusInternalServerError)
			return
		}
		conn, _, err := hj.Hijack()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		conn.Close()
	}))
	backendURL := backend.URL
	backend.Close() // Shut down the backend so the proxy can't connect

	cfg := testConfig([]Domain{
		{Name: "proxy.example.com", Type: "proxy", Target: backendURL},
	})
	r, _ := newTestRouter(cfg)

	req := newRequest("GET", "/api/data", "proxy.example.com")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	// Should get a 502 Bad Gateway when backend is unreachable
	if rec.Code != http.StatusBadGateway {
		t.Errorf("expected 502 Bad Gateway, got %d", rec.Code)
	}
}

// ── 5. TestPreBuiltProxiesExist ─────────────────────────────────────

func TestPreBuiltProxiesExist(t *testing.T) {
	t.Parallel()

	cfg := testConfig([]Domain{
		{Name: "static.example.com", Type: "static", Root: "/tmp"},
		{Name: "proxy1.example.com", Type: "proxy", Target: "http://127.0.0.1:8080"},
		{Name: "proxy2.example.com", Type: "proxy", Target: "http://127.0.0.1:9090"},
	})
	r, _ := newTestRouter(cfg)

	// Proxy domains should have pre-built proxies
	if _, ok := r.proxies["proxy1.example.com"]; !ok {
		t.Error("expected pre-built proxy for proxy1.example.com")
	}
	if _, ok := r.proxies["proxy2.example.com"]; !ok {
		t.Error("expected pre-built proxy for proxy2.example.com")
	}

	// Static domain should NOT have a proxy
	if _, ok := r.proxies["static.example.com"]; ok {
		t.Error("static domain should not have a proxy")
	}

	// Unknown domain should NOT have a proxy
	if _, ok := r.proxies["unknown.example.com"]; ok {
		t.Error("unknown domain should not have a proxy")
	}

	// Verify proxies are non-nil (pre-built during NewRouter)
	for name, proxy := range r.proxies {
		if proxy == nil {
			t.Errorf("proxy for %s is nil", name)
		}
	}

	// Verify we have exactly 2 proxies
	if len(r.proxies) != 2 {
		t.Errorf("expected 2 pre-built proxies, got %d", len(r.proxies))
	}
}

// ── Additional: TestStaticFileDirectoryServing ──────────────────────

func TestStaticFileDirectoryServing(t *testing.T) {
	t.Parallel()

	staticDir := createTempStaticDir(t, map[string]string{
		"docs/index.html": "<html><body>Docs</body></html>",
	})
	defer os.RemoveAll(staticDir)

	cfg := testConfig([]Domain{
		{Name: "example.com", Type: "static", Root: staticDir},
	})
	_, handler := newTestRouter(cfg)

	// Accessing /docs should serve /docs/index.html
	req := newRequest("GET", "/docs", "example.com")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200 OK for /docs (directory serving index.html), got %d", rec.Code)
	}
	if rec.Body.String() != "<html><body>Docs</body></html>" {
		t.Errorf("expected docs index content, got %q", rec.Body.String())
	}
}

// ── Additional: TestProxyHeaderForwarding ───────────────────────────

func TestProxyHeaderForwarding(t *testing.T) {
	t.Parallel()

	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Received-Path", r.URL.Path)
		w.Header().Set("X-Received-Host", r.Host)
		w.Header().Set("X-Forwarded-Proto", r.Header.Get("X-Forwarded-Proto"))
		w.Header().Set("X-Real-IP", r.Header.Get("X-Real-IP"))
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	cfg := testConfig([]Domain{
		{Name: "proxy.example.com", Type: "proxy", Target: backend.URL},
	})
	_, handler := newTestRouter(cfg)

	req := newRequest("GET", "/api/v1/flags?key=test", "proxy.example.com")
	req.Header.Set("X-Forwarded-For", "203.0.113.1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rec.Code)
	}

	// Verify the backend received the correct forwarded headers
	if rec.Header().Get("X-Forwarded-Proto") != "https" {
		t.Errorf("expected X-Forwarded-Proto 'https', got %q", rec.Header().Get("X-Forwarded-Proto"))
	}
}

// ── Additional: TestUnknownDomain ───────────────────────────────────

func TestUnknownDomain(t *testing.T) {
	t.Parallel()

	cfg := testConfig([]Domain{
		{Name: "example.com", Type: "static", Root: "/tmp"},
	})
	_, handler := newTestRouter(cfg)

	req := newRequest("GET", "/", "unknown.example.com")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unknown domain, got %d", rec.Code)
	}
}

// ── Additional: TestOpsEndpointsUnaffectedByAuth ────────────────────

func TestOpsEndpointsUnaffectedByAuth(t *testing.T) {
	// Note: t.Setenv cannot be used with t.Parallel

	t.Setenv("OPS_AUTH_TOKEN", "secret-token")

	cfg := testConfig([]Domain{
		{Name: "ops.example.com", Type: "static", Root: "/tmp", Auth: "ops"},
	})
	_, handler := newTestRouter(cfg)

	// Health and metrics should be accessible without auth even when
	// accessed via an ops domain
	paths := []string{"/ops/health", "/ops/metrics"}
	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			req := newRequest("GET", path, "ops.example.com")
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)

			// Should NOT be 401 — ops endpoints bypass auth
			if rec.Code == http.StatusUnauthorized {
				t.Errorf("%s should not require auth, got 401", path)
			}
		})
	}
}
