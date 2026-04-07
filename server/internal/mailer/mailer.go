package mailer

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"html/template"
	"log/slog"
	"net/smtp"
	"strings"

	"github.com/featuresignals/server/internal/domain"
)

//go:embed templates/*.html
var templateFS embed.FS

// SMTPMailer renders lifecycle email templates and delivers them via SMTP.
type SMTPMailer struct {
	host     string
	port     int
	user     string
	pass     string
	from     string
	fromName string
	logger   *slog.Logger
	tmpl     *template.Template
}

// NewSMTPMailer creates a mailer that renders embedded HTML templates and
// sends them through the configured SMTP relay.
func NewSMTPMailer(host string, port int, user, pass, from, fromName string, logger *slog.Logger) (*SMTPMailer, error) {
	tmpl, err := template.ParseFS(templateFS, "templates/*.html")
	if err != nil {
		return nil, fmt.Errorf("parse email templates: %w", err)
	}
	return &SMTPMailer{
		host:     host,
		port:     port,
		user:     user,
		pass:     pass,
		from:     from,
		fromName: fromName,
		logger:   logger.With("component", "smtp_mailer"),
		tmpl:     tmpl,
	}, nil
}

func (m *SMTPMailer) Send(ctx context.Context, msg domain.EmailMessage) error {
	html, err := m.render(msg)
	if err != nil {
		return fmt.Errorf("render template %s: %w", msg.Template, err)
	}

	raw := m.buildMIME(msg.To, msg.Subject, html)

	addr := fmt.Sprintf("%s:%d", m.host, m.port)
	var auth smtp.Auth
	if m.user != "" {
		auth = smtp.PlainAuth("", m.user, m.pass, m.host)
	}

	if err := smtp.SendMail(addr, auth, m.from, []string{msg.To}, []byte(raw)); err != nil {
		m.logger.Error("smtp send failed",
			"template", msg.Template,
			"to", msg.To,
			"error", err,
		)
		return fmt.Errorf("smtp send: %w", err)
	}

	m.logger.Info("email sent", "template", string(msg.Template), "to", msg.To)
	return nil
}

func (m *SMTPMailer) SendBatch(ctx context.Context, msgs []domain.EmailMessage) error {
	var firstErr error
	for _, msg := range msgs {
		if err := m.Send(ctx, msg); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (m *SMTPMailer) render(msg domain.EmailMessage) (string, error) {
	templateName := string(msg.Template) + ".html"

	data := make(map[string]string, len(msg.Data)+2)
	for k, v := range msg.Data {
		data[k] = v
	}
	data["Subject"] = msg.Subject
	data["ToName"] = msg.ToName

	var buf bytes.Buffer
	if err := m.tmpl.ExecuteTemplate(&buf, templateName, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func (m *SMTPMailer) buildMIME(to, subject, htmlBody string) string {
	var b strings.Builder
	b.WriteString(fmt.Sprintf("From: %s <%s>\r\n", m.fromName, m.from))
	b.WriteString(fmt.Sprintf("To: %s\r\n", to))
	b.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	b.WriteString("List-Unsubscribe: <{{.UnsubscribeURL}}>\r\n")
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
