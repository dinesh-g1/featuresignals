package zeptomail

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestNewOTPSender_Validation(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		token     string
		fromEmail string
		wantErr   bool
	}{
		{"valid", "tok", "noreply@example.com", false},
		{"missing token", "", "noreply@example.com", true},
		{"missing from", "tok", "", true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := NewOTPSender(tc.token, tc.fromEmail, "Test", "https://api.test.com", testLogger())
			if (err != nil) != tc.wantErr {
				t.Errorf("NewOTPSender() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}

func TestOTPSender_SendOTP_Success(t *testing.T) {
	t.Parallel()
	var received emailRequest
	var authHeader string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		_ = json.NewDecoder(r.Body).Decode(&received)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"request_id":"otp-123","message":"OK"}`))
	}))
	defer srv.Close()

	s, err := NewOTPSender("test-token", "noreply@test.com", "Test", srv.URL, testLogger())
	if err != nil {
		t.Fatal(err)
	}

	if err := s.SendOTP(context.Background(), "user@example.com", "Alice", "123456"); err != nil {
		t.Fatalf("SendOTP() returned error: %v", err)
	}

	if authHeader != "Zoho-enczapikey test-token" {
		t.Errorf("expected auth header, got %q", authHeader)
	}
	if received.From.Address != "noreply@test.com" {
		t.Errorf("expected from 'noreply@test.com', got %q", received.From.Address)
	}
	if len(received.To) != 1 || received.To[0].EmailAddress.Address != "user@example.com" {
		t.Errorf("unexpected To: %+v", received.To)
	}
	if received.Subject != "Your FeatureSignals verification code" {
		t.Errorf("unexpected subject: %q", received.Subject)
	}
	if received.HTMLBody == "" {
		t.Error("HTMLBody should contain rendered OTP email")
	}
}

func TestOTPSender_SendOTP_HTTPError(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"code":"EM_400","message":"bad request"}}`))
	}))
	defer srv.Close()

	s, _ := NewOTPSender("tok", "noreply@test.com", "Test", srv.URL, testLogger())

	err := s.SendOTP(context.Background(), "user@example.com", "User", "000000")
	if err == nil {
		t.Fatal("expected error for 400 response")
	}
}

func TestOTPSender_SendOTP_RetriesOn5xx(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := callCount.Add(1)
		if n < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":{"code":"EM_500","message":"error"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"request_id":"ok","message":"OK"}`))
	}))
	defer srv.Close()

	s, _ := NewOTPSender("tok", "noreply@test.com", "Test", srv.URL, testLogger())

	if err := s.SendOTP(context.Background(), "user@example.com", "User", "123456"); err != nil {
		t.Fatalf("expected success after retries, got: %v", err)
	}
	if callCount.Load() != 3 {
		t.Errorf("expected 3 calls, got %d", callCount.Load())
	}
}

func TestOTPSender_InterfaceCompliance(t *testing.T) {
	var _ domain.OTPSender = (*OTPSender)(nil)
}

func TestRenderOTPHTML(t *testing.T) {
	html := renderOTPHTML("Alice", "123456")
	if html == "" {
		t.Fatal("rendered OTP HTML should not be empty")
	}
	if !containsStr(html, "123456") {
		t.Error("OTP code should appear in rendered HTML")
	}
	if !containsStr(html, "Alice") {
		t.Error("recipient name should appear in rendered HTML")
	}
}

func TestRenderOTPHTML_EmptyName(t *testing.T) {
	html := renderOTPHTML("", "999999")
	if !containsStr(html, "there") {
		t.Error("empty name should default to 'there'")
	}
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
