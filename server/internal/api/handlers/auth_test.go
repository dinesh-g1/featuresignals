package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
)

type mockSMSSender struct {
	lastPhone string
	lastOTP   string
	err       error
}

func (m *mockSMSSender) SendOTP(phone, otp string) error {
	m.lastPhone = phone
	m.lastOTP = otp
	return m.err
}

type mockEmailSender struct {
	lastEmail string
	lastToken string
	err       error
}

func (m *mockEmailSender) SendVerificationEmail(toEmail, token, baseURL string) error {
	m.lastEmail = toEmail
	m.lastToken = token
	return m.err
}

func newAuthenticatedRequest(method, path string, body string, userID, orgID string) *http.Request {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	return r.WithContext(ctx)
}

func newTestAuthHandler() (*AuthHandler, *mockStore) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	return NewAuthHandler(store, jwtMgr, nil, nil, "http://localhost:8080", "http://localhost:3000"), store
}

func TestAuthHandler_Register(t *testing.T) {
	h, store := newTestAuthHandler()

	body := `{"email":"test@example.com","password":"Secure@123","name":"Test User","org_name":"Test Org"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.Register(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	if result["user"] == nil {
		t.Error("expected user in response")
	}
	if result["tokens"] == nil {
		t.Error("expected tokens in response")
	}
	if result["organization"] == nil {
		t.Error("expected organization in response")
	}

	// Verify user was stored
	if _, err := store.GetUserByEmail(context.Background(), "test@example.com"); err != nil {
		t.Error("user not stored in database")
	}
}

func TestAuthHandler_Register_MissingFields(t *testing.T) {
	h, _ := newTestAuthHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing email", `{"password":"Secure@123","name":"Test","org_name":"Org"}`},
		{"missing password", `{"email":"test@test.com","name":"Test","org_name":"Org"}`},
		{"missing name", `{"email":"test@test.com","password":"Secure@123","org_name":"Org"}`},
		{"missing org_name", `{"email":"test@test.com","password":"Secure@123","name":"Test"}`},
		{"short password", `{"email":"test@test.com","password":"short","name":"Test","org_name":"Org"}`},
		{"no uppercase", `{"email":"test@test.com","password":"secure@123","name":"Test","org_name":"Org"}`},
		{"no special char", `{"email":"test@test.com","password":"Secure1234","name":"Test","org_name":"Org"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(tt.body))
			w := httptest.NewRecorder()

			h.Register(w, r)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestAuthHandler_Register_DuplicateEmail(t *testing.T) {
	h, _ := newTestAuthHandler()

	body := `{"email":"dup@example.com","password":"Secure@123","name":"Test User","org_name":"Test Org"}`

	r1 := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w1 := httptest.NewRecorder()
	h.Register(w1, r1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("first register failed: %d", w1.Code)
	}

	r2 := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w2 := httptest.NewRecorder()
	h.Register(w2, r2)

	if w2.Code != http.StatusConflict {
		t.Errorf("expected 409 for duplicate email, got %d", w2.Code)
	}
}

func TestAuthHandler_Login(t *testing.T) {
	h, _ := newTestAuthHandler()

	// Register first
	regBody := `{"email":"login@example.com","password":"Secure@123","name":"Test","org_name":"Org"}`
	r1 := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(regBody))
	w1 := httptest.NewRecorder()
	h.Register(w1, r1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("register failed: %d", w1.Code)
	}

	// Login
	loginBody := `{"email":"login@example.com","password":"Secure@123"}`
	r2 := httptest.NewRequest("POST", "/v1/auth/login", strings.NewReader(loginBody))
	w2 := httptest.NewRecorder()
	h.Login(w2, r2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &result)

	if result["tokens"] == nil {
		t.Error("expected tokens in login response")
	}
	if result["user"] == nil {
		t.Error("expected user in login response")
	}
}

func TestAuthHandler_Login_WrongPassword(t *testing.T) {
	h, _ := newTestAuthHandler()

	regBody := `{"email":"wrong@example.com","password":"Secure@123","name":"Test","org_name":"Org"}`
	r1 := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(regBody))
	w1 := httptest.NewRecorder()
	h.Register(w1, r1)

	loginBody := `{"email":"wrong@example.com","password":"incorrectpassword"}`
	r2 := httptest.NewRequest("POST", "/v1/auth/login", strings.NewReader(loginBody))
	w2 := httptest.NewRecorder()
	h.Login(w2, r2)

	if w2.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w2.Code)
	}
}

