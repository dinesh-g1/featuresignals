package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/auth"
)

func newTestAuthHandler() (*AuthHandler, *mockStore) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	return NewAuthHandler(store, jwtMgr), store
}

func TestAuthHandler_Register(t *testing.T) {
	h, store := newTestAuthHandler()

	body := `{"email":"test@example.com","password":"securepassword123","name":"Test User","org_name":"Test Org"}`
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
	if _, err := store.GetUserByEmail(nil, "test@example.com"); err != nil {
		t.Error("user not stored in database")
	}
}

func TestAuthHandler_Register_MissingFields(t *testing.T) {
	h, _ := newTestAuthHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing email", `{"password":"pass12345","name":"Test","org_name":"Org"}`},
		{"missing password", `{"email":"test@test.com","name":"Test","org_name":"Org"}`},
		{"missing name", `{"email":"test@test.com","password":"pass12345","org_name":"Org"}`},
		{"missing org_name", `{"email":"test@test.com","password":"pass12345","name":"Test"}`},
		{"short password", `{"email":"test@test.com","password":"short","name":"Test","org_name":"Org"}`},
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

	body := `{"email":"dup@example.com","password":"securepassword123","name":"Test User","org_name":"Test Org"}`

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
	regBody := `{"email":"login@example.com","password":"securepassword123","name":"Test","org_name":"Org"}`
	r1 := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(regBody))
	w1 := httptest.NewRecorder()
	h.Register(w1, r1)

	if w1.Code != http.StatusCreated {
		t.Fatalf("register failed: %d", w1.Code)
	}

	// Login
	loginBody := `{"email":"login@example.com","password":"securepassword123"}`
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

	regBody := `{"email":"wrong@example.com","password":"securepassword123","name":"Test","org_name":"Org"}`
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
	regBody := `{"email":"refresh@example.com","password":"securepassword123","name":"Test","org_name":"Org"}`
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
