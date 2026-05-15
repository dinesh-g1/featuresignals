package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAPIVersion_ValidVersion(t *testing.T) {
	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"ok":true}`))
		}),
	)

	req := httptest.NewRequest("GET", "/v1/flags", nil)
	req.Header.Set("Accept-Version", "v1")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if v := rr.Header().Get("API-Version"); v != "v1" {
		t.Errorf("expected API-Version: v1, got %q", v)
	}
}

func TestAPIVersion_NoHeader(t *testing.T) {
	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("GET", "/v1/flags", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 (defaults to latest), got %d", rr.Code)
	}
	if v := rr.Header().Get("API-Version"); v != "v1" {
		t.Errorf("expected API-Version: v1 (default), got %q", v)
	}
}

func TestAPIVersion_UnsupportedVersion(t *testing.T) {
	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("handler should not be called for unsupported version")
		}),
	)

	req := httptest.NewRequest("GET", "/v1/flags", nil)
	req.Header.Set("Accept-Version", "v99")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotAcceptable {
		t.Errorf("expected 406, got %d", rr.Code)
	}

	link := rr.Header().Get("Link")
	if link == "" {
		t.Error("expected Link header for unsupported version")
	}
}

func TestAPIVersion_DeprecatedVersion(t *testing.T) {
	// Temporarily register a deprecated version for this test.
	origDeprecated := DeprecatedAPIVersions
	DeprecatedAPIVersions = map[string]string{
		"v0": "Sat, 01 Jan 2030 00:00:00 GMT",
	}
	defer func() { DeprecatedAPIVersions = origDeprecated }()

	// Also add v0 to supported list temporarily so it doesn't 406.
	origSupported := SupportedAPIVersions
	SupportedAPIVersions = append([]string{"v1", "v0"}, SupportedAPIVersions...)
	defer func() { SupportedAPIVersions = origSupported }()

	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("GET", "/v1/flags", nil)
	req.Header.Set("Accept-Version", "v0")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("deprecated version should still pass, expected 200 got %d", rr.Code)
	}
	if rr.Header().Get("Deprecation") != "true" {
		t.Error("expected Deprecation: true header")
	}
	if rr.Header().Get("Sunset") != "Sat, 01 Jan 2030 00:00:00 GMT" {
		t.Error("expected Sunset header with deprecation date")
	}
	if rr.Header().Get("Link") == "" {
		t.Error("expected Link header pointing to latest version")
	}
}

func TestAPIVersion_XAPIVersionHeader(t *testing.T) {
	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("GET", "/v1/flags", nil)
	req.Header.Set("X-API-Version", "v1")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 via X-API-Version header, got %d", rr.Code)
	}
	if v := rr.Header().Get("API-Version"); v != "v1" {
		t.Errorf("expected API-Version: v1, got %q", v)
	}
}

func TestAPIVersion_AcceptVersionTakesPrecedence(t *testing.T) {
	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("GET", "/v1/flags", nil)
	req.Header.Set("Accept-Version", "v1")
	req.Header.Set("X-API-Version", "v99")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Accept-Version takes precedence over X-API-Version.
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 (Accept-Version takes precedence), got %d", rr.Code)
	}
}

func TestAPIVersion_CaseInsensitive(t *testing.T) {
	handler := APIVersion(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for _, v := range []string{"V1", "v1", "V1"} {
		req := httptest.NewRequest("GET", "/v1/flags", nil)
		req.Header.Set("Accept-Version", v)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("version %q: expected 200, got %d", v, rr.Code)
		}
	}
}
