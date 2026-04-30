package api

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/integrations"
	"github.com/featuresignals/server/internal/integrations/launchdarkly"
)

func init() {
	// Register test providers
	integrations.Register("launchdarkly", launchdarkly.NewImporter)
}

// mockSessionStore implements domain.SessionStore for tests.
type mockSessionStore struct {
	sessions map[string]*domain.PublicSession
}

func newMockSessionStore() *mockSessionStore {
	return &mockSessionStore{
		sessions: make(map[string]*domain.PublicSession),
	}
}

func (m *mockSessionStore) CreateSession(_ context.Context, session *domain.PublicSession) error {
	m.sessions[session.SessionToken] = session
	return nil
}

func (m *mockSessionStore) GetSession(_ context.Context, token string) (*domain.PublicSession, error) {
	sess, ok := m.sessions[token]
	if !ok {
		return nil, domain.WrapNotFound("public session")
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil, domain.WrapExpired("public session")
	}
	return sess, nil
}

func (m *mockSessionStore) DeleteSession(_ context.Context, token string) error {
	delete(m.sessions, token)
	return nil
}

func (m *mockSessionStore) CleanExpiredSessions(_ context.Context) (int, error) {
	count := 0
	for token, sess := range m.sessions {
		if time.Now().After(sess.ExpiresAt) {
			delete(m.sessions, token)
			count++
		}
	}
	return count, nil
}

func setupPublicHandler(t *testing.T) (*PublicHandler, *mockSessionStore) {
	t.Helper()
	store := newMockSessionStore()
	jwtMgr := auth.NewJWTManager("test-secret-for-public-handlers", 1*time.Hour, 24*time.Hour)
	logger := slog.New(slog.NewJSONHandler(bytes.NewBuffer(nil), &slog.HandlerOptions{Level: slog.LevelError}))
	return NewPublicHandler(store, jwtMgr, logger), store
}

func executeRequest(h http.HandlerFunc, method, fullPath string, body interface{}) *httptest.ResponseRecorder {
	var bodyBytes []byte
	if body != nil {
		bodyBytes, _ = json.Marshal(body)
	}

	// Split path and query string
	pathOnly := fullPath
	var queryStr string
	if idx := strings.Index(fullPath, "?"); idx != -1 {
		pathOnly = fullPath[:idx]
		queryStr = fullPath[idx+1:]
	}

	// Build target URL with proper escaping
	target := pathOnly
	if queryStr != "" {
		parsed, err := url.ParseQuery(queryStr)
		if err == nil {
			target = pathOnly + "?" + parsed.Encode()
		} else {
			target = fullPath
		}
	}

	req := httptest.NewRequest(method, target, bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	// Inject chi URL params for /v1/public/evaluate/:flagKey routes
	rctx := chi.NewRouteContext()
	parts := strings.Split(strings.TrimPrefix(pathOnly, "/v1/public/evaluate/"), "/")
	if len(parts) == 1 && parts[0] != "" && strings.HasPrefix(pathOnly, "/v1/public/evaluate/") {
		rctx.URLParams.Add("flagKey", parts[0])
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	}

	rec := httptest.NewRecorder()
	h(rec, req)
	return rec
}

// ─── Calculator Tests ──────────────────────────────────────────────────────

func TestPublicHandler_Calculator_Success(t *testing.T) {
	t.Parallel()
	h, _ := setupPublicHandler(t)

	tests := []struct {
		name               string
		body               CalculatorRequest
		wantStatus         int
		expectCompetitorGT float64 // competitor monthly should be >= this
	}{
		{
			name:               "launchdarkly 50 seats",
			body:               CalculatorRequest{TeamSize: 50, Provider: "launchdarkly"},
			wantStatus:         http.StatusOK,
			expectCompetitorGT: 1000,
		},
		{
			name:               "flagsmith 10 seats",
			body:               CalculatorRequest{TeamSize: 10, Provider: "flagsmith"},
			wantStatus:         http.StatusOK,
			expectCompetitorGT: 150,
		},
		{
			name:               "unleash 5 seats",
			body:               CalculatorRequest{TeamSize: 5, Provider: "unleash"},
			wantStatus:         http.StatusOK,
			expectCompetitorGT: 0,
		},
		{
			name:               "unknown provider defaults to launchdarkly",
			body:               CalculatorRequest{TeamSize: 5, Provider: "unknown-provider"},
			wantStatus:         http.StatusOK,
			expectCompetitorGT: 0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := executeRequest(h.Calculator, http.MethodPost, "/v1/public/calculator", tc.body)
			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tc.wantStatus, rec.Code, rec.Body.String())
				return
			}

			var resp CalculatorResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			if resp.CompetitorMonthly < tc.expectCompetitorGT {
				t.Errorf("expected competitor monthly >= %.0f, got %.0f", tc.expectCompetitorGT, resp.CompetitorMonthly)
			}
			if resp.FSMonthly != 12.0 {
				t.Errorf("expected fs_monthly=12, got %.0f", resp.FSMonthly)
			}
			if resp.SavingsPercent < 0 {
				t.Errorf("savings_percent should be >= 0, got %.1f", resp.SavingsPercent)
			}
		})
	}
}

