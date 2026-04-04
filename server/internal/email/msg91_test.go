package email

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewMSG91Sender_Validation(t *testing.T) {
	tests := []struct {
		name       string
		authKey    string
		templateID string
		domain     string
		fromEmail  string
		wantErr    bool
	}{
		{"valid", "key", "tmpl", "mail.example.com", "noreply@mail.example.com", false},
		{"missing auth key", "", "tmpl", "mail.example.com", "noreply@mail.example.com", true},
		{"missing template", "key", "", "mail.example.com", "noreply@mail.example.com", true},
		{"missing domain", "key", "tmpl", "", "noreply@mail.example.com", true},
		{"missing from email", "key", "tmpl", "mail.example.com", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewMSG91Sender(tt.authKey, tt.templateID, tt.domain, tt.fromEmail, "Team")
			if (err != nil) != tt.wantErr {
				t.Errorf("NewMSG91Sender() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestMSG91Sender_SendOTP_Success(t *testing.T) {
	var receivedBody msg91EmailRequest
	var receivedAuthKey string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthKey = r.Header.Get("authkey")
		if err := json.NewDecoder(r.Body).Decode(&receivedBody); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"success"}`))
	}))
	defer srv.Close()

	sender, err := NewMSG91Sender("test-key", "tmpl-123", "mail.example.com", "noreply@mail.example.com", "Test Team")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	sender.WithBaseURL(srv.URL)

	err = sender.SendOTP(context.Background(), "user@example.com", "John Doe", "123456")
	if err != nil {
		t.Fatalf("SendOTP returned error: %v", err)
	}

	if receivedAuthKey != "test-key" {
		t.Errorf("expected authkey 'test-key', got %q", receivedAuthKey)
	}
	if len(receivedBody.Recipients) != 1 {
		t.Fatalf("expected 1 recipient, got %d", len(receivedBody.Recipients))
	}
	r := receivedBody.Recipients[0]
	if len(r.To) != 1 || r.To[0].Email != "user@example.com" {
		t.Errorf("unexpected To: %+v", r.To)
	}
	if r.Variables["otp"] != "123456" {
		t.Errorf("expected otp variable '123456', got %q", r.Variables["otp"])
	}
	if r.Variables["user_name"] != "John Doe" {
		t.Errorf("expected user_name 'John Doe', got %q", r.Variables["user_name"])
	}
	if receivedBody.TemplateID != "tmpl-123" {
		t.Errorf("expected template_id 'tmpl-123', got %q", receivedBody.TemplateID)
	}
	if receivedBody.Domain != "mail.example.com" {
		t.Errorf("expected domain 'mail.example.com', got %q", receivedBody.Domain)
	}
}

func TestMSG91Sender_SendOTP_HTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"message":"invalid template"}`))
	}))
	defer srv.Close()

	sender, _ := NewMSG91Sender("key", "tmpl", "d.com", "noreply@d.com", "Team")
	sender.WithBaseURL(srv.URL)

	err := sender.SendOTP(context.Background(), "user@example.com", "User", "000000")
	if err == nil {
		t.Fatal("expected error for 400 response, got nil")
	}
}

func TestMSG91Sender_InterfaceCompliance(t *testing.T) {
	var _ OTPSender = &MSG91Sender{}
}
