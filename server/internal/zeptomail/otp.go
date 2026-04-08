package zeptomail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// OTPSender implements email.OTPSender by sending a pre-rendered HTML OTP
// email through ZeptoMail's REST API (no provider-side template needed).
type OTPSender struct {
	token     string
	fromEmail string
	fromName  string
	baseURL   string
	client    *http.Client
	logger    *slog.Logger
}

// NewOTPSender creates a ZeptoMail OTP email sender.
func NewOTPSender(token, fromEmail, fromName, baseURL string, logger *slog.Logger) (*OTPSender, error) {
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
	return &OTPSender{
		token:     token,
		fromEmail: fromEmail,
		fromName:  fromName,
		baseURL:   baseURL,
		client:    &http.Client{Timeout: 15 * time.Second},
		logger:    logger.With("component", "zeptomail_otp"),
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

	html := renderOTPHTML(toName, otp)
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
			backoff := jitteredBackoff(attempt)
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

func (s *OTPSender) doSend(ctx context.Context, to, toName, subject, html string) (requestID string, statusCode int, err error) {
	payload := emailRequest{
		From:     address{Address: s.fromEmail, Name: s.fromName},
		To:       []recipient{{EmailAddress: address{Address: to, Name: toName}}},
		Subject:  subject,
		HTMLBody: html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", 0, fmt.Errorf("zeptomail marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/v1.1/email", bytes.NewReader(body))
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
		"request_body", string(body),
		"parsed_code", er.Error.Code,
		"parsed_message", er.Error.Message,
	)

	return er.RequestID, resp.StatusCode, fmt.Errorf("zeptomail %d: %s (code=%s)", resp.StatusCode, er.Error.Message, er.Error.Code)
}

func renderOTPHTML(name, otp string) string {
	if name == "" {
		name = "there"
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verification Code</title>
<style>
  body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #ffffff; border-radius: 8px; padding: 40px 32px; border: 1px solid #e2e8f0; }
  .logo { color: #4f46e5; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 24px; }
  h1 { color: #0f172a; font-size: 22px; font-weight: 600; margin: 0 0 12px; }
  p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .otp-box { background: #eef2ff; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
  .otp-code { font-size: 32px; font-weight: 700; color: #4f46e5; letter-spacing: 0.15em; }
  .footer { text-align: center; padding: 24px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="logo">FeatureSignals</div>
    <h1>Verify your email</h1>
    <p>Hi %s,</p>
    <p>Enter this code to complete your signup:</p>
    <div class="otp-box">
      <span class="otp-code">%s</span>
    </div>
    <p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>FeatureSignals &middot; Vivekananda Technology Labs</p>
  </div>
</div>
</body>
</html>`, name, otp)
}
