package dto

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestWebhookFromDomain_MasksSecret(t *testing.T) {
	wh := &domain.Webhook{
		ID:      "wh-1",
		OrgID:   "org-1",
		Name:    "Deploy Hook",
		URL:     "https://example.com/hook",
		Secret:  "super-secret-value",
		Events:  []string{"flag.updated"},
		Enabled: true,
	}

	resp := WebhookFromDomain(wh)

	if !resp.HasSecret {
		t.Error("expected has_secret=true when secret is set")
	}

	b, _ := json.Marshal(resp)
	s := string(b)

	if strings.Contains(s, "super-secret-value") {
		t.Errorf("response must not contain raw secret, got: %s", s)
	}
	if strings.Contains(s, "org_id") {
		t.Errorf("response must not contain org_id, got: %s", s)
	}
	if !strings.Contains(s, `"has_secret":true`) {
		t.Errorf("expected has_secret field, got: %s", s)
	}
}

func TestWebhookFromDomain_NoSecret(t *testing.T) {
	wh := &domain.Webhook{ID: "wh-2", Name: "No Secret Hook", URL: "https://example.com"}
	resp := WebhookFromDomain(wh)

	if resp.HasSecret {
		t.Error("expected has_secret=false when secret is empty")
	}
}

func TestWebhookFromDomain_Nil(t *testing.T) {
	if resp := WebhookFromDomain(nil); resp != nil {
		t.Errorf("expected nil for nil input, got %+v", resp)
	}
}

func TestWebhookSliceFromDomain_Empty(t *testing.T) {
	result := WebhookSliceFromDomain([]domain.Webhook{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}

func TestWebhookDeliveryFromDomain_StripsPayload(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	d := &domain.WebhookDelivery{
		ID:             "del-1",
		WebhookID:      "wh-1",
		EventType:      "flag.updated",
		Payload:        []byte(`{"sensitive":"data"}`),
		ResponseStatus: 200,
		ResponseBody:   "OK",
		DeliveredAt:    now,
		Success:        true,
	}

	resp := WebhookDeliveryFromDomain(d)
	b, _ := json.Marshal(resp)
	s := string(b)

	forbidden := []string{"webhook_id", "payload", "response_body"}
	for _, f := range forbidden {
		if strings.Contains(s, f) {
			t.Errorf("response must not contain %q, got: %s", f, s)
		}
	}

	if resp.ID != "del-1" || resp.EventType != "flag.updated" || resp.ResponseStatus != 200 {
		t.Errorf("unexpected values: %+v", resp)
	}
}

func TestWebhookDeliverySliceFromDomain_Empty(t *testing.T) {
	result := WebhookDeliverySliceFromDomain([]domain.WebhookDelivery{})
	if result == nil {
		t.Fatal("expected non-nil empty slice")
	}
	if len(result) != 0 {
		t.Errorf("expected 0 items, got %d", len(result))
	}
}
