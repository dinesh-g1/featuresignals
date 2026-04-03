package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequireJSON_PostWithJSON(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("POST", "/", strings.NewReader(`{}`))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestRequireJSON_PostWithJSONCharset(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("POST", "/", strings.NewReader(`{}`))
	r.Header.Set("Content-Type", "application/json; charset=utf-8")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestRequireJSON_PostWithoutContentType(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("POST", "/", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Errorf("expected 415, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["error"] == "" {
		t.Error("expected error message")
	}
}

func TestRequireJSON_PostWithTextPlain(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("POST", "/", strings.NewReader(`{}`))
	r.Header.Set("Content-Type", "text/plain")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Errorf("expected 415, got %d", w.Code)
	}
}

func TestRequireJSON_PutWithoutJSON(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("PUT", "/", strings.NewReader(`{}`))
	r.Header.Set("Content-Type", "text/xml")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Errorf("expected 415 for PUT, got %d", w.Code)
	}
}

func TestRequireJSON_PatchWithoutJSON(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("PATCH", "/", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Errorf("expected 415 for PATCH, got %d", w.Code)
	}
}

func TestRequireJSON_GetPassesThrough(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for GET, got %d", w.Code)
	}
}

func TestRequireJSON_DeletePassesThrough(t *testing.T) {
	handler := RequireJSON(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("DELETE", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for DELETE, got %d", w.Code)
	}
}
