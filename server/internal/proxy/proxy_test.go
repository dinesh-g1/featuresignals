package proxy

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/api/middleware"
)

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestRegionRouter_LocalRegion_PassesThrough(t *testing.T) {
	t.Parallel()

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	mw := RegionRouter("in", map[string]string{"us": "http://us.example.com"}, discardLogger())
	handler := mw(next)

	ctx := context.WithValue(context.Background(), middleware.DataRegionKey, "in")
	req := httptest.NewRequest(http.MethodGet, "/v1/flags", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called for local region")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestRegionRouter_EmptyRegion_PassesThrough(t *testing.T) {
	t.Parallel()

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	mw := RegionRouter("in", map[string]string{"us": "http://us.example.com"}, discardLogger())
	handler := mw(next)

	req := httptest.NewRequest(http.MethodGet, "/v1/flags", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler to be called for empty region")
	}
}

func TestRegionRouter_RemoteRegion_Proxies(t *testing.T) {
	t.Parallel()

	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Region", "us")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"proxied":true}`))
	}))
	defer remote.Close()

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
	})

	mw := RegionRouter("in", map[string]string{"us": remote.URL}, discardLogger())
	handler := mw(next)

	ctx := context.WithValue(context.Background(), middleware.DataRegionKey, "us")
	req := httptest.NewRequest(http.MethodGet, "/v1/flags", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if nextCalled {
		t.Fatal("next handler should NOT be called when proxying to remote region")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("X-Region") != "us" {
		t.Fatalf("expected X-Region=us header from proxied response")
	}
}

func TestRegionRouter_UnknownRegion_PassesThrough(t *testing.T) {
	t.Parallel()

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	mw := RegionRouter("in", map[string]string{"us": "http://us.example.com"}, discardLogger())
	handler := mw(next)

	ctx := context.WithValue(context.Background(), middleware.DataRegionKey, "au")
	req := httptest.NewRequest(http.MethodGet, "/v1/flags", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected next handler for unknown region")
	}
}

func TestMultiRegionLogin_LocalSuccess(t *testing.T) {
	t.Parallel()

	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"token":"local"}`))
	})

	handler := MultiRegionLogin(local, "in", map[string]string{
		"in": "http://in.example.com",
		"us": "http://us.example.com",
	}, discardLogger())

	body := strings.NewReader(`{"email":"a@b.com","password":"pass"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "local") {
		t.Fatalf("expected local token, got %s", rec.Body.String())
	}
}

func TestMultiRegionLogin_LocalFail_ProxiesToRemote(t *testing.T) {
	t.Parallel()

	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"invalid credentials"}`))
	})

	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(b), "a@b.com") {
			t.Error("remote did not receive request body")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"token":"remote-us"}`))
	}))
	defer remote.Close()

	handler := MultiRegionLogin(local, "in", map[string]string{
		"in": "http://in.example.com",
		"us": remote.URL,
	}, discardLogger())

	body := strings.NewReader(`{"email":"a@b.com","password":"pass"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 from remote, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "remote-us") {
		t.Fatalf("expected remote-us token, got %s", rec.Body.String())
	}
}

func TestMultiRegionLogin_LocalNonAuthError_ReturnsLocal(t *testing.T) {
	t.Parallel()

	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"bad json"}`))
	})

	remoteCalled := false
	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		remoteCalled = true
	}))
	defer remote.Close()

	handler := MultiRegionLogin(local, "in", map[string]string{
		"us": remote.URL,
	}, discardLogger())

	body := strings.NewReader(`{bad`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", body)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if remoteCalled {
		t.Fatal("remote should NOT be called for non-auth errors")
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestCompleteSignupProxy_NoHeader_Local(t *testing.T) {
	t.Parallel()

	localCalled := false
	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		localCalled = true
		w.WriteHeader(http.StatusCreated)
	})

	handler := CompleteSignupProxy(local, "in", map[string]string{
		"us": "http://us.example.com",
	}, discardLogger())

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/complete-signup", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !localCalled {
		t.Fatal("expected local handler to be called when no X-Target-Region header")
	}
}

func TestCompleteSignupProxy_LocalRegion_Local(t *testing.T) {
	t.Parallel()

	localCalled := false
	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		localCalled = true
		w.WriteHeader(http.StatusCreated)
	})

	handler := CompleteSignupProxy(local, "in", map[string]string{
		"us": "http://us.example.com",
	}, discardLogger())

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/complete-signup", nil)
	req.Header.Set("X-Target-Region", "in")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !localCalled {
		t.Fatal("expected local handler for X-Target-Region=in (local region)")
	}
}

func TestCompleteSignupProxy_RemoteRegion_Proxies(t *testing.T) {
	t.Parallel()

	remote := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Region", "us")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"created":"us"}`))
	}))
	defer remote.Close()

	localCalled := false
	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		localCalled = true
	})

	handler := CompleteSignupProxy(local, "in", map[string]string{
		"us": remote.URL,
	}, discardLogger())

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/complete-signup", nil)
	req.Header.Set("X-Target-Region", "us")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if localCalled {
		t.Fatal("local handler should NOT be called when proxying to remote")
	}
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
}

func TestStripPrefix(t *testing.T) {
	t.Parallel()

	var gotPath string
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	})

	handler := StripPrefix("/api", inner)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/flags", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if gotPath != "/v1/flags" {
		t.Fatalf("expected /v1/flags, got %s", gotPath)
	}
}
