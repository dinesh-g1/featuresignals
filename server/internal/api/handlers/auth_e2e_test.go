package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/auth"
)

// newE2EAuthHandler creates a handler with a real JWT manager for end-to-end flow testing.
func newE2EAuthHandler() (*AuthHandler, *mockStore, *auth.JWTManager) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	handler := NewAuthHandler(store, jwtMgr, nil, nil, "http://localhost:8080", "http://localhost:3000")
	return handler, store, jwtMgr
}

type registerResponse struct {
	User         map[string]interface{} `json:"user"`
	Tokens       auth.TokenPair         `json:"tokens"`
	Organization map[string]interface{} `json:"organization"`
}

type loginResponse struct {
	User   map[string]interface{} `json:"user"`
	Tokens auth.TokenPair         `json:"tokens"`
}

type refreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

func doRegister(t *testing.T, h *AuthHandler, email, password, name, orgName string) (*httptest.ResponseRecorder, registerResponse) {
	t.Helper()
	body := `{"email":"` + email + `","password":"` + password + `","name":"` + name + `","org_name":"` + orgName + `"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Register(w, r)
	var resp registerResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	return w, resp
}

func doLogin(t *testing.T, h *AuthHandler, email, password string) (*httptest.ResponseRecorder, loginResponse) {
	t.Helper()
	body := `{"email":"` + email + `","password":"` + password + `"}`
	r := httptest.NewRequest("POST", "/v1/auth/login", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Login(w, r)
	var resp loginResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	return w, resp
}

func doRefresh(t *testing.T, h *AuthHandler, refreshToken string) (*httptest.ResponseRecorder, refreshResponse) {
	t.Helper()
	body := `{"refresh_token":"` + refreshToken + `"}`
	r := httptest.NewRequest("POST", "/v1/auth/refresh", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Refresh(w, r)
	var resp refreshResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	return w, resp
}

// TestAuthFlow_RegisterLoginRefresh exercises the complete happy path:
// register a new user, login with those credentials, then use the login's
// refresh token to obtain a fresh token pair.
func TestAuthFlow_RegisterLoginRefresh(t *testing.T) {
	h, _, jwtMgr := newE2EAuthHandler()

	// Step 1: Register
	regW, regResp := doRegister(t, h, "flow@example.com", "Str0ng!Pass", "Flow User", "Flow Org")
	if regW.Code != http.StatusCreated {
		t.Fatalf("register: expected 201, got %d: %s", regW.Code, regW.Body.String())
	}
	if regResp.User["id"] == nil || regResp.User["id"].(string) == "" {
		t.Fatal("register: missing user id")
	}
	if regResp.Organization["id"] == nil || regResp.Organization["id"].(string) == "" {
		t.Fatal("register: missing org id")
	}
	if regResp.Tokens.AccessToken == "" || regResp.Tokens.RefreshToken == "" {
		t.Fatal("register: missing tokens")
	}

	// Step 2: Login with the same credentials
	loginW, loginResp := doLogin(t, h, "flow@example.com", "Str0ng!Pass")
	if loginW.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d: %s", loginW.Code, loginW.Body.String())
	}
	if loginResp.Tokens.AccessToken == "" || loginResp.Tokens.RefreshToken == "" {
		t.Fatal("login: missing tokens")
	}
	if loginResp.User["email"].(string) != "flow@example.com" {
		t.Errorf("login: expected email flow@example.com, got %s", loginResp.User["email"])
	}

	// Validate the login access token carries correct claims
	loginClaims, err := jwtMgr.ValidateToken(loginResp.Tokens.AccessToken)
	if err != nil {
		t.Fatalf("login access token invalid: %v", err)
	}
	if loginClaims.UserID != regResp.User["id"].(string) {
		t.Errorf("login token user_id = %s, want %s", loginClaims.UserID, regResp.User["id"].(string))
	}
	if loginClaims.Role != "owner" {
		t.Errorf("login token role = %s, want owner", loginClaims.Role)
	}

	// Step 3: Refresh using the login refresh token
	refW, refResp := doRefresh(t, h, loginResp.Tokens.RefreshToken)
	if refW.Code != http.StatusOK {
		t.Fatalf("refresh: expected 200, got %d: %s", refW.Code, refW.Body.String())
	}
	if refResp.AccessToken == "" || refResp.RefreshToken == "" {
		t.Fatal("refresh: missing tokens")
	}

	// The new access token must be valid and carry the same identity
	refreshedClaims, err := jwtMgr.ValidateToken(refResp.AccessToken)
	if err != nil {
		t.Fatalf("refreshed access token invalid: %v", err)
	}
	if refreshedClaims.UserID != loginClaims.UserID {
		t.Errorf("refreshed token user_id = %s, want %s", refreshedClaims.UserID, loginClaims.UserID)
	}
	if refreshedClaims.OrgID != loginClaims.OrgID {
		t.Errorf("refreshed token org_id = %s, want %s", refreshedClaims.OrgID, loginClaims.OrgID)
	}
}

// TestAuthFlow_RegisterDuplicateEmail verifies that registering a second
// account with the same email returns 409 and the original account is intact.
func TestAuthFlow_RegisterDuplicateEmail(t *testing.T) {
	h, store, _ := newE2EAuthHandler()

	w1, resp1 := doRegister(t, h, "dup-e2e@example.com", "Str0ng!Pass", "First", "Org1")
	if w1.Code != http.StatusCreated {
		t.Fatalf("first register: expected 201, got %d", w1.Code)
	}
	origUserID := resp1.User["id"].(string)

	w2, _ := doRegister(t, h, "dup-e2e@example.com", "An0ther!Pass", "Second", "Org2")
	if w2.Code != http.StatusConflict {
		t.Fatalf("duplicate register: expected 409, got %d: %s", w2.Code, w2.Body.String())
	}

	// Original user is unchanged
	u, err := store.GetUserByEmail(context.Background(), "dup-e2e@example.com")
	if err != nil {
		t.Fatal("original user should still exist")
	}
	if u.ID != origUserID {
		t.Errorf("user id changed: got %s, want %s", u.ID, origUserID)
	}
	if u.Name != "First" {
		t.Errorf("user name changed: got %s, want First", u.Name)
	}
}

// TestAuthFlow_LoginWrongPassword registers a user, then tries to login with
// an incorrect password and verifies the original credentials still work.
func TestAuthFlow_LoginWrongPassword(t *testing.T) {
	h, _, _ := newE2EAuthHandler()

	w1, _ := doRegister(t, h, "wrongpw-e2e@example.com", "C0rrect!Pass", "User", "Org")
	if w1.Code != http.StatusCreated {
		t.Fatalf("register: expected 201, got %d", w1.Code)
	}

	// Login with wrong password
	badW, _ := doLogin(t, h, "wrongpw-e2e@example.com", "Wr0ng!Pass")
	if badW.Code != http.StatusUnauthorized {
		t.Fatalf("wrong password: expected 401, got %d", badW.Code)
	}

	// Original password still works
	goodW, goodResp := doLogin(t, h, "wrongpw-e2e@example.com", "C0rrect!Pass")
	if goodW.Code != http.StatusOK {
		t.Fatalf("correct password after failed attempt: expected 200, got %d", goodW.Code)
	}
	if goodResp.Tokens.AccessToken == "" {
		t.Error("correct login should return tokens")
	}
}

// TestAuthFlow_LoginNonexistentUser verifies that login with an email that was
// never registered returns 401 with a generic error (no user enumeration).
func TestAuthFlow_LoginNonexistentUser(t *testing.T) {
	h, _, _ := newE2EAuthHandler()

	w, _ := doLogin(t, h, "ghost-e2e@example.com", "Any!Pass1")
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("nonexistent user: expected 401, got %d", w.Code)
	}

	var body map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &body)
	msg, _ := body["error"].(string)
	if strings.Contains(strings.ToLower(msg), "not found") || strings.Contains(strings.ToLower(msg), "no user") {
		t.Error("error message should not reveal whether the email exists")
	}
}

// TestAuthFlow_RefreshWithAccessToken verifies that the refresh endpoint
// rejects an access token (issuer "featuresignals") and only accepts a
// refresh token (issuer "featuresignals-refresh"). This prevents token type
// confusion attacks.
func TestAuthFlow_RefreshWithAccessToken(t *testing.T) {
	h, _, jwtMgr := newE2EAuthHandler()

	regW, regResp := doRegister(t, h, "confusion@example.com", "Str0ng!Pass", "User", "Org")
	if regW.Code != http.StatusCreated {
		t.Fatalf("register: expected 201, got %d", regW.Code)
	}

	loginW, loginResp := doLogin(t, h, "confusion@example.com", "Str0ng!Pass")
	if loginW.Code != http.StatusOK {
		t.Fatalf("login: expected 200, got %d", loginW.Code)
	}

	accessToken := loginResp.Tokens.AccessToken
	refreshToken := loginResp.Tokens.RefreshToken

	// Sanity: access token is valid as an access token
	if _, err := jwtMgr.ValidateToken(accessToken); err != nil {
		t.Fatalf("access token should be valid: %v", err)
	}
	// Sanity: refresh token is valid as a refresh token
	if _, err := jwtMgr.ValidateRefreshToken(refreshToken); err != nil {
		t.Fatalf("refresh token should be valid: %v", err)
	}

	// Access token must NOT work in the refresh endpoint
	badW, _ := doRefresh(t, h, accessToken)
	if badW.Code != http.StatusUnauthorized {
		t.Fatalf("refresh with access token: expected 401, got %d: %s", badW.Code, badW.Body.String())
	}

	// Refresh token with the correct issuer should still work
	goodW, goodResp := doRefresh(t, h, refreshToken)
	if goodW.Code != http.StatusOK {
		t.Fatalf("refresh with refresh token: expected 200, got %d", goodW.Code)
	}
	if goodResp.AccessToken == "" {
		t.Error("expected new access token from valid refresh")
	}

	// Verify the new refresh token also has the correct issuer
	_, err := jwtMgr.ValidateRefreshToken(goodResp.RefreshToken)
	if err != nil {
		t.Error("new refresh token should be valid as a refresh token")
	}
	_, err = jwtMgr.ValidateToken(goodResp.RefreshToken)
	if err == nil {
		t.Error("new refresh token should NOT pass access token validation")
	}

	// Also verify access token cannot pass refresh validation
	_, err = jwtMgr.ValidateRefreshToken(regResp.Tokens.AccessToken)
	if err == nil {
		t.Error("access token from register should NOT pass refresh token validation")
	}
}

// TestAuthFlow_PasswordValidation tries to register with various weak
// passwords via the HTTP handler and verifies they are all rejected.
func TestAuthFlow_PasswordValidation(t *testing.T) {
	h, _, _ := newE2EAuthHandler()

	cases := []struct {
		name     string
		password string
	}{
		{"too short", "Ab1!"},
		{"no uppercase", "strong!pass1"},
		{"no lowercase", "STRONG!PASS1"},
		{"no digit", "Strong!Pass"},
		{"no special char", "Str0ngPass1"},
		{"empty", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w, _ := doRegister(t, h, tc.name+"@example.com", tc.password, "Test", "Org")
			if w.Code != http.StatusBadRequest {
				t.Errorf("password %q: expected 400, got %d: %s", tc.password, w.Code, w.Body.String())
			}
		})
	}

	// After all rejections, a valid password should still work
	goodW, _ := doRegister(t, h, "good-pw@example.com", "V@lid1Pass", "Test", "Org")
	if goodW.Code != http.StatusCreated {
		t.Errorf("valid password: expected 201, got %d: %s", goodW.Code, goodW.Body.String())
	}
}