func TestPublicHandler_Calculator_ValidationErrors(t *testing.T) {
	t.Parallel()
	h, _ := setupPublicHandler(t)

	tests := []struct {
		name       string
		body       CalculatorRequest
		wantStatus int
	}{
		{
			name:       "missing provider",
			body:       CalculatorRequest{TeamSize: 50, Provider: ""},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "zero team size",
			body:       CalculatorRequest{TeamSize: 0, Provider: "launchdarkly"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "negative team size",
			body:       CalculatorRequest{TeamSize: -1, Provider: "launchdarkly"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "team size exceeds max",
			body:       CalculatorRequest{TeamSize: 10001, Provider: "launchdarkly"},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := executeRequest(h.Calculator, http.MethodPost, "/v1/public/calculator", tc.body)
			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}

// ─── Public Evaluate Tests ─────────────────────────────────────────────────

func TestPublicHandler_PublicEvaluate_Success(t *testing.T) {
	t.Parallel()
	h, _ := setupPublicHandler(t)

	tests := []struct {
		name       string
		flagKey    string
		context    string
		wantStatus int
		wantValue  interface{}
	}{
		{
			name:       "dark-mode for enterprise",
			flagKey:    "dark-mode",
			context:    `{"key":"test","attributes":{"plan":"enterprise"}}`,
			wantStatus: http.StatusOK,
			wantValue:  true,
		},
		{
			name:       "dark-mode for free user",
			flagKey:    "dark-mode",
			context:    `{"key":"test","attributes":{"plan":"free"}}`,
			wantStatus: http.StatusOK,
			wantValue:  false,
		},
		{
			name:       "new-checkout for pro",
			flagKey:    "new-checkout",
			context:    `{"key":"test","attributes":{"plan":"pro"}}`,
			wantStatus: http.StatusOK,
			wantValue:  true,
		},
		{
			name:       "new-checkout for free",
			flagKey:    "new-checkout",
			context:    `{"key":"test","attributes":{"plan":"free"}}`,
			wantStatus: http.StatusOK,
			wantValue:  false,
		},
		{
			name:       "max-results for enterprise",
			flagKey:    "max-results",
			context:    `{"key":"test","attributes":{"plan":"enterprise"}}`,
			wantStatus: http.StatusOK,
			wantValue:  float64(50),
		},
		{
			name:       "welcome-message for enterprise",
			flagKey:    "welcome-message",
			context:    `{"key":"test","attributes":{"plan":"enterprise"}}`,
			wantStatus: http.StatusOK,
			wantValue:  "Welcome back, Enterprise customer!",
		},
		{
			name:       "unknown flag",
			flagKey:    "nonexistent",
			context:    `{"key":"test"}`,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "no context defaults to anonymous",
			flagKey:    "dark-mode",
			context:    "",
			wantStatus: http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			path := "/v1/public/evaluate/" + tc.flagKey
			if tc.context != "" {
				path += "?context=" + tc.context
			}

			rec := executeRequest(h.PublicEvaluate, http.MethodGet, path, nil)
			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tc.wantStatus, rec.Code, rec.Body.String())
				return
			}

			if tc.wantStatus == http.StatusOK && tc.wantValue != nil {
				var resp map[string]interface{}
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				gotVal, ok := resp["value"]
				if !ok {
					t.Fatalf("response missing 'value' field: %v", resp)
				}

				if gotVal != tc.wantValue {
					t.Errorf("expected value %v (type %T), got %v (type %T)", tc.wantValue, tc.wantValue, gotVal, gotVal)
				}

				if _, ok := resp["latency_ms"]; !ok {
					t.Error("response missing 'latency_ms' field")
				}
			}
		})
	}
}

func TestPublicHandler_PublicEvaluate_SimplifiedContextFormat(t *testing.T) {
	t.Parallel()
	h, _ := setupPublicHandler(t)

	// Test with the simplified context format: {userId: "test", plan: "enterprise"}
	path := `/v1/public/evaluate/dark-mode?context={userId: "test", plan: "enterprise"}`
	rec := executeRequest(h.PublicEvaluate, http.MethodGet, path, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp["value"] != true {
		t.Errorf("expected value=true (enterprise user matched), got %v", resp["value"])
	}
}

// ─── Migration Save Tests ──────────────────────────────────────────────────

func TestPublicHandler_MigrationSave_Success(t *testing.T) {
	t.Parallel()
	h, store := setupPublicHandler(t)

	tests := []struct {
		name       string
		body       MigrationSaveRequest
		wantStatus int
	}{
		{
			name:       "save launchdarkly migration",
			body:       MigrationSaveRequest{Provider: "launchdarkly", APIKey: "ld-test-key", Email: "test@example.com"},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "save without email",
			body:       MigrationSaveRequest{Provider: "launchdarkly", APIKey: "ld-test-key"},
			wantStatus: http.StatusCreated,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := executeRequest(h.MigrationSave, http.MethodPost, "/v1/public/migration/save", tc.body)
			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tc.wantStatus, rec.Code, rec.Body.String())
				return
			}

			var resp MigrationSaveResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			if resp.SessionToken == "" {
				t.Error("expected non-empty session_token")
			}
			if resp.ExpiresAt == "" {
				t.Error("expected non-empty expires_at")
			}
			if resp.Summary == "" {
				t.Error("expected non-empty summary")
			}

			// Verify session was stored
			sess, err := store.GetSession(context.Background(), resp.SessionToken)
			if err != nil {
				t.Fatalf("failed to retrieve session: %v", err)
			}
			if sess.Provider != tc.body.Provider {
				t.Errorf("expected provider %s, got %s", tc.body.Provider, sess.Provider)
			}
			if sess.Email != tc.body.Email {
				t.Errorf("expected email %s, got %s", tc.body.Email, sess.Email)
			}
		})
	}
}

