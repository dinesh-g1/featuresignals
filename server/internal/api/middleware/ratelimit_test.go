package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func testContext(t *testing.T) context.Context {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	return ctx
}

func TestRateLimit_AllowsUnderLimit(t *testing.T) {
	handler := RateLimit(testContext(t), 100)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 100; i++ {
		r := httptest.NewRequest("GET", "/test", nil)
		r.RemoteAddr = "192.168.1.1:1234"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, r)

		if w.Code != http.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i, w.Code)
		}
	}
}

func TestRateLimit_BlocksOverLimit(t *testing.T) {
	handler := RateLimit(testContext(t), 5)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 10; i++ {
		r := httptest.NewRequest("GET", "/test", nil)
		r.RemoteAddr = "10.0.0.1:1234"
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, r)

		if i < 5 && w.Code != http.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i, w.Code)
		}
		if i >= 5 && w.Code != http.StatusTooManyRequests {
			t.Errorf("request %d: expected 429, got %d", i, w.Code)
		}
	}
}

func TestRateLimit_DifferentClientsIndependent(t *testing.T) {
	handler := RateLimit(testContext(t), 2)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Client A: 3 requests (3rd should be blocked)
	for i := 0; i < 3; i++ {
		r := httptest.NewRequest("GET", "/test", nil)
		r.RemoteAddr = "1.1.1.1:1234"
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)

		if i < 2 && w.Code != http.StatusOK {
			t.Errorf("client A request %d: expected 200, got %d", i, w.Code)
		}
		if i >= 2 && w.Code != http.StatusTooManyRequests {
			t.Errorf("client A request %d: expected 429, got %d", i, w.Code)
		}
	}

	// Client B: should still be allowed
	r := httptest.NewRequest("GET", "/test", nil)
	r.RemoteAddr = "2.2.2.2:1234"
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("client B: expected 200, got %d", w.Code)
	}
}

func TestRateLimit_APIKeyBasedLimiting(t *testing.T) {
	handler := RateLimit(testContext(t), 2)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 3; i++ {
		r := httptest.NewRequest("GET", "/test", nil)
		r.Header.Set("X-API-Key", "fs_srv_abc123def456")
		r.RemoteAddr = "different.ip.each.time:" + string(rune('0'+i))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)

		if i < 2 && w.Code != http.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i, w.Code)
		}
		if i >= 2 && w.Code != http.StatusTooManyRequests {
			t.Errorf("request %d: expected 429, got %d", i, w.Code)
		}
	}
}
