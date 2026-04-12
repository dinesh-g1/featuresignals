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
	"github.com/featuresignals/server/internal/domain"
)

func newAuthenticatedRequest(method, path string, body string, userID, orgID string) *http.Request {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	return r.WithContext(ctx)
}

func newTestAuthHandler() (*AuthHandler, *mockStore) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	return NewAuthHandler(store, jwtMgr, nil, "http://localhost:8080", "http://localhost:3000", nil), store
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
	if _, ok := result["onboarding_completed"]; !ok {
		t.Error("expected onboarding_completed in login response")
	}
	if result["onboarding_completed"] != false {
		t.Errorf("expected onboarding_completed=false for new user, got %v", result["onboarding_completed"])
	}
	org := result["organization"].(map[string]interface{})
	if _, ok := org["data_region"]; !ok {
		t.Error("expected data_region in organization response")
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
	if result["organization"] == nil {
		t.Error("expected organization in refresh response")
	}
	if result["user"] == nil {
		t.Error("expected user in refresh response")
	}
	if _, ok := result["onboarding_completed"]; !ok {
		t.Error("expected onboarding_completed in refresh response")
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
	h, store := newTestAuthHandler()

	userID, orgID := registerAndExtract(t, h, "emailverify@test.com")

	r := newAuthenticatedRequest("POST", "/v1/auth/send-verification-email", "", userID, orgID)
	w := httptest.NewRecorder()
	h.SendVerificationEmail(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	u, err := store.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if u.Email != "emailverify@test.com" {
		t.Errorf("unexpected user email: %s", u.Email)
	}
	if u.EmailVerifyToken == "" {
		t.Error("no token was generated")
	}
}

func TestAuthHandler_VerifyEmail(t *testing.T) {
	h, store := newTestAuthHandler()
	userID, orgID := registerAndExtract(t, h, "verifyemail@test.com")

	r := newAuthenticatedRequest("POST", "/v1/auth/send-verification-email", "", userID, orgID)
	w := httptest.NewRecorder()
	h.SendVerificationEmail(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("send verification email failed: %d", w.Code)
	}

	u0, err := store.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	token := u0.EmailVerifyToken
	if token == "" {
		t.Fatal("no verification token in store")
	}

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

func TestAuthHandler_ForgotPassword_UnknownEmail(t *testing.T) {
	t.Parallel()

	// Even for unknown emails, should return 200 to prevent enumeration
	h, _ := newTestAuthHandler()

	body := `{"email":"unknown@example.com"}`
	r := httptest.NewRequest("POST", "/v1/auth/forgot-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ForgotPassword(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for unknown email (prevents enumeration), got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_ForgotPassword_InvalidEmail(t *testing.T) {
	t.Parallel()

	h, _ := newTestAuthHandler()

	body := `{"email":"notanemail"}`
	r := httptest.NewRequest("POST", "/v1/auth/forgot-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ForgotPassword(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid email, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_ForgotPassword_MissingEmail(t *testing.T) {
	t.Parallel()

	h, _ := newTestAuthHandler()

	body := `{}`
	r := httptest.NewRequest("POST", "/v1/auth/forgot-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ForgotPassword(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing email, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_ForgotPassword_KnownEmail(t *testing.T) {
	t.Parallel()

	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	otpSender := &mockOTPSender{}
	h := NewAuthHandler(store, jwtMgr, otpSender, "http://localhost:8080", "http://localhost:3000", nil)

	// Create a user
	hash, _ := auth.HashPassword("Secure@123")
	user := &domain.User{ID: "user-1", Email: "test@example.com", Name: "Test User", PasswordHash: hash}
	store.users["user-1"] = user
	store.usersByEmail["test@example.com"] = user

	body := `{"email":"test@example.com"}`
	r := httptest.NewRequest("POST", "/v1/auth/forgot-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ForgotPassword(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify OTP was sent
	if otpSender.lastEmail != "test@example.com" {
		t.Errorf("expected OTP sent to test@example.com, got %s", otpSender.lastEmail)
	}
	if otpSender.lastOTP == "" {
		t.Error("expected OTP to be generated")
	}

	// Verify token was stored
	if len(store.passwordResetTokens) == 0 {
		t.Error("expected password reset token to be stored")
	}
}

func TestAuthHandler_ResetPassword_Success(t *testing.T) {
	t.Parallel()

	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	otpSender := &mockOTPSender{}
	h := NewAuthHandler(store, jwtMgr, otpSender, "http://localhost:8080", "http://localhost:3000", nil)

	// Create a user
	hash, _ := auth.HashPassword("Secure@123")
	user := &domain.User{ID: "user-1", Email: "test@example.com", Name: "Test User", PasswordHash: hash}
	store.users["user-1"] = user
	store.usersByEmail["test@example.com"] = user

	// Generate OTP (hashed, matching the ForgotPassword flow)
	otp := "123456"
	otpHash, _ := auth.HashPassword(otp)
	expires := time.Now().Add(15 * time.Minute)
	store.SetPasswordResetToken(context.Background(), "user-1", otpHash, expires, "127.0.0.1", "test-agent")

	body := `{"otp":"123456","new_password":"NewSecure@456"}`
	r := httptest.NewRequest("POST", "/v1/auth/reset-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ResetPassword(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify password was updated
	updatedUser := store.users["user-1"]
	if !auth.CheckPassword("NewSecure@456", updatedUser.PasswordHash) {
		t.Error("password was not updated")
	}

	// Verify token was consumed (one of the tokens should be marked used)
	consumed := false
	for _, entry := range store.passwordResetTokens {
		if entry.usedAt != nil {
			consumed = true
			break
		}
	}
	if !consumed {
		t.Error("password reset token was not marked as consumed")
	}
}

func TestAuthHandler_ResetPassword_InvalidOTP(t *testing.T) {
	t.Parallel()

	h, _ := newTestAuthHandler()

	body := `{"otp":"000000","new_password":"NewSecure@456"}`
	r := httptest.NewRequest("POST", "/v1/auth/reset-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ResetPassword(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid OTP, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_ResetPassword_WeakPassword(t *testing.T) {
	t.Parallel()

	h, store := newTestAuthHandler()

	// Create a valid token (hashed)
	expires := time.Now().Add(15 * time.Minute)
	otpHash, _ := auth.HashPassword("valid-otp")
	store.SetPasswordResetToken(context.Background(), "user-1", otpHash, expires, "127.0.0.1", "test-agent")

	tests := []struct {
		name string
		pw   string
	}{
		{"too short", "short"},
		{"no uppercase", "secure@1234"},
		{"no lowercase", "SECURE@1234"},
		{"no digit", "Secure@abcd"},
		{"no special", "Secure12345"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body := `{"otp":"valid-otp","new_password":"` + tt.pw + `"}`
			r := httptest.NewRequest("POST", "/v1/auth/reset-password", strings.NewReader(body))
			w := httptest.NewRecorder()

			h.ResetPassword(w, r)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for weak password (%s), got %d: %s", tt.name, w.Code, w.Body.String())
			}
		})
	}
}

func TestAuthHandler_ResetPassword_ExpiredOTP(t *testing.T) {
	t.Parallel()

	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	h := NewAuthHandler(store, jwtMgr, nil, "http://localhost:8080", "http://localhost:3000", nil)

	// Create an expired token (hashed)
	expires := time.Now().Add(-1 * time.Minute) // already expired
	otpHash, _ := auth.HashPassword("expired-otp")
	store.SetPasswordResetToken(context.Background(), "user-1", otpHash, expires, "127.0.0.1", "test-agent")

	body := `{"otp":"expired-otp","new_password":"NewSecure@456"}`
	r := httptest.NewRequest("POST", "/v1/auth/reset-password", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ResetPassword(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for expired OTP, got %d: %s", w.Code, w.Body.String())
	}
}
