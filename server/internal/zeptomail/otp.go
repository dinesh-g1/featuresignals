package zeptomail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/featuresignals/server/internal/mailer"
	"github.com/featuresignals/server/internal/retry"
)

// OTPSender implements domain.OTPSender by sending a pre-rendered HTML OTP
// email through ZeptoMail's REST API (no provider-side template needed).
type OTPSender struct {
	token     string
	fromEmail string
	fromName  string
	baseURL   string
	client    *http.Client
	logger    *slog.Logger
	renderer  *mailer.Renderer
}

// NewOTPSender creates a ZeptoMail OTP email sender.
func NewOTPSender(token, fromEmail, fromName, baseURL, appURL string, logger *slog.Logger) (*OTPSender, error) {
	token = sanitizeToken(token)
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
	renderer, err := mailer.NewRenderer(appURL)
	if err != nil {
		return nil, fmt.Errorf("zeptomail: init renderer: %w", err)
	}
	return &OTPSender{
		token:     token,
		fromEmail: fromEmail,
		fromName:  fromName,
		baseURL:   baseURL,
		client:    &http.Client{Timeout: 15 * time.Second},
		logger:    logger.With("component", "zeptomail_otp"),
		renderer:  renderer,
	}, nil
}

func (s *OTPSender) WithBaseURL(url string) *OTPSender {
	s.baseURL = url
	return s
}

func (s *OTPSender) WithHTTPClient(c *http.Client) *OTPSender {
	s.client = c
	return s
}

func (s *OTPSender) SendOTP(ctx context.Context, toEmail, toName, otp string) error {
	ctx, span := tracer.Start(ctx, "zeptomail.SendOTP",
		trace.WithAttributes(attribute.String("provider", "zeptomail")),
	)
	defer span.End()

	html, err := s.renderer.RenderOTPSignup(toName, otp)
	if err != nil {
		return fmt.Errorf("zeptomail render OTP: %w", err)
	}
	subject := "Your FeatureSignals verification code"

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		start := time.Now()
		reqID, statusCode, err := s.doSend(ctx, toEmail, toName, subject, html)
		elapsed := time.Since(start)

		if err == nil {
			s.logger.Info("otp email sent",
				"to", toEmail,
				"request_id", reqID,
				"duration_ms", elapsed.Milliseconds(),
			)
			return nil
		}

		lastErr = err

		if statusCode >= 400 && statusCode < 500 {
			s.logger.Error("otp email failed (non-retryable)",
				"to", toEmail,
				"status_code", statusCode,
				"error", err,
			)
			return err
		}

		if attempt < maxRetries {
			backoff := retry.JitteredBackoff(attempt, retry.DefaultBase, retry.DefaultFactor, retry.DefaultCap)
			s.logger.Warn("otp email retrying",
				"to", toEmail,
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

	s.logger.Error("otp email failed after retries",
		"to", toEmail,
		"attempts", maxRetries,
		"error", lastErr,
	)
	return lastErr
}

// SendPasswordResetOTP sends a password reset OTP email.
func (s *OTPSender) SendPasswordResetOTP(ctx context.Context, toEmail, toName, otp string) error {
	ctx, span := tracer.Start(ctx, "zeptomail.SendPasswordResetOTP",
		trace.WithAttributes(attribute.String("provider", "zeptomail")),
	)
	defer span.End()

	html, err := s.renderer.RenderOTPPasswordReset(toName, otp)
	if err != nil {
		return fmt.Errorf("zeptomail render password reset: %w", err)
	}
	subject := "Your FeatureSignals password reset code"

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		start := time.Now()
		reqID, statusCode, err := s.doSend(ctx, toEmail, toName, subject, html)
		elapsed := time.Since(start)

		if err == nil {
			s.logger.Info("password reset email sent",
				"to", toEmail,
				"request_id", reqID,
				"duration_ms", elapsed.Milliseconds(),
			)
			return nil
		}

		lastErr = err

		if statusCode >= 400 && statusCode < 500 {
			s.logger.Error("password reset email failed (non-retryable)",
				"to", toEmail,
				"status_code", statusCode,
				"error", err,
			)
			return err
		}

		if attempt < maxRetries {
			backoff := retry.JitteredBackoff(attempt, retry.DefaultBase, retry.DefaultFactor, retry.DefaultCap)
			s.logger.Warn("password reset email retrying",
				"to", toEmail,
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

	s.logger.Error("password reset email failed after retries",
		"to", toEmail,
		"attempts", maxRetries,
		"error", lastErr,
	)
	return lastErr
}

func (s *OTPSender) doSend(ctx context.Context, to, toName, subject, html string) (requestID string, statusCode int, err error) {
	payload := emailRequest{
		From:     address{Address: s.fromEmail, Name: s.fromName},
		To:       []recipient{{EmailAddress: address{Address: to, Name: toName}}},
		Subject:  subject,
		HTMLBody: html,
	}

	body, err := marshalJSON(payload)
	if err != nil {
		return "", 0, fmt.Errorf("zeptomail marshal: %w", err)
	}

	// Ensure a timeout for the outbound HTTP call
	reqCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, s.baseURL+"/v1.1/email", bytes.NewReader(body))
	if err != nil {
		return "", 0, fmt.Errorf("zeptomail request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Zoho-enczapikey "+s.token)

	resp, err := s.client.Do(req)
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

	s.logger.Error("zeptomail api error",
		"status_code", resp.StatusCode,
		"raw_body", string(respBody),
		"parsed_code", er.Error.Code,
		"parsed_message", er.Error.Message,
		"to", to,
	)

	return er.RequestID, resp.StatusCode, fmt.Errorf("zeptomail %d: %s (code=%s)", resp.StatusCode, er.Error.Message, er.Error.Code)
}
