package featuresignals

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	of "github.com/open-feature/go-sdk/openfeature"
)

func newTestProviderClient(t *testing.T, flags map[string]interface{}) (*Client, func()) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(flags)
	}))
	client := NewClient("test-key", "test",
		WithBaseURL(srv.URL),
		WithPollingInterval(1<<62), // effectively infinite — no background polls during test
	)
	<-client.Ready()
	return client, func() {
		client.Close()
		srv.Close()
	}
}

func TestProvider_Metadata(t *testing.T) {
	client, cleanup := newTestProviderClient(t, map[string]interface{}{})
	defer cleanup()
	p := NewProvider(client)
	if p.Metadata().Name != "FeatureSignals" {
		t.Errorf("expected name FeatureSignals, got %s", p.Metadata().Name)
	}
}

func TestProvider_Hooks(t *testing.T) {
	client, cleanup := newTestProviderClient(t, map[string]interface{}{})
	defer cleanup()
	p := NewProvider(client)
	if h := p.Hooks(); h != nil {
		t.Errorf("expected nil hooks, got %v", h)
	}
}

func TestProvider_BooleanEvaluation(t *testing.T) {
	client, cleanup := newTestProviderClient(t, map[string]interface{}{
		"dark-mode": true,
		"banner":    "hello",
	})
	defer cleanup()
	p := NewProvider(client)
	ctx := context.Background()

	t.Run("returns true for existing bool flag", func(t *testing.T) {
		res := p.BooleanEvaluation(ctx, "dark-mode", false, nil)
		if res.Value != true {
			t.Errorf("expected true, got %v", res.Value)
		}
		if res.Reason != of.CachedReason {
			t.Errorf("expected CACHED reason, got %s", res.Reason)
		}
	})

	t.Run("returns default for missing flag", func(t *testing.T) {
		res := p.BooleanEvaluation(ctx, "nonexistent", false, nil)
		if res.Value != false {
			t.Errorf("expected false, got %v", res.Value)
		}
		if res.Reason != of.ErrorReason {
			t.Errorf("expected ERROR reason, got %s", res.Reason)
		}
	})

	t.Run("returns default for type mismatch", func(t *testing.T) {
		res := p.BooleanEvaluation(ctx, "banner", true, nil)
		if res.Value != true {
			t.Errorf("expected true (default), got %v", res.Value)
		}
		if res.Reason != of.ErrorReason {
			t.Errorf("expected ERROR reason, got %s", res.Reason)
		}
	})
}

func TestProvider_StringEvaluation(t *testing.T) {
	client, cleanup := newTestProviderClient(t, map[string]interface{}{
		"banner":    "hello",
		"dark-mode": true,
	})
	defer cleanup()
	p := NewProvider(client)
	ctx := context.Background()

	t.Run("returns value for existing string flag", func(t *testing.T) {
		res := p.StringEvaluation(ctx, "banner", "default", nil)
		if res.Value != "hello" {
			t.Errorf("expected hello, got %s", res.Value)
		}
	})

	t.Run("returns default for missing flag", func(t *testing.T) {
		res := p.StringEvaluation(ctx, "missing", "fallback", nil)
		if res.Value != "fallback" {
			t.Errorf("expected fallback, got %s", res.Value)
		}
	})

	t.Run("returns default for type mismatch", func(t *testing.T) {
		res := p.StringEvaluation(ctx, "dark-mode", "fallback", nil)
		if res.Value != "fallback" {
			t.Errorf("expected fallback, got %s", res.Value)
		}
	})
}

func TestProvider_FloatEvaluation(t *testing.T) {
	client, cleanup := newTestProviderClient(t, map[string]interface{}{
		"max-items": float64(42),
		"dark-mode": true,
	})
	defer cleanup()
	p := NewProvider(client)
	ctx := context.Background()

	t.Run("returns value for existing numeric flag", func(t *testing.T) {
		res := p.FloatEvaluation(ctx, "max-items", 0, nil)
		if res.Value != 42 {
			t.Errorf("expected 42, got %f", res.Value)
		}
	})

	t.Run("returns default for missing flag", func(t *testing.T) {
		res := p.FloatEvaluation(ctx, "missing", 99.5, nil)
		if res.Value != 99.5 {
			t.Errorf("expected 99.5, got %f", res.Value)
		}
	})

	t.Run("returns default for type mismatch", func(t *testing.T) {
		res := p.FloatEvaluation(ctx, "dark-mode", 1.0, nil)
		if res.Value != 1.0 {
			t.Errorf("expected 1.0, got %f", res.Value)
		}
	})
}

func TestProvider_IntEvaluation(t *testing.T) {
	client, cleanup := newTestProviderClient(t, map[string]interface{}{
		"max-items": float64(42),
	})
	defer cleanup()
	p := NewProvider(client)
	ctx := context.Background()

	t.Run("converts float64 to int64", func(t *testing.T) {
		res := p.IntEvaluation(ctx, "max-items", 0, nil)
		if res.Value != 42 {
			t.Errorf("expected 42, got %d", res.Value)
		}
	})

	t.Run("returns default for missing flag", func(t *testing.T) {
		res := p.IntEvaluation(ctx, "missing", 10, nil)
		if res.Value != 10 {
			t.Errorf("expected 10, got %d", res.Value)
		}
	})
}

func TestProvider_ObjectEvaluation(t *testing.T) {
	config := map[string]interface{}{"nested": true}
	client, cleanup := newTestProviderClient(t, map[string]interface{}{
		"config": config,
	})
	defer cleanup()
	p := NewProvider(client)
	ctx := context.Background()

	t.Run("returns value for existing object flag", func(t *testing.T) {
		res := p.ObjectEvaluation(ctx, "config", nil, nil)
		m, ok := res.Value.(map[string]interface{})
		if !ok {
			t.Fatalf("expected map, got %T", res.Value)
		}
		if m["nested"] != true {
			t.Errorf("expected nested=true, got %v", m["nested"])
		}
	})

	t.Run("returns default for missing flag", func(t *testing.T) {
		fallback := map[string]interface{}{"x": float64(1)}
		res := p.ObjectEvaluation(ctx, "missing", fallback, nil)
		m, ok := res.Value.(map[string]interface{})
		if !ok {
			t.Fatalf("expected map, got %T", res.Value)
		}
		if m["x"] != float64(1) {
			t.Errorf("expected x=1 in fallback, got %v", m["x"])
		}
	})
}

func TestProvider_ImplementsInterface(t *testing.T) {
	var _ of.FeatureProvider = (*Provider)(nil)
}
