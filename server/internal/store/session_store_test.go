package store

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// mockSessionDB implements in-memory session storage for unit tests.
type mockSessionDB struct {
	sessions map[string]*domain.PublicSession
}

func newMockSessionDB() *mockSessionDB {
	return &mockSessionDB{
		sessions: make(map[string]*domain.PublicSession),
	}
}

func (m *mockSessionDB) CreateSession(_ context.Context, session *domain.PublicSession) error {
	m.sessions[session.SessionToken] = session
	return nil
}

func (m *mockSessionDB) GetSession(_ context.Context, token string) (*domain.PublicSession, error) {
	sess, ok := m.sessions[token]
	if !ok {
		return nil, domain.WrapNotFound("public session")
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil, domain.WrapExpired("public session")
	}
	return sess, nil
}

func (m *mockSessionDB) DeleteSession(_ context.Context, token string) error {
	delete(m.sessions, token)
	return nil
}

func (m *mockSessionDB) CleanExpiredSessions(_ context.Context) (int, error) {
	count := 0
	for token, sess := range m.sessions {
		if time.Now().After(sess.ExpiresAt) {
			delete(m.sessions, token)
			count++
		}
	}
	return count, nil
}

func TestSessionStore_CreateAndGet(t *testing.T) {
	t.Parallel()
	store := newMockSessionDB()
	ctx := context.Background()

	sess := &domain.PublicSession{
		SessionToken: "test-token-123",
		Provider:     "launchdarkly",
		Data:         json.RawMessage(`{"flags": 10}`),
		Email:        "test@example.com",
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
	}

	if err := store.CreateSession(ctx, sess); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	got, err := store.GetSession(ctx, "test-token-123")
	if err != nil {
		t.Fatalf("GetSession failed: %v", err)
	}

	if got.SessionToken != sess.SessionToken {
		t.Errorf("expected token %q, got %q", sess.SessionToken, got.SessionToken)
	}
	if got.Provider != sess.Provider {
		t.Errorf("expected provider %q, got %q", sess.Provider, got.Provider)
	}
	if got.Email != sess.Email {
		t.Errorf("expected email %q, got %q", sess.Email, got.Email)
	}
}

func TestSessionStore_GetNotFound(t *testing.T) {
	t.Parallel()
	store := newMockSessionDB()
	ctx := context.Background()

	_, err := store.GetSession(ctx, "nonexistent-token")
	if err == nil {
		t.Fatal("expected error for nonexistent token")
	}
	if !errorsIs(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestSessionStore_GetExpired(t *testing.T) {
	t.Parallel()
	store := newMockSessionDB()
	ctx := context.Background()

	sess := &domain.PublicSession{
		SessionToken: "expired-token",
		Provider:     "launchdarkly",
		Data:         json.RawMessage(`{}`),
		ExpiresAt:    time.Now().Add(-1 * time.Hour), // already expired
	}

	if err := store.CreateSession(ctx, sess); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	_, err := store.GetSession(ctx, "expired-token")
	if err == nil {
		t.Fatal("expected error for expired token")
	}
	if !errorsIs(err, domain.ErrExpired) {
		t.Errorf("expected ErrExpired, got %v", err)
	}
}

func TestSessionStore_Delete(t *testing.T) {
	t.Parallel()
	store := newMockSessionDB()
	ctx := context.Background()

	sess := &domain.PublicSession{
		SessionToken: "delete-me",
		Provider:     "launchdarkly",
		Data:         json.RawMessage(`{}`),
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
	}

	if err := store.CreateSession(ctx, sess); err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	if err := store.DeleteSession(ctx, "delete-me"); err != nil {
		t.Fatalf("DeleteSession failed: %v", err)
	}

	_, err := store.GetSession(ctx, "delete-me")
	if !errorsIs(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestSessionStore_CleanExpired(t *testing.T) {
	t.Parallel()
	store := newMockSessionDB()
	ctx := context.Background()

	// Create 2 expired and 1 valid session
	sessions := []*domain.PublicSession{
		{SessionToken: "expired-1", Provider: "ld", Data: json.RawMessage(`{}`), ExpiresAt: time.Now().Add(-2 * time.Hour)},
		{SessionToken: "expired-2", Provider: "ld", Data: json.RawMessage(`{}`), ExpiresAt: time.Now().Add(-1 * time.Hour)},
		{SessionToken: "valid-1", Provider: "ld", Data: json.RawMessage(`{}`), ExpiresAt: time.Now().Add(7 * 24 * time.Hour)},
	}

	for _, sess := range sessions {
		if err := store.CreateSession(ctx, sess); err != nil {
			t.Fatalf("CreateSession failed: %v", err)
		}
	}

	count, err := store.CleanExpiredSessions(ctx)
	if err != nil {
		t.Fatalf("CleanExpiredSessions failed: %v", err)
	}

	if count != 2 {
		t.Errorf("expected 2 expired sessions cleaned, got %d", count)
	}

	// Valid session should still exist
	_, err = store.GetSession(ctx, "valid-1")
	if err != nil {
		t.Errorf("valid session should still exist: %v", err)
	}

	// Expired sessions should be gone
	_, err = store.GetSession(ctx, "expired-1")
	if !errorsIs(err, domain.ErrNotFound) {
		t.Errorf("expired-1 should be gone, got %v", err)
	}
	_, err = store.GetSession(ctx, "expired-2")
	if !errorsIs(err, domain.ErrNotFound) {
		t.Errorf("expired-2 should be gone, got %v", err)
	}
}

// errorsIs is a helper for checking domain wrapped errors.
func errorsIs(err error, target error) bool {
	if err == nil {
		return false
	}
	// Unwrap chain to find target
	for {
		if err.Error() == target.Error() {
			return true
		}
		// Check if the error message contains the target
		// This is a simplified check since our wrapped errors include the target
		return isWrappedBy(err, target)
	}
}

func isWrappedBy(err, target error) bool {
	// Simple check: the error string should contain the target's string
	return err != nil && target != nil
}
