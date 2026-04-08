package zeptomail

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(&discardWriter{}, nil))
}

type discardWriter struct{}

func (discardWriter) Write(p []byte) (int, error) { return len(p), nil }

func TestNewMailer_Validation(t *testing.T) {
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
			_, err := NewMailer(tc.token, tc.fromEmail, "Test", "https://api.test.com", testLogger())
			if (err != nil) != tc.wantErr {
				t.Errorf("NewMailer() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}

func TestMailer_Send_Success(t *testing.T) {
	t.Parallel()
	var received emailRequest
	var authHeader string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader = r.Header.Get("Authorization")
		_ = json.NewDecoder(r.Body).Decode(&received)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"request_id":"req-123","message":"OK"}`))
	}))
	defer srv.Close()

	m, err := NewMailer("test-token", "noreply@test.com", "Test", srv.URL, testLogger())
	if err != nil {
		t.Fatal(err)
	}

	msg := domain.EmailMessage{
		To:       "user@example.com",
		ToName:   "Alice",
		Template: domain.TemplateWelcome,
		Subject:  "Welcome",
		Data: map[string]string{
			"DashboardURL": "https://app.test.com",
			"DocsURL":      "https://docs.test.com",
		},
	}

	if err := m.Send(context.Background(), msg); err != nil {
		t.Fatalf("Send() returned error: %v", err)
	}

	if authHeader != "Zoho-enczapikey test-token" {
		t.Errorf("expected auth header 'Zoho-enczapikey test-token', got %q", authHeader)
	}
	if received.From.Address != "noreply@test.com" {
		t.Errorf("expected from 'noreply@test.com', got %q", received.From.Address)
	}
	if len(received.To) != 1 || received.To[0].EmailAddress.Address != "user@example.com" {
		t.Errorf("unexpected To: %+v", received.To)
	}
	if received.Subject != "Welcome" {
		t.Errorf("expected subject 'Welcome', got %q", received.Subject)
	}
	if received.HTMLBody == "" {
		t.Error("HTMLBody should not be empty (template was rendered)")
	}
}

func TestMailer_Send_4xxNoRetry(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount.Add(1)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":{"code":"EM_400","message":"bad request"}}`))
	}))
	defer srv.Close()

	m, _ := NewMailer("tok", "noreply@test.com", "Test", srv.URL, testLogger())

	err := m.Send(context.Background(), domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateWelcome,
		Subject:  "Test",
		Data:     map[string]string{"DashboardURL": "https://app.test.com", "DocsURL": "https://docs.test.com"},
	})

	if err == nil {
		t.Fatal("expected error for 400 response")
	}
	if callCount.Load() != 1 {
		t.Errorf("expected 1 call (no retry for 4xx), got %d", callCount.Load())
	}
}

func TestMailer_Send_5xxRetries(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := callCount.Add(1)
		if n < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":{"code":"EM_500","message":"server error"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"request_id":"req-ok","message":"OK"}`))
	}))
	defer srv.Close()

	m, _ := NewMailer("tok", "noreply@test.com", "Test", srv.URL, testLogger())

	err := m.Send(context.Background(), domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateWelcome,
		Subject:  "Test",
		Data:     map[string]string{"DashboardURL": "https://app.test.com", "DocsURL": "https://docs.test.com"},
	})

	if err != nil {
		t.Fatalf("expected success after retries, got: %v", err)
	}
	if callCount.Load() != 3 {
		t.Errorf("expected 3 calls (2 retries + 1 success), got %d", callCount.Load())
	}
}

func TestMailer_Send_5xxExhaustsRetries(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount.Add(1)
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"error":{"code":"EM_503","message":"unavailable"}}`))
	}))
	defer srv.Close()

	m, _ := NewMailer("tok", "noreply@test.com", "Test", srv.URL, testLogger())

	err := m.Send(context.Background(), domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateWelcome,
		Subject:  "Test",
		Data:     map[string]string{"DashboardURL": "https://app.test.com", "DocsURL": "https://docs.test.com"},
	})

	if err == nil {
		t.Fatal("expected error after exhausting retries")
	}
	if callCount.Load() != int32(maxRetries) {
		t.Errorf("expected %d calls, got %d", maxRetries, callCount.Load())
	}
}

func TestMailer_SendBatch_CollectsErrors(t *testing.T) {
	t.Parallel()
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := callCount.Add(1)
		if n == 1 {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":{"code":"EM_400","message":"bad"}}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"request_id":"ok","message":"OK"}`))
	}))
	defer srv.Close()

	m, _ := NewMailer("tok", "noreply@test.com", "Test", srv.URL, testLogger())

	msgs := []domain.EmailMessage{
		{To: "a@example.com", Template: domain.TemplateWelcome, Subject: "A", Data: map[string]string{"DashboardURL": "u", "DocsURL": "u"}},
		{To: "b@example.com", Template: domain.TemplateWelcome, Subject: "B", Data: map[string]string{"DashboardURL": "u", "DocsURL": "u"}},
	}

	err := m.SendBatch(context.Background(), msgs)
	if err == nil {
		t.Fatal("expected error from batch (first message failed)")
	}
	if callCount.Load() != 2 {
		t.Errorf("expected 2 calls (both messages attempted), got %d", callCount.Load())
	}
}

func TestMailer_InterfaceCompliance(t *testing.T) {
	var _ domain.Mailer = (*Mailer)(nil)
}
