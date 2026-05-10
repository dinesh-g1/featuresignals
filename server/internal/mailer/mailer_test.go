package mailer

import (
	"context"
	"log/slog"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestNoopMailer_Send(t *testing.T) {
	m := NewNoopMailer(slog.Default())

	err := m.Send(context.Background(), domain.EmailMessage{
		To:       "user@example.com",
		ToName:   "Test User",
		Template: domain.TemplateWelcome,
		Subject:  "Welcome to FeatureSignals",
		Data:     map[string]string{"DashboardURL": "https://app.featuresignals.com"},
	})
	if err != nil {
		t.Fatalf("noop send should not error: %v", err)
	}
}

func TestNoopMailer_SendBatch(t *testing.T) {
	m := NewNoopMailer(slog.Default())

	msgs := []domain.EmailMessage{
		{To: "a@example.com", Template: domain.TemplateWelcome, Subject: "Welcome"},
		{To: "b@example.com", Template: domain.TemplateTeamInvite, Subject: "Invite"},
	}
	err := m.SendBatch(context.Background(), msgs)
	if err != nil {
		t.Fatalf("noop batch send should not error: %v", err)
	}
}

func TestSMTPMailer_TemplateRendering(t *testing.T) {
	m, err := NewSMTPMailer("localhost", 1025, "", "", "noreply@test.com", "FeatureSignals", "https://app.featuresignals.com", slog.Default())
	if err != nil {
		t.Fatalf("failed to create SMTP mailer: %v", err)
	}

	msg := domain.EmailMessage{
		To:       "user@example.com",
		ToName:   "Alice",
		Template: domain.TemplateWelcome,
		Subject:  "Welcome to FeatureSignals",
		Data: map[string]string{
			"DashboardURL":   "https://app.featuresignals.com",
			"DocsURL":        "https://featuresignals.com/docs",
			"UnsubscribeURL": "https://app.featuresignals.com/settings/notifications",
		},
	}

	html, err := m.Render(msg)
	if err != nil {
		t.Fatalf("template render failed: %v", err)
	}

	if html == "" {
		t.Error("rendered HTML should not be empty")
	}
	if !contains(html, "Alice") {
		t.Error("rendered HTML should contain the recipient name")
	}
	if !contains(html, "Welcome to FeatureSignals") {
		t.Error("rendered HTML should contain the subject")
	}
	if !contains(html, "https://app.featuresignals.com") {
		t.Error("rendered HTML should contain the dashboard URL")
	}
}

func TestSMTPMailer_AllTemplatesRender(t *testing.T) {
	m, err := NewSMTPMailer("localhost", 1025, "", "", "noreply@test.com", "FeatureSignals", "https://app.featuresignals.com", slog.Default())
	if err != nil {
		t.Fatalf("failed to create SMTP mailer: %v", err)
	}

	templates := []domain.TemplateID{
		domain.TemplateWelcome,
		domain.TemplateActivationFlag,
		domain.TemplateTeamInvite,
		domain.TemplatePaymentSuccess,
		domain.TemplatePaymentFailed,
		domain.TemplateTrialEnding,
	}

	baseData := map[string]string{
		"DashboardURL":   "https://app.featuresignals.com",
		"DocsURL":        "https://featuresignals.com/docs",
		"UnsubscribeURL": "https://app.featuresignals.com/unsubscribe",
		"SDKDocsURL":     "https://featuresignals.com/docs/sdks",
		"FlagURL":        "https://app.featuresignals.com/flags/test",
		"FlagKey":        "dark-mode",
		"ProjectName":    "Default Project",
		"InviterName":    "Alice",
		"WorkspaceName":  "Acme Corp",
		"Role":           "developer",
		"AcceptURL":      "https://app.featuresignals.com/accept",
		"PlanName":       "Pro",
		"Amount":         "INR 1,999",
		"NextRenewal":    "2026-05-07",
		"PaymentMethod":  "Visa ending in 4242",
		"BillingURL":     "https://app.featuresignals.com/settings/billing",
		"GraceDaysLeft":  "7",
		"DaysLeft":       "2",
		"FlagCount":      "15",
		"MemberCount":    "4",
		"EvalCount":      "12,345",
		"UpgradeURL":     "https://app.featuresignals.com/settings/billing",
		"PricingURL":     "https://featuresignals.com/pricing",
	}

	for _, tmplID := range templates {
		t.Run(string(tmplID), func(t *testing.T) {
			msg := domain.EmailMessage{
				To:       "test@example.com",
				ToName:   "Test User",
				Template: tmplID,
				Subject:  "Test Subject",
				Data:     baseData,
			}
			html, err := m.Render(msg)
			if err != nil {
				t.Fatalf("template %s failed to render: %v", tmplID, err)
			}
			if html == "" {
				t.Errorf("template %s rendered empty HTML", tmplID)
			}
		})
	}
}

func TestTemplateMeta_AllTemplatesHavePriority(t *testing.T) {
	templates := []domain.TemplateID{
		domain.TemplateWelcome,
		domain.TemplateActivationFlag,
		domain.TemplateActivationEval,
		domain.TemplateTeamInvite,
		domain.TemplateTeamJoined,
		domain.TemplateTrialMidpoint,
		domain.TemplateTrialEnding,
		domain.TemplateTrialExpired,
		domain.TemplateWeeklyDigest,
		domain.TemplateReEngage48h,
		domain.TemplateReEngage14d,
		domain.TemplateReEngage90d,
		domain.TemplateUpgradeLimitHit,
		domain.TemplateRenewalUpcoming,
		domain.TemplatePaymentSuccess,
		domain.TemplatePaymentFailed,
		domain.TemplatePaymentFailedFinal,
		domain.TemplateCancellation,
		domain.TemplateDowngrade,
		domain.TemplateDeletionRequested,
		domain.TemplateDeletionCanceled,
		domain.TemplateFeatureAnnounce,
		domain.TemplateEnterpriseAck,
		domain.TemplateSecurityAlert,
		domain.TemplateAPIKeyCreated,
		domain.TemplateExportReady,
	}

	for _, tmplID := range templates {
		if _, ok := domain.TemplateMeta[tmplID]; !ok {
			t.Errorf("template %s missing from TemplateMeta priority map", tmplID)
		}
	}
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) >= len(substr) && searchString(s, substr))
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
