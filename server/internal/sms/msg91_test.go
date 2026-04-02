package sms

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClient_InterfaceCompliance(t *testing.T) {
	var _ Sender = &Client{}
}

func TestClient_SendOTP_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/v5/otp" {
			t.Errorf("wrong path: %s", r.URL.Path)
		}
		if r.Header.Get("authkey") != "test-key" {
			t.Error("missing auth key header")
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Error("wrong content type")
		}
		var body map[string]interface{}
		json.NewDecoder(r.Body).Decode(&body)
		if body["mobile"] != "+919876543210" {
			t.Errorf("wrong phone: %v", body["mobile"])
		}
		if body["otp"] != "123456" {
			t.Errorf("wrong otp: %v", body["otp"])
		}
		if body["template_id"] != "tpl" {
			t.Errorf("wrong template: %v", body["template_id"])
		}
		if body["sender"] != "SND" {
			t.Errorf("wrong sender: %v", body["sender"])
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient("test-key", "tpl", "SND").WithBaseURL(server.URL)
	err := client.SendOTP("+919876543210", "123456")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestClient_SendOTP_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
		w.Write([]byte(`{"error":"internal"}`))
	}))
	defer server.Close()

	client := NewClient("key", "tpl", "SND").WithBaseURL(server.URL)
	err := client.SendOTP("+919876543210", "123456")
	if err == nil {
		t.Error("expected error for 500 status")
	}
}

func TestClient_SendOTP_ConnectionError(t *testing.T) {
	client := NewClient("key", "tpl", "SND").WithBaseURL("http://127.0.0.1:1")
	err := client.SendOTP("+919876543210", "123456")
	if err == nil {
		t.Error("expected error for unreachable server")
	}
}

func TestNewClient_Defaults(t *testing.T) {
	c := NewClient("ak", "tid", "sid")
	if c.authKey != "ak" {
		t.Errorf("wrong authKey: %s", c.authKey)
	}
	if c.templateID != "tid" {
		t.Errorf("wrong templateID: %s", c.templateID)
	}
	if c.senderID != "sid" {
		t.Errorf("wrong senderID: %s", c.senderID)
	}
	if c.baseURL != "https://control.msg91.com" {
		t.Errorf("wrong default baseURL: %s", c.baseURL)
	}
	if c.httpClient == nil {
		t.Error("httpClient should not be nil")
	}
}

func TestClient_WithBaseURL(t *testing.T) {
	c := NewClient("ak", "tid", "sid").WithBaseURL("http://custom.example.com")
	if c.baseURL != "http://custom.example.com" {
		t.Errorf("WithBaseURL did not set correctly: %s", c.baseURL)
	}
}
