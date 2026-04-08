package zeptomail

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/mailer"
)

var tracer = otel.Tracer("featuresignals/zeptomail")

const (
	maxRetries    = 3
	baseBackoff   = 200 * time.Millisecond
	backoffFactor = 4
)

// Mailer implements domain.Mailer by rendering templates locally and
// delivering pre-rendered HTML via ZeptoMail's REST API.
type Mailer struct {
	renderer  *mailer.Renderer
	token     string
	fromEmail string
	fromName  string
	baseURL   string
	client    *http.Client
	logger    *slog.Logger
}

// NewMailer creates a ZeptoMail lifecycle mailer. It validates required
// fields and initialises the shared template renderer.
func NewMailer(token, fromEmail, fromName, baseURL string, logger *slog.Logger) (*Mailer, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("zeptomail: send mail token is required")
	}
	if fromEmail == "" {
		return nil, fmt.Errorf("zeptomail: from email is required")
	}
	if fromName == "" {
		fromName = "FeatureSignals"
	}
	if baseURL == "" {
		baseURL = "https://api.zeptomail.in"
	}
	renderer, err := mailer.NewRenderer()
	if err != nil {
		return nil, fmt.Errorf("zeptomail: %w", err)
	}
	return &Mailer{
		renderer:  renderer,
		token:     token,
		fromEmail: fromEmail,
		fromName:  fromName,
		baseURL:   baseURL,
		client:    &http.Client{Timeout: 15 * time.Second},
		logger:    logger.With("component", "zeptomail_mailer"),
	}, nil
}

func (m *Mailer) WithBaseURL(url string) *Mailer {
	m.baseURL = url
	return m
}

func (m *Mailer) WithHTTPClient(c *http.Client) *Mailer {
	m.client = c
	return m
}

func (m *Mailer) Send(ctx context.Context, msg domain.EmailMessage) error {
	ctx, span := tracer.Start(ctx, "zeptomail.Send",
		trace.WithAttributes(
			attribute.String("email.template", string(msg.Template)),
			attribute.String("email.to", msg.To),
		),
	)
	defer span.End()

	html, err := m.renderer.Render(msg)
	if err != nil {
		return fmt.Errorf("zeptomail render %s: %w", msg.Template, err)
	}

	envelope := sendEnvelope{
		to:       msg.To,
		toName:   msg.ToName,
		from:     m.resolveFrom(msg.FromEmail),
		fromName: m.resolveFromName(msg.FromName),
		replyTo:  msg.ReplyTo,
		subject:  msg.Subject,
		htmlBody: html,
		template: string(msg.Template),
	}
	return m.sendWithRetry(ctx, envelope)
}

func (m *Mailer) SendBatch(ctx context.Context, msgs []domain.EmailMessage) error {
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

func (m *Mailer) resolveFrom(override string) string {
	if override != "" {
		return override
	}
	return m.fromEmail
}

func (m *Mailer) resolveFromName(override string) string {
	if override != "" {
		return override
	}
	return m.fromName
}

type sendEnvelope struct {
	to, toName       string
	from, fromName   string
	replyTo          string
	subject, htmlBody string
	template         string
}

func (m *Mailer) sendWithRetry(ctx context.Context, env sendEnvelope) error {
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		start := time.Now()
		reqID, statusCode, err := m.doSend(ctx, env)
		elapsed := time.Since(start)

		if err == nil {
			m.logger.Info("email sent",
				"template", env.template,
				"to", env.to,
				"from", env.from,
				"request_id", reqID,
				"duration_ms", elapsed.Milliseconds(),
			)
			return nil
		}

		lastErr = err

		if statusCode >= 400 && statusCode < 500 {
			m.logger.Error("email send failed (non-retryable)",
				"template", env.template,
				"to", env.to,
				"status_code", statusCode,
				"error", err,
				"duration_ms", elapsed.Milliseconds(),
			)
			return err
		}

		if attempt < maxRetries {
			backoff := jitteredBackoff(attempt)
			m.logger.Warn("email send retrying",
				"template", env.template,
				"to", env.to,
				"attempt", attempt,
				"status_code", statusCode,
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

	m.logger.Error("email send failed after retries",
		"template", env.template,
		"to", env.to,
		"attempts", maxRetries,
		"error", lastErr,
	)
	return lastErr
}

type emailRequest struct {
	From       address     `json:"from"`
	To         []recipient `json:"to"`
	ReplyTo    *address    `json:"reply_to,omitempty"`
	Subject    string      `json:"subject"`
	HTMLBody   string      `json:"htmlbody"`
	TrackOpens bool        `json:"track_opens"`
}

type address struct {
	Address string `json:"address"`
	Name    string `json:"name,omitempty"`
}

type recipient struct {
	EmailAddress address `json:"email_address"`
}

type successResponse struct {
	RequestID string `json:"request_id"`
	Message   string `json:"message"`
}

type errorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
	RequestID string `json:"request_id"`
}

func (m *Mailer) doSend(ctx context.Context, env sendEnvelope) (requestID string, statusCode int, err error) {
	payload := emailRequest{
		From:       address{Address: env.from, Name: env.fromName},
		To:         []recipient{{EmailAddress: address{Address: env.to, Name: env.toName}}},
		Subject:    env.subject,
		HTMLBody:   env.htmlBody,
		TrackOpens: true,
	}
	if env.replyTo != "" {
		payload.ReplyTo = &address{Address: env.replyTo}
	}

	body, err := marshalJSON(payload)
	if err != nil {
		return "", 0, fmt.Errorf("zeptomail marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.baseURL+"/v1.1/email", bytes.NewReader(body))
	if err != nil {
		return "", 0, fmt.Errorf("zeptomail request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Zoho-enczapikey "+m.token)

	resp, err := m.client.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("zeptomail http: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		var sr successResponse
		_ = json.Unmarshal(respBody, &sr)
		return sr.RequestID, resp.StatusCode, nil
	}

	var er errorResponse
	_ = json.Unmarshal(respBody, &er)

	m.logger.Error("zeptomail api error",
		"status_code", resp.StatusCode,
		"raw_body", string(respBody),
		"request_body", string(body),
		"parsed_code", er.Error.Code,
		"parsed_message", er.Error.Message,
		"template", env.template,
		"to", env.to,
	)

	return er.RequestID, resp.StatusCode, fmt.Errorf("zeptomail %d: %s (code=%s)", resp.StatusCode, er.Error.Message, er.Error.Code)
}

// marshalJSON encodes v without escaping HTML characters (<, >, &) to
// unicode sequences. ZeptoMail expects htmlbody to contain literal HTML.
func marshalJSON(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	b := buf.Bytes()
	if len(b) > 0 && b[len(b)-1] == '\n' {
		b = b[:len(b)-1]
	}
	return b, nil
}

func jitteredBackoff(attempt int) time.Duration {
	backoff := baseBackoff
	for i := 1; i < attempt; i++ {
		backoff *= backoffFactor
	}
	jitter := time.Duration(rand.Int64N(int64(backoff) / 2))
	return backoff + jitter
}
