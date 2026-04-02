package sms

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

type Client struct {
	authKey    string
	templateID string
	senderID   string
	httpClient *http.Client
	baseURL    string
}

func NewClient(authKey, templateID, senderID string) *Client {
	return &Client{
		authKey:    authKey,
		templateID: templateID,
		senderID:   senderID,
		httpClient: &http.Client{},
		baseURL:    "https://control.msg91.com",
	}
}

func (c *Client) WithBaseURL(url string) *Client {
	c.baseURL = url
	return c
}

// SendOTP sends a 6-digit OTP to the given phone number via MSG91's Send OTP API.
// MSG91 API: POST https://control.msg91.com/api/v5/otp
func (c *Client) SendOTP(phone, otp string) error {
	payload := map[string]interface{}{
		"template_id": c.templateID,
		"mobile":      phone,
		"otp":         otp,
		"sender":      c.senderID,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", c.baseURL+"/api/v5/otp", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("authkey", c.authKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("sending OTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		return fmt.Errorf("MSG91 error (status %d): %v", resp.StatusCode, result)
	}
	return nil
}
