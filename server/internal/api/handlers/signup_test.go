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
	"github.com/featuresignals/server/internal/domain"
)

type mockOTPSender struct {
	lastEmail string
	lastName  string
	lastOTP   string
	err       error
}

func (m *mockOTPSender) SendOTP(_ context.Context, toEmail, toName, otp string) error {
	m.lastEmail = toEmail
	m.lastName = toName
	m.lastOTP = otp
	return m.err
}

func newTestSignupHandler() (*SignupHandler, *mockStore, *mockOTPSender) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	sender := &mockOTPSender{}
	h := NewSignupHandler(store, jwtMgr, sender, nil, nil, nil, "https://app.test.com")
	return h, store, sender
}

func TestSignupHandler_InitiateSignup_Success(t *testing.T) {
	h, store, sender := newTestSignupHandler()

	body := `{"email":"alice@example.com","password":"Secure@123","name":"Alice","org_name":"Acme Inc"}`
	r := httptest.NewRequest("POST", "/v1/auth/initiate-signup", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.InitiateSignup(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["message"] == nil {
		t.Error("expected message in response")
	}
	if resp["expires_in"] == nil {
		t.Error("expected expires_in in response")
	}

	if sender.lastEmail != "alice@example.com" {
		t.Errorf("expected OTP sent to alice@example.com, got %s", sender.lastEmail)
	}
	if sender.lastName != "Alice" {
		t.Errorf("expected OTP name Alice, got %s", sender.lastName)
	}
	if sender.lastOTP == "" {
		t.Error("expected OTP to be non-empty")
	}

	pr, err := store.GetPendingRegistrationByEmail(context.Background(), "alice@example.com")
	if err != nil {
		t.Fatalf("pending registration not stored: %v", err)
	}
	if pr.Name != "Alice" || pr.OrgName != "Acme Inc" {
		t.Error("pending registration has wrong name/org_name")
	}
}

func TestSignupHandler_InitiateSignup_MissingFields(t *testing.T) {
	h, _, _ := newTestSignupHandler()

	tests := []struct {
		name string
		body string
	}{
		{"empty email", `{"email":"","password":"Secure@123","name":"A","org_name":"O"}`},
		{"empty password", `{"email":"a@b.com","password":"","name":"A","org_name":"O"}`},
		{"empty name", `{"email":"a@b.com","password":"Secure@123","name":"","org_name":"O"}`},
		{"empty org_name", `{"email":"a@b.com","password":"Secure@123","name":"A","org_name":""}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/auth/initiate-signup", strings.NewReader(tc.body))
			w := httptest.NewRecorder()
			h.InitiateSignup(w, r)
			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestSignupHandler_InitiateSignup_InvalidEmail(t *testing.T) {
	h, _, _ := newTestSignupHandler()

	body := `{"email":"not-an-email","password":"Secure@123","name":"A","org_name":"O"}`
	r := httptest.NewRequest("POST", "/v1/auth/initiate-signup", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.InitiateSignup(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSignupHandler_InitiateSignup_WeakPassword(t *testing.T) {
	h, _, _ := newTestSignupHandler()

	body := `{"email":"a@b.com","password":"weak","name":"A","org_name":"O"}`
	r := httptest.NewRequest("POST", "/v1/auth/initiate-signup", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.InitiateSignup(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSignupHandler_InitiateSignup_DuplicateEmail(t *testing.T) {
	h, store, _ := newTestSignupHandler()

	store.CreateUser(context.Background(), &domain.User{
		Email:        "taken@example.com",
		PasswordHash: "hash",
		Name:         "Existing",
	})

	body := `{"email":"taken@example.com","password":"Secure@123","name":"A","org_name":"O"}`
	r := httptest.NewRequest("POST", "/v1/auth/initiate-signup", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.InitiateSignup(w, r)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSignupHandler_CompleteSignup_Success(t *testing.T) {
	h, store, _ := newTestSignupHandler()

	otp := "123456"
	otpHash, _ := auth.HashPassword(otp)
	pwHash, _ := auth.HashPassword("Secure@123")

	store.UpsertPendingRegistration(context.Background(), &domain.PendingRegistration{
		Email:        "alice@example.com",
		Name:         "Alice",
		OrgName:      "Acme Inc",
		PasswordHash: pwHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(10 * time.Minute),
	})

	body := `{"email":"alice@example.com","otp":"123456"}`
	r := httptest.NewRequest("POST", "/v1/auth/complete-signup", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CompleteSignup(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["user"] == nil {
		t.Error("expected user in response")
	}
	if resp["tokens"] == nil {
		t.Error("expected tokens in response")
	}
	if resp["organization"] == nil {
		t.Error("expected organization in response")
	}

	org := resp["organization"].(map[string]interface{})
	if org["plan"] != domain.PlanTrial {
		t.Errorf("expected plan %q, got %v", domain.PlanTrial, org["plan"])
	}

	user, err := store.GetUserByEmail(context.Background(), "alice@example.com")
	if err != nil {
		t.Fatalf("user not created: %v", err)
	}
	if !user.EmailVerified {
		t.Error("expected email_verified to be true")
	}

	if _, err := store.GetPendingRegistrationByEmail(context.Background(), "alice@example.com"); err == nil {
		t.Error("expected pending registration to be deleted after completion")
	}
}

func TestSignupHandler_CompleteSignup_InvalidOTP(t *testing.T) {
	h, store, _ := newTestSignupHandler()

	otpHash, _ := auth.HashPassword("123456")
	pwHash, _ := auth.HashPassword("Secure@123")

	store.UpsertPendingRegistration(context.Background(), &domain.PendingRegistration{
		Email:        "alice@example.com",
		Name:         "Alice",
		OrgName:      "Acme",
		PasswordHash: pwHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(10 * time.Minute),
	})

	body := `{"email":"alice@example.com","otp":"999999"}`
	r := httptest.NewRequest("POST", "/v1/auth/complete-signup", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CompleteSignup(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSignupHandler_CompleteSignup_ExpiredOTP(t *testing.T) {
	h, store, _ := newTestSignupHandler()

	otpHash, _ := auth.HashPassword("123456")
	pwHash, _ := auth.HashPassword("Secure@123")

	store.UpsertPendingRegistration(context.Background(), &domain.PendingRegistration{
		Email:        "alice@example.com",
		Name:         "Alice",
		OrgName:      "Acme",
		PasswordHash: pwHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(-1 * time.Minute),
	})

	body := `{"email":"alice@example.com","otp":"123456"}`
	r := httptest.NewRequest("POST", "/v1/auth/complete-signup", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CompleteSignup(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSignupHandler_CompleteSignup_TooManyAttempts(t *testing.T) {
	h, store, _ := newTestSignupHandler()

	otpHash, _ := auth.HashPassword("123456")
	pwHash, _ := auth.HashPassword("Secure@123")

	store.UpsertPendingRegistration(context.Background(), &domain.PendingRegistration{
		Email:        "alice@example.com",
		Name:         "Alice",
		OrgName:      "Acme",
		PasswordHash: pwHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(10 * time.Minute),
		Attempts:     domain.OTPMaxAttempts,
	})

	body := `{"email":"alice@example.com","otp":"123456"}`
	r := httptest.NewRequest("POST", "/v1/auth/complete-signup", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CompleteSignup(w, r)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSignupHandler_CompleteSignup_NoPendingRegistration(t *testing.T) {
	h, _, _ := newTestSignupHandler()

	body := `{"email":"nobody@example.com","otp":"123456"}`
	r := httptest.NewRequest("POST", "/v1/auth/complete-signup", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.CompleteSignup(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSignupHandler_ResendSignupOTP_Success(t *testing.T) {
	h, store, sender := newTestSignupHandler()

	otpHash, _ := auth.HashPassword("111111")
	pwHash, _ := auth.HashPassword("Secure@123")

	created := time.Now().Add(-2 * time.Minute)
	pr := &domain.PendingRegistration{
		Email:        "alice@example.com",
		Name:         "Alice",
		OrgName:      "Acme",
		PasswordHash: pwHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(8 * time.Minute),
	}
	store.UpsertPendingRegistration(context.Background(), pr)
	// Override CreatedAt to simulate cooldown elapsed
	store.mu.Lock()
	store.pendingRegs["alice@example.com"].CreatedAt = created
	store.mu.Unlock()

	body := `{"email":"alice@example.com"}`
	r := httptest.NewRequest("POST", "/v1/auth/resend-signup-otp", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ResendSignupOTP(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if sender.lastEmail != "alice@example.com" {
		t.Errorf("expected OTP resent to alice@example.com, got %s", sender.lastEmail)
	}
	if sender.lastOTP == "" {
		t.Error("expected a new OTP to be sent")
	}
}

func TestSignupHandler_ResendSignupOTP_Cooldown(t *testing.T) {
	h, store, _ := newTestSignupHandler()

	otpHash, _ := auth.HashPassword("111111")
	pwHash, _ := auth.HashPassword("Secure@123")

	store.UpsertPendingRegistration(context.Background(), &domain.PendingRegistration{
		Email:        "alice@example.com",
		Name:         "Alice",
		OrgName:      "Acme",
		PasswordHash: pwHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(10 * time.Minute),
	})

	body := `{"email":"alice@example.com"}`
	r := httptest.NewRequest("POST", "/v1/auth/resend-signup-otp", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ResendSignupOTP(w, r)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429 (cooldown), got %d: %s", w.Code, w.Body.String())
	}
}

func TestSignupHandler_ResendSignupOTP_NotFound(t *testing.T) {
	h, _, _ := newTestSignupHandler()

	body := `{"email":"nobody@example.com"}`
	r := httptest.NewRequest("POST", "/v1/auth/resend-signup-otp", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.ResendSignupOTP(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
