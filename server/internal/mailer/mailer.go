package mailer

import (
	"bytes"
	"context"
	"embed"
	"errors"
	"fmt"
	"html/template"
	"log/slog"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/retry"
)

//go:embed templates/*.html
var templateFS embed.FS

// Renderer handles template parsing and rendering for email HTML bodies.
// It is shared between SMTPMailer and external transport implementations
// (e.g., ZeptoMail) so templates are defined once and rendered consistently.
type Renderer struct {
	tmpl *template.Template
}

// NewRenderer parses the embedded HTML templates and returns a reusable
// renderer. Returns an error if any template fails to parse.
func NewRenderer() (*Renderer, error) {
	tmpl, err := template.ParseFS(templateFS, "templates/*.html")
	if err != nil {
		return nil, fmt.Errorf("parse email templates: %w", err)
	}
	return &Renderer{tmpl: tmpl}, nil
}

// Render executes the template identified by msg.Template and returns the
// resulting HTML string. Subject and ToName are injected as additional
// template variables alongside msg.Data.
func (r *Renderer) Render(msg domain.EmailMessage) (string, error) {
	templateName := string(msg.Template) + ".html"

	data := make(map[string]string, len(msg.Data)+2)
	for k, v := range msg.Data {
		data[k] = v
	}
	data["Subject"] = msg.Subject
	data["ToName"] = msg.ToName

	var buf bytes.Buffer
	if err := r.tmpl.ExecuteTemplate(&buf, templateName, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// SMTPMailer renders lifecycle email templates and delivers them via SMTP.
type SMTPMailer struct {
	renderer *Renderer
	host     string
	port     int
	user     string
	pass     string
	from     string
	fromName string
	logger   *slog.Logger
}

// NewSMTPMailer creates a mailer that renders embedded HTML templates and
// sends them through the configured SMTP relay.
func NewSMTPMailer(host string, port int, user, pass, from, fromName string, logger *slog.Logger) (*SMTPMailer, error) {
	renderer, err := NewRenderer()
	if err != nil {
		return nil, err
	}
	return &SMTPMailer{
		renderer: renderer,
		host:     host,
		port:     port,
		user:     user,
		pass:     pass,
		from:     from,
		fromName: fromName,
		logger:   logger.With("component", "smtp_mailer"),
	}, nil
}

const (
	smtpMaxRetries = 3
	smtpDialTimeout = 10 * time.Second
)

func (m *SMTPMailer) Send(ctx context.Context, msg domain.EmailMessage) error {
	html, err := m.renderer.Render(msg)
	if err != nil {
		return fmt.Errorf("render template %s: %w", msg.Template, err)
	}

	fromEmail := m.from
	if msg.FromEmail != "" {
		fromEmail = msg.FromEmail
	}
	fromName := m.fromName
	if msg.FromName != "" {
		fromName = msg.FromName
	}

	unsubscribeURL := msg.Data["UnsubscribeURL"]
	raw := m.buildMIME(fromName, fromEmail, msg.To, msg.Subject, html, unsubscribeURL, msg.ReplyTo)

	var lastErr error
	for attempt := 1; attempt <= smtpMaxRetries; attempt++ {
		start := time.Now()
		err := m.dialAndSend(ctx, fromEmail, msg.To, []byte(raw))
		elapsed := time.Since(start)

		if err == nil {
			m.logger.Info("email sent",
				"template", string(msg.Template),
				"to", msg.To,
				"from", fromEmail,
				"duration_ms", elapsed.Milliseconds(),
			)
			return nil
		}

		lastErr = err

		if attempt < smtpMaxRetries {
			backoff := retry.JitteredBackoff(attempt, retry.DefaultBase, retry.DefaultFactor, retry.DefaultCap)
			m.logger.Warn("smtp send retrying",
				"template", string(msg.Template),
				"to", msg.To,
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

	m.logger.Error("smtp send failed after retries",
		"template", string(msg.Template),
		"to", msg.To,
		"from", fromEmail,
		"attempts", smtpMaxRetries,
		"error", lastErr,
	)
	return fmt.Errorf("smtp send: %w", lastErr)
}

func (m *SMTPMailer) dialAndSend(ctx context.Context, from, to string, msg []byte) error {
	addr := fmt.Sprintf("%s:%d", m.host, m.port)

	dialer := &net.Dialer{Timeout: smtpDialTimeout}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}

	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if m.user != "" {
		if err := client.Auth(smtp.PlainAuth("", m.user, m.pass, m.host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := client.Mail(from); err != nil {
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

func (m *SMTPMailer) SendBatch(ctx context.Context, msgs []domain.EmailMessage) error {
	var errs []error
	for _, msg := range msgs {
		if err := m.Send(ctx, msg); err != nil {
			m.logger.Error("batch send failed for recipient",
				"template", string(msg.Template),
				"to", msg.To,
				"error", err,
			)
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}

// Render exposes template rendering for callers that need the HTML without
// SMTP delivery (e.g., ZeptoMail transport). Delegates to the shared Renderer.
func (m *SMTPMailer) Render(msg domain.EmailMessage) (string, error) {
	return m.renderer.Render(msg)
}

func (m *SMTPMailer) buildMIME(fromName, fromEmail, to, subject, htmlBody, unsubscribeURL, replyTo string) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("From: %s <%s>\r\n", fromName, fromEmail))
	b.WriteString(fmt.Sprintf("To: %s\r\n", to))
	b.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	if replyTo != "" {
		b.WriteString(fmt.Sprintf("Reply-To: %s\r\n", replyTo))
	}
	if unsubscribeURL != "" {
		b.WriteString(fmt.Sprintf("List-Unsubscribe: <%s>\r\n", unsubscribeURL))
	}
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return b.String()
}

// NoopMailer logs emails without sending them — used for development and
// self-hosted deployments that haven't configured SMTP.
type NoopMailer struct {
	logger *slog.Logger
}

func NewNoopMailer(logger *slog.Logger) *NoopMailer {
	return &NoopMailer{logger: logger.With("component", "noop_mailer")}
}

func (m *NoopMailer) Send(_ context.Context, msg domain.EmailMessage) error {
	m.logger.Info("email suppressed (noop mailer)",
		"template", string(msg.Template),
		"to", msg.To,
		"subject", msg.Subject,
	)
	return nil
}

func (m *NoopMailer) SendBatch(_ context.Context, msgs []domain.EmailMessage) error {
	for _, msg := range msgs {
		m.logger.Info("email suppressed (noop mailer)",
			"template", string(msg.Template),
			"to", msg.To,
			"subject", msg.Subject,
		)
	}
	return nil
}
