package lifecycle

import (
	"context"
	"sync"
	"testing"

	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

type spyMailer struct {
	mu   sync.Mutex
	sent []domain.EmailMessage
}

func (m *spyMailer) Send(_ context.Context, msg domain.EmailMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sent = append(m.sent, msg)
	return nil
}

func (m *spyMailer) SendBatch(_ context.Context, msgs []domain.EmailMessage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sent = append(m.sent, msgs...)
	return nil
}

func (m *spyMailer) sentCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.sent)
}

type stubPrefs struct {
	consent    bool
	preference string
	err        error
}

func (s *stubPrefs) GetUserEmailPreferences(_ context.Context, _ string) (bool, string, error) {
	return s.consent, s.preference, s.err
}

type spyEmitter struct {
	mu     sync.Mutex
	events []domain.ProductEvent
}

func (e *spyEmitter) Emit(_ context.Context, ev domain.ProductEvent) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.events = append(e.events, ev)
}

func (e *spyEmitter) eventCount() int {
	e.mu.Lock()
	defer e.mu.Unlock()
	return len(e.events)
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(&discardWriter{}, nil))
}

type discardWriter struct{}

func (discardWriter) Write(p []byte) (int, error) { return len(p), nil }

func TestProcessor_TransactionalAlwaysSent(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: false, preference: domain.EmailPrefTransactional}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	msg := domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateWelcome,
		Subject:  "Welcome",
	}
	if err := p.Send(context.Background(), "user-1", msg); err != nil {
		t.Fatalf("Send failed: %v", err)
	}

	if mailer.sentCount() != 1 {
		t.Fatalf("expected 1 email sent, got %d", mailer.sentCount())
	}
	if emitter.eventCount() != 1 {
		t.Fatalf("expected 1 event emitted, got %d", emitter.eventCount())
	}
}

func TestProcessor_LifecycleSuppressedByTransactionalPref(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: true, preference: domain.EmailPrefTransactional}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	msg := domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateActivationFlag,
		Subject:  "Your first flag!",
	}
	if err := p.Send(context.Background(), "user-1", msg); err != nil {
		t.Fatalf("Send failed: %v", err)
	}

	if mailer.sentCount() != 0 {
		t.Fatalf("expected 0 emails (lifecycle suppressed), got %d", mailer.sentCount())
	}
	if emitter.eventCount() != 0 {
		t.Fatalf("expected 0 events (email suppressed), got %d", emitter.eventCount())
	}
}

func TestProcessor_ImportantSentOnImportantPref(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: true, preference: domain.EmailPrefImportant}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	msg := domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateTrialEnding,
		Subject:  "Trial ending soon",
	}
	if err := p.Send(context.Background(), "user-1", msg); err != nil {
		t.Fatalf("Send failed: %v", err)
	}

	if mailer.sentCount() != 1 {
		t.Fatalf("expected 1 email sent (important allowed), got %d", mailer.sentCount())
	}
}

func TestProcessor_LifecycleSuppressedByImportantPref(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: true, preference: domain.EmailPrefImportant}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	msg := domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateWeeklyDigest,
		Subject:  "Weekly digest",
	}
	if err := p.Send(context.Background(), "user-1", msg); err != nil {
		t.Fatalf("Send failed: %v", err)
	}

	if mailer.sentCount() != 0 {
		t.Fatalf("expected 0 emails (lifecycle suppressed by important pref), got %d", mailer.sentCount())
	}
}

func TestProcessor_NoConsentSuppressesNonTransactional(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: false, preference: domain.EmailPrefAll}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	msg := domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplateTrialEnding,
		Subject:  "Trial ending",
	}
	if err := p.Send(context.Background(), "user-1", msg); err != nil {
		t.Fatalf("Send failed: %v", err)
	}

	if mailer.sentCount() != 0 {
		t.Fatalf("expected 0 emails (no consent), got %d", mailer.sentCount())
	}
}

func TestProcessor_EmptyUserIDSkipsPreferenceCheck(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: false, preference: domain.EmailPrefTransactional}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	msg := domain.EmailMessage{
		To:       "user@example.com",
		Template: domain.TemplatePaymentSuccess,
		Subject:  "Payment confirmed",
	}
	if err := p.Send(context.Background(), "", msg); err != nil {
		t.Fatalf("Send failed: %v", err)
	}

	if mailer.sentCount() != 1 {
		t.Fatalf("expected 1 email (empty userID skips pref check), got %d", mailer.sentCount())
	}
}

func TestProcessor_AllPrefAllowsEverything(t *testing.T) {
	t.Parallel()
	mailer := &spyMailer{}
	prefs := &stubPrefs{consent: true, preference: domain.EmailPrefAll}
	emitter := &spyEmitter{}
	p := NewProcessor(mailer, prefs, emitter, testLogger())

	templates := []domain.TemplateID{
		domain.TemplateWelcome,
		domain.TemplateActivationFlag,
		domain.TemplateTrialEnding,
		domain.TemplateWeeklyDigest,
	}

	for _, tmpl := range templates {
		msg := domain.EmailMessage{
			To:       "user@example.com",
			Template: tmpl,
			Subject:  "Test",
		}
		if err := p.Send(context.Background(), "user-1", msg); err != nil {
			t.Fatalf("Send failed for %s: %v", tmpl, err)
		}
	}

	if mailer.sentCount() != len(templates) {
		t.Fatalf("expected %d emails (all pref), got %d", len(templates), mailer.sentCount())
	}
}
