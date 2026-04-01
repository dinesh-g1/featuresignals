package webhook

import "time"

// Notifier adapts the Dispatcher to the cache.WebhookNotifier interface.
// It maps PG NOTIFY flag-change payloads to webhook events. The orgID
// is looked up via the environment; for simplicity we broadcast with
// a wildcard orgID and let the dispatcher filter per-org webhooks.
type Notifier struct {
	dispatcher *Dispatcher
	orgID      string
}

// NewNotifier creates a WebhookNotifier backed by the given dispatcher.
// orgID should be set once the server knows the operating org (or left
// empty for multi-tenant — in that case the dispatcher resolves per-env).
func NewNotifier(d *Dispatcher, orgID string) *Notifier {
	return &Notifier{dispatcher: d, orgID: orgID}
}

// NotifyFlagChange enqueues a webhook event for the given flag change.
func (n *Notifier) NotifyFlagChange(envID, flagID, action string) {
	eventType := "flag." + action
	n.dispatcher.Enqueue(Event{
		Type:   eventType,
		EnvID:  envID,
		FlagID: flagID,
		Action: action,
		OrgID:  n.orgID,
		SentAt: time.Now(),
	})
}
