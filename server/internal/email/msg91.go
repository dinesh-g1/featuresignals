package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// MSG91Sender sends emails via MSG91's Email Send API using a pre-configured
// template. It implements OTPSender for signup OTP delivery.
type MSG91Sender struct {
	authKey    string
	templateID string
	domain     string
	fromEmail  string
	fromName   string
	client     *http.Client
	baseURL    string
}

// NewMSG91Sender creates a validated MSG91 email sender. Returns an error if
// any required configuration is missing (fail-fast per SRP).
func NewMSG91Sender(authKey, templateID, domain, fromEmail, fromName string) (*MSG91Sender, error) {
	if authKey == "" {
		return nil, fmt.Errorf("email: MSG91 auth key is required")
	}
	if templateID == "" {
		return nil, fmt.Errorf("email: MSG91 email template ID is required")
	}
	if domain == "" {
		return nil, fmt.Errorf("email: MSG91 email domain is required")
	}
	if fromEmail == "" {
		return nil, fmt.Errorf("email: MSG91 from email is required")
	}
	if fromName == "" {
		fromName = "Feature Signals"
	}
	return &MSG91Sender{
		authKey:    authKey,
		templateID: templateID,
		domain:     domain,
		fromEmail:  fromEmail,
		fromName:   fromName,
		client:     &http.Client{Timeout: 10 * time.Second},
		baseURL:    "https://api.msg91.com",
	}, nil
}

// WithBaseURL overrides the API base URL (useful for testing).
func (s *MSG91Sender) WithBaseURL(url string) *MSG91Sender {
	s.baseURL = url
	return s
}

// WithHTTPClient overrides the default HTTP client (useful for testing).
func (s *MSG91Sender) WithHTTPClient(c *http.Client) *MSG91Sender {
	s.client = c
	return s
}

type msg91EmailRequest struct {
	Recipients []msg91Recipient `json:"recipients"`
	From       msg91Address     `json:"from"`
	Domain     string           `json:"domain"`
	TemplateID string           `json:"template_id"`
}

type msg91Recipient struct {
	To        []msg91Address    `json:"to"`
	Variables map[string]string `json:"variables"`
}

type msg91Address struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// SendOTP delivers a 6-digit OTP to the given email address via the
// pre-configured MSG91 email template.
func (s *MSG91Sender) SendOTP(ctx context.Context, toEmail, toName, otp string) error {
	payload := msg91EmailRequest{
		Recipients: []msg91Recipient{
			{
				To:        []msg91Address{{Email: toEmail, Name: toName}},
				Variables: map[string]string{"otp": otp, "user_name": toName, "company_name": "Feature Signals"},
			},
		},
		From:       msg91Address{Email: s.fromEmail, Name: s.fromName},
		Domain:     s.domain,
		TemplateID: s.templateID,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("email: marshalling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/api/v5/email/send", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("email: creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("authkey", s.authKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("email: sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("email: MSG91 returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}
