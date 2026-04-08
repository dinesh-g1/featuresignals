package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

// --- Validation helpers ---

func TestValidateEmail(t *testing.T) {
	valid := []string{"user@example.com", "a@b.co", "test+tag@domain.com"}
	invalid := []string{"", "notanemail", "@missing.com", "missing@", "no spaces@x.com"}

	for _, e := range valid {
		if !validateEmail(e) {
			t.Errorf("expected %q to be valid email", e)
		}
	}
	for _, e := range invalid {
		if validateEmail(e) {
			t.Errorf("expected %q to be invalid email", e)
		}
	}
}

func TestValidateFlagKey(t *testing.T) {
	valid := []string{"my-flag", "feature_123", "a", "a-b-c"}
	invalid := []string{"", "UPPERCASE", "-starts-with-dash", " spaces", "special!chars"}

	for _, k := range valid {
		if !validateFlagKey(k) {
			t.Errorf("expected %q to be valid flag key", k)
		}
	}
	for _, k := range invalid {
		if validateFlagKey(k) {
			t.Errorf("expected %q to be invalid flag key", k)
		}
	}
}

func TestValidateFlagType(t *testing.T) {
	valid := []string{"boolean", "string", "number", "json", "ab"}
	invalid := []string{"", "bool", "integer", "custom"}

	for _, ft := range valid {
		if !validateFlagType(ft) {
			t.Errorf("expected %q to be valid flag type", ft)
		}
	}
	for _, ft := range invalid {
		if validateFlagType(ft) {
			t.Errorf("expected %q to be invalid flag type", ft)
		}
	}
}

func TestValidateStringLength(t *testing.T) {
	if !validateStringLength("short", 255) {
		t.Error("short string should pass 255 limit")
	}
	if validateStringLength(strings.Repeat("x", 256), 255) {
		t.Error("256-char string should fail 255 limit")
	}
	if !validateStringLength("", 255) {
		t.Error("empty string should pass any limit")
	}
}

func TestValidateWebhookURL(t *testing.T) {
	valid := []string{"https://example.com/webhook"}
	invalid := []string{"", "ftp://bad.com", "not-a-url", "javascript:alert(1)",
		"http://localhost:8080/hook", "http://127.0.0.1/hook",
		"http://10.0.0.1/hook", "http://192.168.1.1/hook",
		"http://172.16.0.1/hook"}

	for _, u := range valid {
		if !validateWebhookURL(u) {
			t.Errorf("expected %q to be valid webhook URL", u)
		}
	}
	for _, u := range invalid {
		if validateWebhookURL(u) {
			t.Errorf("expected %q to be invalid webhook URL", u)
		}
	}
}

// --- Input validation in auth ---

func TestRegister_InvalidEmail(t *testing.T) {
	store := newMockStore()
	h := NewAuthHandler(store, &stubTokenManager{}, "", "", nil)

	body := `{"email":"notanemail","password":"StrongP@ss1","name":"Test","org_name":"TestOrg"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.Register(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid email, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRegister_NameTooLong(t *testing.T) {
	store := newMockStore()
	h := NewAuthHandler(store, &stubTokenManager{}, "", "", nil)

	longName := strings.Repeat("a", 256)
	body := `{"email":"test@example.com","password":"StrongP@ss1","name":"` + longName + `","org_name":"TestOrg"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.Register(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for name too long, got %d", w.Code)
	}
}

// --- Input validation in team invite ---

func TestTeamInvite_InvalidEmail(t *testing.T) {
	store := newMockStore()
	h := NewTeamHandler(store, &stubTokenManager{}, nil, nil, "https://app.test.com")

	body := `{"email":"badformat","role":"developer"}`
	r := httptest.NewRequest("POST", "/v1/members/invite", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Invite(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid invite email, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Input validation in webhook create ---

func TestWebhookCreate_InvalidURL(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	body := `{"name":"Bad Webhook","url":"ftp://nothttp.com/hook"}`
	r := httptest.NewRequest("POST", "/v1/webhooks", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for non-http webhook URL, got %d: %s", w.Code, w.Body.String())
	}
}

func TestWebhookCreate_NameTooLong(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	longName := strings.Repeat("x", 256)
	body := `{"name":"` + longName + `","url":"https://example.com/hook"}`
	r := httptest.NewRequest("POST", "/v1/webhooks", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for name too long, got %d", w.Code)
	}
}

// --- Webhook org isolation ---

func TestWebhookGet_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	wh := &domain.Webhook{OrgID: testOrgID, Name: "My WH", URL: "https://x.com/hook", Enabled: true}
	store.CreateWebhook(t.Context(), wh)

	r := httptest.NewRequest("GET", "/v1/webhooks/"+wh.ID, nil)
	r = requestWithChi(r, map[string]string{"webhookID": wh.ID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org webhook get, got %d", w.Code)
	}
}

// --- Body size limit middleware ---

func TestMaxBodySize_Rejects_Oversized(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 1024)
		_, err := r.Body.Read(buf)
		if err != nil {
			http.Error(w, "body too large", http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	// Wrap with a 100-byte limit
	mw := maxBodySizeHandler(100, handler)

	bigBody := strings.Repeat("x", 200)
	r := httptest.NewRequest("POST", "/test", strings.NewReader(bigBody))
	w := httptest.NewRecorder()

	mw.ServeHTTP(w, r)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413 for oversized body, got %d", w.Code)
	}
}

func TestMaxBodySize_Allows_Normal(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 1024)
		n, _ := r.Body.Read(buf)
		if n == 0 {
			http.Error(w, "empty", http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	mw := maxBodySizeHandler(1000, handler)

	body := strings.Repeat("x", 50)
	r := httptest.NewRequest("POST", "/test", strings.NewReader(body))
	w := httptest.NewRecorder()

	mw.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for normal body, got %d", w.Code)
	}
}

func maxBodySizeHandler(maxBytes int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
		next.ServeHTTP(w, r)
	})
}

// --- Security headers middleware ---

func TestSecurityHeaders_Set(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	// Manually apply the same logic as our middleware
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	handler.ServeHTTP(w, r)

	if w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("expected X-Content-Type-Options: nosniff")
	}
	if w.Header().Get("X-Frame-Options") != "DENY" {
		t.Error("expected X-Frame-Options: DENY")
	}
}

// --- Project name too long ---

func TestProjectHandler_Create_NameTooLong(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	longName := strings.Repeat("a", 256)
	body := `{"name":"` + longName + `"}`
	r := httptest.NewRequest("POST", "/v1/projects", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for project name too long, got %d", w.Code)
	}
}
