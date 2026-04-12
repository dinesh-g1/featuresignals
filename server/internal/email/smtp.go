package email

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/mailer"
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
	renderer *mailer.Renderer
}

func NewSMTPSender(host string, port int, user, pass, from, fromName, appURL string, logger *slog.Logger) (*SMTPSender, error) {
	renderer, err := mailer.NewRenderer(appURL)
	if err != nil {
		return nil, fmt.Errorf("smtp mailer: init renderer: %w", err)
	}
	return &SMTPSender{
		host:     host,
		port:     port,
		user:     user,
		pass:     pass,
		from:     from,
		fromName: fromName,
		logger:   logger.With("component", "smtp_otp"),
		renderer: renderer,
	}, nil
}

func (s *SMTPSender) SendOTP(ctx context.Context, toEmail, toName, otp string) error {
	subject := "Your FeatureSignals verification code"
	htmlBody, err := s.renderer.RenderOTPSignup(toName, otp)
	if err != nil {
		return fmt.Errorf("smtp render OTP: %w", err)
	}
	plainBody := fmt.Sprintf(
		"Hi %s,\n\nYour verification code is: %s\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can safely ignore this email.\n\n— FeatureSignals\nhttps://featuresignals.com",
		toName, otp,
	)

	msg := s.buildMIMEMessage(toEmail, toName, subject, plainBody, htmlBody)

	return s.sendWithRetry(ctx, toEmail, []byte(msg), "otp")
}

func (s *SMTPSender) SendPasswordResetOTP(ctx context.Context, toEmail, toName, otp string) error {
	subject := "Your FeatureSignals password reset code"
	htmlBody, err := s.renderer.RenderOTPPasswordReset(toName, otp)
	if err != nil {
		return fmt.Errorf("smtp render password reset: %w", err)
	}
	plainBody := fmt.Sprintf(
		"Hi %s,\n\nYour password reset code is: %s\n\nThis code expires in 15 minutes. If you did not request this, you can safely ignore this email.\n\n— FeatureSignals\nhttps://featuresignals.com/reset-password",
		toName, otp,
	)

	msg := s.buildMIMEMessage(toEmail, toName, subject, plainBody, htmlBody)

	return s.sendWithRetry(ctx, toEmail, []byte(msg), "password reset")
}

// buildMIMEMessage creates a multipart MIME email with both plain text and HTML parts.
func (s *SMTPSender) buildMIMEMessage(to, toName, subject, plainBody, htmlBody string) string {
	boundary := "=_feature_signals_boundary_2024"

	var buf strings.Builder
	buf.WriteString(fmt.Sprintf("From: %s <%s>\r\n", s.fromName, s.from))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", to))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary))
	buf.WriteString("\r\n")

	// Plain text part
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")
	buf.WriteString(plainBody)
	buf.WriteString("\r\n\r\n")

	// HTML part
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")
	buf.WriteString(htmlBody)
	buf.WriteString("\r\n\r\n")

	// End boundary
	buf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	return buf.String()
}

func (s *SMTPSender) sendWithRetry(ctx context.Context, to string, msg []byte, label string) error {
	var lastErr error
	for attempt := 1; attempt <= otpMaxRetries; attempt++ {
		start := time.Now()
		err := s.dialAndSend(ctx, to, msg)
		elapsed := time.Since(start)

		if err == nil {
			s.logger.Info(label+" email sent",
				"to", to,
				"duration_ms", elapsed.Milliseconds(),
			)
			return nil
		}

		lastErr = err

		if attempt < otpMaxRetries {
			backoff := retry.JitteredBackoff(attempt, retry.DefaultBase, retry.DefaultFactor, retry.DefaultCap)
			s.logger.Warn(label+" email retrying",
				"to", to,
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

	s.logger.Error(label+" email failed after retries",
		"to", to,
		"attempts", otpMaxRetries,
		"error", lastErr,
	)
	return fmt.Errorf("smtp %s send: %w", label, lastErr)
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