func TestPublicHandler_MigrationSave_ValidationErrors(t *testing.T) {
	t.Parallel()
	h, _ := setupPublicHandler(t)

	tests := []struct {
		name       string
		body       MigrationSaveRequest
		wantStatus int
	}{
		{
			name:       "missing provider",
			body:       MigrationSaveRequest{Provider: "", APIKey: "key"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing api key",
			body:       MigrationSaveRequest{Provider: "launchdarkly", APIKey: ""},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := executeRequest(h.MigrationSave, http.MethodPost, "/v1/public/migration/save", tc.body)
			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}

// ─── Migration Preview Tests ───────────────────────────────────────────────

func TestPublicHandler_MigrationPreview_Validation(t *testing.T) {
	t.Parallel()
	h, _ := setupPublicHandler(t)

	tests := []struct {
		name       string
		body       MigrationPreviewRequest
		wantStatus int
	}{
		{
			name:       "missing provider",
			body:       MigrationPreviewRequest{Provider: "", APIKey: "key"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing api key",
			body:       MigrationPreviewRequest{Provider: "launchdarkly", APIKey: ""},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rec := executeRequest(h.MigrationPreview, http.MethodPost, "/v1/public/migration/preview", tc.body)
			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}

// ─── Utility Tests ─────────────────────────────────────────────────────────

func TestParseSimpleContext(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		input  string
		expect map[string]interface{}
	}{
		{
			name:  "simple key value pairs",
			input: `{userId: "test", plan: "enterprise"}`,
			expect: map[string]interface{}{
				"userId": "test",
				"plan":   "enterprise",
			},
		},
		{
			name:  "single pair",
			input: `{plan: "pro"}`,
			expect: map[string]interface{}{
				"plan": "pro",
			},
		},
		{
			name:   "empty",
			input:  `{}`,
			expect: map[string]interface{}{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := parseSimpleContext(tc.input)
			for k, v := range tc.expect {
				if result[k] != v {
					t.Errorf("key %s: expected %v, got %v", k, v, result[k])
				}
			}
		})
	}
}

func TestGetCompetitorPrice(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		provider string
		teamSize int
		expected float64
	}{
		{"launchdarkly free tier", "launchdarkly", 3, 0},
		{"launchdarkly starter", "launchdarkly", 8, 250},
		{"launchdarkly pro", "launchdarkly", 50, 12000},
		{"launchdarkly large", "launchdarkly", 80, 24000},
		{"launchdarkly enterprise", "launchdarkly", 200, 50000},
		{"flagsmith free", "flagsmith", 1, 0},
		{"flagsmith small", "flagsmith", 10, 200},
		{"flagsmith medium", "flagsmith", 30, 500},
		{"unleash free", "unleash", 3, 0},
		{"unknown defaults to LD", "unknown", 50, 12000},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := getCompetitorPrice(tc.provider, tc.teamSize)
			if got != tc.expected {
				t.Errorf("getCompetitorPrice(%s, %d): expected %.0f, got %.0f", tc.provider, tc.teamSize, tc.expected, got)
			}
		})
	}
}

func TestBuildDemoRuleset(t *testing.T) {
	t.Parallel()

	ruleset := buildDemoRuleset()
	if ruleset == nil {
		t.Fatal("buildDemoRuleset returned nil")
	}

	expectedFlags := []string{"dark-mode", "new-checkout", "beta-features", "max-results", "welcome-message"}
	for _, key := range expectedFlags {
		if _, ok := ruleset.Flags[key]; !ok {
			t.Errorf("expected flag %q in demo ruleset", key)
		}
		if _, ok := ruleset.States[key]; !ok {
			t.Errorf("expected state for flag %q in demo ruleset", key)
		}
	}
}

func TestMatchCondition(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		condition domain.Condition
		attrValue string
		expected  bool
	}{
		{"eq match", domain.Condition{Operator: domain.OpEquals, Values: []string{"enterprise"}}, "enterprise", true},
		{"eq no match", domain.Condition{Operator: domain.OpEquals, Values: []string{"enterprise"}}, "free", false},
		{"neq match", domain.Condition{Operator: domain.OpNotEquals, Values: []string{"free"}}, "enterprise", true},
		{"neq no match", domain.Condition{Operator: domain.OpNotEquals, Values: []string{"enterprise"}}, "enterprise", false},
		{"in match", domain.Condition{Operator: domain.OpIn, Values: []string{"pro", "enterprise"}}, "pro", true},
		{"in no match", domain.Condition{Operator: domain.OpIn, Values: []string{"pro", "enterprise"}}, "free", false},
		{"contains match", domain.Condition{Operator: domain.OpContains, Values: []string{"test"}}, "test@example.com", true},
		{"contains no match", domain.Condition{Operator: domain.OpContains, Values: []string{"xyz"}}, "test@example.com", false},
		{"startsWith match", domain.Condition{Operator: domain.OpStartsWith, Values: []string{"test"}}, "test@example.com", true},
		{"endsWith match", domain.Condition{Operator: domain.OpEndsWith, Values: []string{".com"}}, "test@example.com", true},
		{"exists", domain.Condition{Operator: domain.OpExists}, "anything", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := matchCondition(tc.condition, tc.attrValue)
			if got != tc.expected {
				t.Errorf("matchCondition: expected %v, got %v", tc.expected, got)
			}
		})
	}
}

func TestGenerateSessionToken(t *testing.T) {
	t.Parallel()

	token, err := generateSessionToken()
	if err != nil {
		t.Fatalf("generateSessionToken failed: %v", err)
	}
	if len(token) != 64 { // 32 bytes hex = 64 chars
		t.Errorf("expected 64-char token, got %d chars", len(token))
	}

	// Ensure uniqueness
	token2, _ := generateSessionToken()
	if token == token2 {
		t.Error("two generated tokens should be different")
	}
}

// Ensure the mockSessionStore implements domain.SessionStore
var _ domain.SessionStore = (*mockSessionStore)(nil)
