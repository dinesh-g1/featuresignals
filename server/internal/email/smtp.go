package email

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"time"

	"github.com/featuresignals/server/internal/retry"
)

const (
	otpMaxRetries  = 3
	otpDialTimeout = 10 * time.Second
)

type SMTPSender struct {
	host     string
	port     int
	user     string
	pass     string
	from     string
	fromName string
	logger   *slog.Logger
}

func NewSMTPSender(host string, port int, user, pass, from, fromName string, logger *slog.Logger) *SMTPSender {
	return &SMTPSender{
		host:     host,
		port:     port,
		user:     user,
		pass:     pass,
		from:     from,
		fromName: fromName,
		logger:   logger.With("component", "smtp_otp"),
	}
}

func (s *SMTPSender) SendOTP(ctx context.Context, toEmail, toName, otp string) error {
	subject := "Your FeatureSignals verification code"
	body := fmt.Sprintf(
		"Hi %s,\n\nYour verification code is: %s\n\nThis code expires in 10 minutes.\n\n— FeatureSignals",
		toName, otp,
	)

	msg := fmt.Sprintf(
		"From: %s <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s",
		s.fromName, s.from, toEmail, subject, body,
	)

	var lastErr error
	for attempt := 1; attempt <= otpMaxRetries; attempt++ {
		start := time.Now()
		err := s.dialAndSend(ctx, toEmail, []byte(msg))
		elapsed := time.Since(start)

		if err == nil {
			s.logger.Info("otp email sent",
				"to", toEmail,
				"duration_ms", elapsed.Milliseconds(),
			)
			return nil
		}

		lastErr = err

		if attempt < otpMaxRetries {
			backoff := retry.JitteredBackoff(attempt, retry.DefaultBase, retry.DefaultFactor, retry.DefaultCap)
			s.logger.Warn("otp email retrying",
				"to", toEmail,
				"attempt", attempt,
				"error", err,
				"backoff_ms", backoff.Milliseconds(),
			)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}
	}

	s.logger.Error("otp email failed after retries",
		"to", toEmail,
		"attempts", otpMaxRetries,
		"error", lastErr,
	)
	return fmt.Errorf("smtp otp send: %w", lastErr)
}

func (s *SMTPSender) dialAndSend(ctx context.Context, to string, msg []byte) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)

	dialer := &net.Dialer{Timeout: otpDialTimeout}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}

	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if s.user != "" {
		if err := client.Auth(smtp.PlainAuth("", s.user, s.pass, s.host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := client.Mail(s.from); err != nil {
		return fmt.Errorf("smtp mail: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp data close: %w", err)
	}

	return client.Quit()
}
