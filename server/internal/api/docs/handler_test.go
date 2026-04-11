package docs_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/api/docs"
)

func TestDocsHandler_OpenAPISpec(t *testing.T) {
	h := docs.NewDocsHandler()
	req := httptest.NewRequest(http.MethodGet, "/docs/openapi.json", nil)
	w := httptest.NewRecorder()

	h.OpenAPISpec(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	ct := resp.Header.Get("Content-Type")
	if ct != "application/json" {
		t.Fatalf("expected Content-Type application/json, got %s", ct)
	}

	cache := resp.Header.Get("Cache-Control")
	if cache != "public, max-age=3600" {
		t.Fatalf("expected Cache-Control 'public, max-age=3600', got %q", cache)
	}

	var spec map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&spec); err != nil {
		t.Fatalf("failed to decode spec as JSON: %v", err)
	}

	if v, ok := spec["openapi"]; !ok || v != "3.0.3" {
		t.Fatalf("expected openapi 3.0.3, got %v", v)
	}
	if info, ok := spec["info"].(map[string]interface{}); !ok || info["title"] != "FeatureSignals API" {
		t.Fatal("expected info.title to be 'FeatureSignals API'")
	}
	if paths, ok := spec["paths"].(map[string]interface{}); !ok || len(paths) == 0 {
		t.Fatal("expected paths to be non-empty")
	}
	if comps, ok := spec["components"].(map[string]interface{}); !ok {
		t.Fatal("expected components section")
	} else {
		if schemas, ok := comps["schemas"].(map[string]interface{}); !ok || len(schemas) == 0 {
			t.Fatal("expected schemas to be non-empty")
		}
		if sec, ok := comps["securitySchemes"].(map[string]interface{}); !ok {
			t.Fatal("expected securitySchemes")
		} else {
			if _, ok := sec["BearerAuth"]; !ok {
				t.Fatal("expected BearerAuth security scheme")
			}
			if _, ok := sec["ApiKeyAuth"]; !ok {
				t.Fatal("expected ApiKeyAuth security scheme")
			}
		}
	}

	// Verify a few key paths exist
	paths := spec["paths"].(map[string]interface{})
	requiredPaths := []string{
		"/v1/auth/login",
		"/v1/projects",
		"/v1/projects/{projectID}/flags",
		"/v1/evaluate",
		"/v1/evaluate/bulk",
		"/v1/stream/{envKey}",
		"/v1/client/{envKey}/flags",
		"/v1/audit",
		"/v1/webhooks",
		"/v1/members",
	}
	for _, p := range requiredPaths {
		if _, ok := paths[p]; !ok {
			t.Errorf("expected path %q in spec", p)
		}
	}

	// Verify required schemas
	schemas := spec["components"].(map[string]interface{})["schemas"].(map[string]interface{})
	requiredSchemas := []string{
		"ErrorResponse",
		"PaginatedResponse",
		"LoginRequest",
		"LoginResponse",
		"FlagResponse",
		"CreateFlagRequest",
		"ProjectResponse",
		"EnvironmentResponse",
		"SegmentResponse",
		"WebhookResponse",
		"ApprovalResponse",
		"MemberResponse",
		"EvalResult",
		"EvalContext",
		"MFAEnableResponse",
		"SSOConfigResponse",
	}
	for _, s := range requiredSchemas {
		if _, ok := schemas[s]; !ok {
			t.Errorf("expected schema %q in spec", s)
		}
	}

	// Verify tags
	tags, ok := spec["tags"].([]interface{})
	if !ok || len(tags) == 0 {
		t.Fatal("expected tags to be non-empty")
	}
	tagNames := make(map[string]bool)
	for _, t := range tags {
		if m, ok := t.(map[string]interface{}); ok {
			if name, ok := m["name"].(string); ok {
				tagNames[name] = true
			}
		}
	}
	requiredTags := []string{"Auth", "Flags", "Evaluation", "Projects", "Environments", "Segments", "Team", "Webhooks", "Audit", "Billing", "SSO", "SCIM", "MFA"}
	for _, tag := range requiredTags {
		if !tagNames[tag] {
			t.Errorf("expected tag %q in spec", tag)
		}
	}
}

func TestDocsHandler_Index(t *testing.T) {
	h := docs.NewDocsHandler()
	req := httptest.NewRequest(http.MethodGet, "/docs", nil)
	w := httptest.NewRecorder()

	h.Index(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	ct := resp.Header.Get("Content-Type")
	if ct != "application/json" {
		t.Fatalf("expected Content-Type application/json, got %s", ct)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["docs"] != "/docs/openapi.json" {
		t.Errorf("expected docs to be '/docs/openapi.json', got %v", body["docs"])
	}
	if body["service"] != "FeatureSignals API" {
		t.Errorf("expected service to be 'FeatureSignals API', got %v", body["service"])
	}
}

func TestRouteMeta_Completeness(t *testing.T) {
	// Verify every route in the registry has required fields.
	for _, m := range docs.AllRouteMeta {
		if m.Method == "" {
			t.Errorf("route %q has empty method", m.Path)
		}
		if m.Path == "" {
			t.Errorf("route %q has empty path", m.Path)
		}
		if m.Tag == "" {
			t.Errorf("route %q has empty tag", m.Path)
		}
		if m.Summary == "" {
			t.Errorf("route %q has empty summary", m.Path)
		}
		if m.Description == "" {
			t.Errorf("route %q has empty description", m.Path)
		}
		if m.Status == 0 {
			t.Errorf("route %q has no status code", m.Path)
		}
	}
}

func TestRouteMeta_NoDuplicates(t *testing.T) {
	seen := make(map[string]bool)
	for _, m := range docs.AllRouteMeta {
		key := m.Method + " " + m.Path
		if seen[key] {
			t.Errorf("duplicate route: %s", key)
		}
		seen[key] = true
	}
}
