package webhook

import (
	"context"
	"time"
)

// OrgResolver looks up the organization ID that owns a given environment.
type OrgResolver interface {
	ResolveOrgIDByEnvID(ctx context.Context, envID string) (string, error)
}

// Notifier adapts the Dispatcher to the cache.WebhookNotifier interface.
// It resolves the orgID for each environment so webhooks are dispatched
// to the correct tenant.
type Notifier struct {
	dispatcher  *Dispatcher
	orgResolver OrgResolver
}

// NewNotifier creates a WebhookNotifier backed by the given dispatcher.
func NewNotifier(d *Dispatcher, resolver OrgResolver) *Notifier {
	return &Notifier{dispatcher: d, orgResolver: resolver}
}

// NotifyFlagChange enqueues a webhook event for the given flag change.
func (n *Notifier) NotifyFlagChange(envID, flagID, action string) {
	orgID := ""
	if n.orgResolver != nil {
		resolved, err := n.orgResolver.ResolveOrgIDByEnvID(context.Background(), envID)
		if err == nil {
			orgID = resolved
		}
	}

	eventType := "flag." + action
	n.dispatcher.Enqueue(Event{
		Type:   eventType,
		EnvID:  envID,
		FlagID: flagID,
		Action: action,
		OrgID:  orgID,
		SentAt: time.Now(),
	})
}
