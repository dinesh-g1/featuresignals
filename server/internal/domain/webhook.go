package domain

import "time"

// Webhook stores a registered HTTP callback endpoint.
// When flag change events match the Events filter, the dispatcher
// POSTs a JSON payload to URL with an HMAC-SHA256 signature header.
type Webhook struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	Name      string    `json:"name" db:"name"`
	URL       string    `json:"url" db:"url"`
	Secret    string    `json:"secret,omitempty" db:"secret"`
	Events    []string  `json:"events" db:"events"`
	Enabled   bool      `json:"enabled" db:"enabled"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// WebhookDelivery records a single attempt to deliver an event to a webhook.
type WebhookDelivery struct {
	ID             string    `json:"id" db:"id"`
	WebhookID      string    `json:"webhook_id" db:"webhook_id"`
	EventType      string    `json:"event_type" db:"event_type"`
	Payload        []byte    `json:"payload" db:"payload"`
	ResponseStatus int       `json:"response_status" db:"response_status"`
	ResponseBody   string    `json:"response_body" db:"response_body"`
	DeliveredAt    time.Time `json:"delivered_at" db:"delivered_at"`
	Success        bool      `json:"success" db:"success"`
}
