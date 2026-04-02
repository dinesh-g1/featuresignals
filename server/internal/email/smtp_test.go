package email

import "testing"

func TestSender_InterfaceCompliance(t *testing.T) {
	var _ VerificationSender = &Sender{}
}

func TestNewSender(t *testing.T) {
	s := NewSender("smtp.example.com", 587, "user", "pass", "noreply@test.com")
	if s.host != "smtp.example.com" {
		t.Errorf("wrong host: %s", s.host)
	}
	if s.port != 587 {
		t.Errorf("wrong port: %d", s.port)
	}
	if s.user != "user" {
		t.Errorf("wrong user: %s", s.user)
	}
	if s.password != "pass" {
		t.Errorf("wrong password: %s", s.password)
	}
	if s.from != "noreply@test.com" {
		t.Errorf("wrong from: %s", s.from)
	}
}

func TestNewSender_EmptyAuth(t *testing.T) {
	s := NewSender("smtp.example.com", 25, "", "", "noreply@test.com")
	if s.user != "" {
		t.Errorf("expected empty user, got %s", s.user)
	}
}
