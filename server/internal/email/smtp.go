package email

import (
	"fmt"
	"net/smtp"
)

type Sender struct {
	host     string
	port     int
	user     string
	password string
	from     string
}

func NewSender(host string, port int, user, password, from string) *Sender {
	return &Sender{host: host, port: port, user: user, password: password, from: from}
}

func (s *Sender) SendVerificationEmail(toEmail, token, baseURL string) error {
	verifyURL := fmt.Sprintf("%s/v1/auth/verify-email?token=%s", baseURL, token)

	subject := "Verify your FeatureSignals email"
	body := fmt.Sprintf(`Hi,

Welcome to FeatureSignals! Please verify your email address by clicking the link below:

%s

This link expires in 24 hours.

If you didn't create a FeatureSignals account, you can safely ignore this email.

— FeatureSignals Team`, verifyURL)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		s.from, toEmail, subject, body)

	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	var auth smtp.Auth
	if s.user != "" {
		auth = smtp.PlainAuth("", s.user, s.password, s.host)
	}
	return smtp.SendMail(addr, auth, s.from, []string{toEmail}, []byte(msg))
}
