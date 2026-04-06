package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeaders_AllPresent(t *testing.T) {
	handler := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	expected := map[string]string{
		"X-Content-Type-Options":         "nosniff",
		"X-Frame-Options":                "DENY",
		"Cross-Origin-Opener-Policy":     "same-origin",
		"Cross-Origin-Resource-Policy":   "same-origin",
		"Cross-Origin-Embedder-Policy":   "require-corp",
		"Referrer-Policy":                "strict-origin-when-cross-origin",
		"Permissions-Policy":             "camera=(), microphone=(), geolocation=()",
		"Content-Security-Policy":        "default-src 'none'; frame-ancestors 'none'",
	}

	for header, value := range expected {
		got := w.Header().Get(header)
		if got != value {
			t.Errorf("expected %s=%q, got %q", header, value, got)
		}
	}
}

func TestSecurityHeaders_HSTS_WithHTTPS(t *testing.T) {
	handler := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Forwarded-Proto", "https")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	hsts := w.Header().Get("Strict-Transport-Security")
	if hsts == "" {
		t.Error("expected HSTS header for HTTPS request")
	}
	if hsts != "max-age=63072000; includeSubDomains; preload" {
		t.Errorf("unexpected HSTS value: %s", hsts)
	}
}

func TestSecurityHeaders_NoHSTS_WithHTTP(t *testing.T) {
	handler := SecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	hsts := w.Header().Get("Strict-Transport-Security")
	if hsts != "" {
		t.Error("HSTS should not be set for plain HTTP")
	}
}
