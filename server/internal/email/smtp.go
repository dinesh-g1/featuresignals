package email

import (
	"context"
	"fmt"
	"net/smtp"
)

type SMTPSender struct {
	host     string
	port     int
	user     string
	pass     string
	from     string
	fromName string
}

func NewSMTPSender(host string, port int, user, pass, from, fromName string) *SMTPSender {
	return &SMTPSender{
		host:     host,
		port:     port,
		user:     user,
		pass:     pass,
		from:     from,
		fromName: fromName,
	}
}

func (s *SMTPSender) SendOTP(_ context.Context, toEmail, toName, otp string) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)

	subject := "Your FeatureSignals verification code"
	body := fmt.Sprintf(
		"Hi %s,\n\nYour verification code is: %s\n\nThis code expires in 10 minutes.\n\n— FeatureSignals",
		toName, otp,
	)

	msg := fmt.Sprintf(
		"From: %s <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s",
		s.fromName, s.from, toEmail, subject, body,
	)

	var auth smtp.Auth
	if s.user != "" {
		auth = smtp.PlainAuth("", s.user, s.pass, s.host)
	}

	return smtp.SendMail(addr, auth, s.from, []string{toEmail}, []byte(msg))
}