func TestAuthHandler_Login_NonexistentUser(t *testing.T) {
	h, _ := newTestAuthHandler()

	loginBody := `{"email":"nobody@example.com","password":"password123"}`
	r := httptest.NewRequest("POST", "/v1/auth/login", strings.NewReader(loginBody))
	w := httptest.NewRecorder()
	h.Login(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthHandler_Refresh(t *testing.T) {
	h, _ := newTestAuthHandler()

	// Register to get tokens
	regBody := `{"email":"refresh@example.com","password":"Secure@123","name":"Test","org_name":"Org"}`
	r1 := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(regBody))
	w1 := httptest.NewRecorder()
	h.Register(w1, r1)

	var regResult map[string]interface{}
	json.Unmarshal(w1.Body.Bytes(), &regResult)
	tokens := regResult["tokens"].(map[string]interface{})
	refreshToken := tokens["refresh_token"].(string)

	// Refresh
	refreshBody := `{"refresh_token":"` + refreshToken + `"}`
	r2 := httptest.NewRequest("POST", "/v1/auth/refresh", strings.NewReader(refreshBody))
	w2 := httptest.NewRecorder()
	h.Refresh(w2, r2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &result)

	if result["access_token"] == nil {
		t.Error("expected access_token in refresh response")
	}
}

func TestAuthHandler_Refresh_InvalidToken(t *testing.T) {
	h, _ := newTestAuthHandler()

	body := `{"refresh_token":"invalid-token"}`
	r := httptest.NewRequest("POST", "/v1/auth/refresh", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Refresh(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthHandler_Register_InvalidJSON(t *testing.T) {
	h, _ := newTestAuthHandler()

	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(`{invalid`))
	w := httptest.NewRecorder()
	h.Register(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		pw   string
		want bool
	}{
		{"Secure@123", true},
		{"Ab1!abcd", true},
		{"short", false},
		{"alllower@1", false},
		{"ALLUPPER@1", false},
		{"NoDigitHere!", false},
		{"NoSpecial1A", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.pw, func(t *testing.T) {
			if got := validatePassword(tt.pw); got != tt.want {
				t.Errorf("validatePassword(%q) = %v, want %v", tt.pw, got, tt.want)
			}
		})
	}
}

func TestGenerateOTP(t *testing.T) {
	otp, err := generateOTP()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(otp) != 6 {
		t.Errorf("expected 6-digit OTP, got %q", otp)
	}
	for _, c := range otp {
		if c < '0' || c > '9' {
			t.Errorf("non-digit in OTP: %c", c)
		}
	}
	otp2, _ := generateOTP()
	if otp == otp2 {
		t.Log("two OTPs were identical (possible but unlikely)")
	}
}

func TestGenerateEmailToken(t *testing.T) {
	token, err := generateEmailToken()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(token) != 64 {
		t.Errorf("expected 64-char hex token, got %d chars", len(token))
	}
}

// registerAndExtract registers a user and returns userID and orgID from the response.
func registerAndExtract(t *testing.T, h *AuthHandler, email string) (userID, orgID string) {
	t.Helper()
	regBody := `{"email":"` + email + `","password":"Secure@123","name":"Test","org_name":"Org"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(regBody))
	w := httptest.NewRecorder()
	h.Register(w, r)
	if w.Code != http.StatusCreated {
		t.Fatalf("register failed: %d: %s", w.Code, w.Body.String())
	}
	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)
	user := result["user"].(map[string]interface{})
	org := result["organization"].(map[string]interface{})
	return user["id"].(string), org["id"].(string)
}

// Phone verification is disabled by default (EnablePhoneVerification = false).
// SendOTP and VerifyOTP should return 501 Not Implemented.

func TestAuthHandler_SendOTP_DisabledByFeatureFlag(t *testing.T) {
	h, _ := newTestAuthHandler()
	smsMock := &mockSMSSender{}
	h.smsClient = smsMock

	userID, orgID := registerAndExtract(t, h, "otp@test.com")

	body := `{"phone":"+919876543210"}`
	r := newAuthenticatedRequest("POST", "/v1/auth/send-otp", body, userID, orgID)
	w := httptest.NewRecorder()
	h.SendOTP(w, r)

	if w.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501 (phone flag off), got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_VerifyOTP_DisabledByFeatureFlag(t *testing.T) {
	h, _ := newTestAuthHandler()

	userID, orgID := registerAndExtract(t, h, "verify-otp@test.com")

	r := newAuthenticatedRequest("POST", "/v1/auth/verify-otp", `{"otp":"123456"}`, userID, orgID)
	w := httptest.NewRecorder()
	h.VerifyOTP(w, r)

	if w.Code != http.StatusNotImplemented {
		t.Fatalf("expected 501 (phone flag off), got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_Register_NoDemoData(t *testing.T) {
	h, store := newTestAuthHandler()

	body := `{"email":"normal@example.com","password":"Secure@123","name":"Normal User","org_name":"Normal Org"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Register(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	store.mu.RLock()
	flagCount := len(store.flags)
	store.mu.RUnlock()

	if flagCount != 0 {
		t.Errorf("registration should not seed sample flags, got %d", flagCount)
	}
}

func TestAuthHandler_SendVerificationEmail(t *testing.T) {
	emailMock := &mockEmailSender{}
	h, _ := newTestAuthHandler()
	h.emailSender = emailMock

	userID, orgID := registerAndExtract(t, h, "emailverify@test.com")

	r := newAuthenticatedRequest("POST", "/v1/auth/send-verification-email", "", userID, orgID)
	w := httptest.NewRecorder()
	h.SendVerificationEmail(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if emailMock.lastEmail != "emailverify@test.com" {
		t.Errorf("email not sent to correct address: %s", emailMock.lastEmail)
	}
	if emailMock.lastToken == "" {
		t.Error("no token was generated")
	}
}

func TestAuthHandler_VerifyEmail(t *testing.T) {
	h, store := newTestAuthHandler()
	userID, orgID := registerAndExtract(t, h, "verifyemail@test.com")

	emailMock := &mockEmailSender{}
	h.emailSender = emailMock

	r := newAuthenticatedRequest("POST", "/v1/auth/send-verification-email", "", userID, orgID)
	w := httptest.NewRecorder()
	h.SendVerificationEmail(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("send verification email failed: %d", w.Code)
	}

	token := emailMock.lastToken

	r2 := httptest.NewRequest("GET", "/v1/auth/verify-email?token="+token, nil)
	w2 := httptest.NewRecorder()
	h.VerifyEmail(w2, r2)

	if w2.Code != http.StatusFound {
		t.Fatalf("expected 302 redirect, got %d: %s", w2.Code, w2.Body.String())
	}

	u, _ := store.GetUserByID(context.Background(), userID)
	if !u.EmailVerified {
		t.Error("email should be verified")
	}
}

func TestAuthHandler_VerifyEmail_InvalidToken(t *testing.T) {
	h, _ := newTestAuthHandler()

	r := httptest.NewRequest("GET", "/v1/auth/verify-email?token=invalidtoken", nil)
	w := httptest.NewRecorder()
	h.VerifyEmail(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_VerifyEmail_MissingToken(t *testing.T) {
	h, _ := newTestAuthHandler()

	r := httptest.NewRequest("GET", "/v1/auth/verify-email", nil)
	w := httptest.NewRecorder()
	h.VerifyEmail(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Token Exchange Tests ---

func TestAuthHandler_TokenExchange_Success(t *testing.T) {
	h, store := newTestAuthHandler()

	userID, orgID := registerAndExtract(t, h, "exchange-success@test.com")

	// Create a one-time token
	ott, err := store.CreateOneTimeToken(context.Background(), userID, orgID, 5*time.Minute)
	if err != nil {
		t.Fatalf("failed to create one-time token: %v", err)
	}

	body := `{"token":"` + ott + `"}`
	r := httptest.NewRequest("POST", "/v1/auth/token-exchange", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.TokenExchange(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)
	if result["tokens"] == nil {
		t.Error("expected tokens in response")
	}
	tokens := result["tokens"].(map[string]interface{})
	if tokens["access_token"] == nil || tokens["access_token"].(string) == "" {
		t.Error("expected non-empty access_token")
	}
}

func TestAuthHandler_TokenExchange_InvalidToken(t *testing.T) {
	h, _ := newTestAuthHandler()

	body := `{"token":"nonexistent-token"}`
	r := httptest.NewRequest("POST", "/v1/auth/token-exchange", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.TokenExchange(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestAuthHandler_TokenExchange_MissingToken(t *testing.T) {
	h, _ := newTestAuthHandler()

	body := `{}`
	r := httptest.NewRequest("POST", "/v1/auth/token-exchange", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.TokenExchange(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAuthHandler_TokenExchange_Replay(t *testing.T) {
	h, store := newTestAuthHandler()

	userID, orgID := registerAndExtract(t, h, "exchange-replay@test.com")

	ott, err := store.CreateOneTimeToken(context.Background(), userID, orgID, 5*time.Minute)
	if err != nil {
		t.Fatalf("failed to create one-time token: %v", err)
	}

	body := `{"token":"` + ott + `"}`

	// First use should succeed
	r1 := httptest.NewRequest("POST", "/v1/auth/token-exchange", strings.NewReader(body))
	w1 := httptest.NewRecorder()
	h.TokenExchange(w1, r1)
	if w1.Code != http.StatusOK {
		t.Fatalf("expected 200 on first use, got %d", w1.Code)
	}

	// Second use should fail (token is consumed)
	r2 := httptest.NewRequest("POST", "/v1/auth/token-exchange", strings.NewReader(body))
	w2 := httptest.NewRecorder()
	h.TokenExchange(w2, r2)
	if w2.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 on replay, got %d", w2.Code)
	}
}
