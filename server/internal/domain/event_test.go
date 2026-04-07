package domain

import (
	"testing"
)

func TestEventConstants_NonEmpty(t *testing.T) {
	events := []string{
		EventSignupCompleted,
		EventLogin,
		EventLoginFailed,
		EventOnboardingStarted,
		EventOnboardingStep,
		EventOnboardingCompleted,
		EventFlagCreated,
		EventFlagToggled,
		EventFlagDeleted,
		EventSegmentCreated,
		EventProjectCreated,
		EventMemberInvited,
		EventCheckoutStarted,
		EventCheckoutCompleted,
		EventPaymentFailed,
		EventFirstEvaluation,
		EventFeatureFirstUsed,
		EventEmailSent,
	}

	for _, e := range events {
		if e == "" {
			t.Error("event constant must not be empty")
		}
	}
}

func TestTemplateMeta_TransactionalEmailsAlwaysSent(t *testing.T) {
	transactional := []TemplateID{
		TemplateWelcome,
		TemplateTeamInvite,
		TemplatePaymentSuccess,
		TemplatePaymentFailed,
		TemplatePaymentFailedFinal,
		TemplateCancellation,
		TemplateDeletionRequested,
		TemplateDeletionCanceled,
		TemplateEnterpriseAck,
		TemplateSecurityAlert,
		TemplateExportReady,
	}

	for _, tmpl := range transactional {
		priority, ok := TemplateMeta[tmpl]
		if !ok {
			t.Errorf("template %s missing from TemplateMeta", tmpl)
			continue
		}
		if priority != EmailTransactional {
			t.Errorf("template %s should be Transactional, got %d", tmpl, priority)
		}
	}
}

func TestEmailPreference_Constants(t *testing.T) {
	if EmailPrefAll != "all" {
		t.Error("EmailPrefAll should be 'all'")
	}
	if EmailPrefImportant != "important" {
		t.Error("EmailPrefImportant should be 'important'")
	}
	if EmailPrefTransactional != "transactional" {
		t.Error("EmailPrefTransactional should be 'transactional'")
	}
}
