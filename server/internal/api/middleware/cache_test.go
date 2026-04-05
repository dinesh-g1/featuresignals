package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCacheControl(t *testing.T) {
	tests := []struct {
		name  string
		value string
	}{
		{"no-store", "no-store"},
		{"public", "public, max-age=3600"},
		{"private", "private, no-cache"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := CacheControl(tt.value)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			r := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)

			got := w.Header().Get("Cache-Control")
			if got != tt.value {
				t.Errorf("expected Cache-Control %q, got %q", tt.value, got)
			}
		})
	}
}
