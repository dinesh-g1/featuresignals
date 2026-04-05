package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type WebhookResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	HasSecret bool      `json:"has_secret"`
	Events    []string  `json:"events"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func WebhookFromDomain(w *domain.Webhook) *WebhookResponse {
	if w == nil {
		return nil
	}
	events := w.Events
	if events == nil {
		events = []string{}
	}
	return &WebhookResponse{
		ID:        w.ID,
		Name:      w.Name,
		URL:       w.URL,
		HasSecret: w.Secret != "",
		Events:    events,
		Enabled:   w.Enabled,
		CreatedAt: w.CreatedAt,
		UpdatedAt: w.UpdatedAt,
	}
}

func WebhookSliceFromDomain(ws []domain.Webhook) []WebhookResponse {
	out := make([]WebhookResponse, 0, len(ws))
	for i := range ws {
		out = append(out, *WebhookFromDomain(&ws[i]))
	}
	return out
}

type WebhookDeliveryResponse struct {
	ID             string    `json:"id"`
	EventType      string    `json:"event_type"`
	ResponseStatus int       `json:"response_status"`
	Success        bool      `json:"success"`
	DeliveredAt    time.Time `json:"delivered_at"`
}

func WebhookDeliveryFromDomain(d *domain.WebhookDelivery) *WebhookDeliveryResponse {
	if d == nil {
		return nil
	}
	return &WebhookDeliveryResponse{
		ID:             d.ID,
		EventType:      d.EventType,
		ResponseStatus: d.ResponseStatus,
		Success:        d.Success,
		DeliveredAt:    d.DeliveredAt,
	}
}

func WebhookDeliverySliceFromDomain(ds []domain.WebhookDelivery) []WebhookDeliveryResponse {
	out := make([]WebhookDeliveryResponse, 0, len(ds))
	for i := range ds {
		out = append(out, *WebhookDeliveryFromDomain(&ds[i]))
	}
	return out
}
