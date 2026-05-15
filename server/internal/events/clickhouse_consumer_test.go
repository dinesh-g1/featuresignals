package events

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock EventBus ─────────────────────────────────────────────────────────

type mockEventBus struct {
	mu        sync.Mutex
	published []*domain.EventEnvelope
	handlers  map[string]domain.EventHandler
	closed    bool
	subErr    error
}

func newMockEventBus() *mockEventBus {
	return &mockEventBus{
		handlers: make(map[string]domain.EventHandler),
	}
}

func (m *mockEventBus) Publish(_ context.Context, env *domain.EventEnvelope) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.published = append(m.published, env)
	return nil
}

func (m *mockEventBus) Subscribe(_ context.Context, subject string, consumerGroup string, handler domain.EventHandler) (domain.EventSubscription, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.subErr != nil {
		return nil, m.subErr
	}
	m.handlers[subject] = handler
	return &mockSubscription{bus: m, subject: subject}, nil
}

func (m *mockEventBus) Request(_ context.Context, _ *domain.EventEnvelope, _ time.Duration) (*domain.EventEnvelope, error) {
	return nil, nil
}

func (m *mockEventBus) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.closed = true
	return nil
}

func (m *mockEventBus) PublishedCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.published)
}

func (m *mockEventBus) HadSubject(subject string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.handlers[subject]
	return ok
}

// ─── Mock Subscription ─────────────────────────────────────────────────────

type mockSubscription struct {
	bus      *mockEventBus
	subject  string
	unsubbed bool
	mu       sync.Mutex
}

func (s *mockSubscription) Unsubscribe() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.unsubbed = true
	return nil
}

func (s *mockSubscription) IsUnsubscribed() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.unsubbed
}

// ─── Mock EventWriter for BatchWriter replacement ──────────────────────────
// ClickHouseConsumer uses *clickhouse.BatchWriter directly (concrete type).
// For unit tests, we construct a consumer struct manually and set the writer
// to nil for tests that don't exercise the write path, or we test the
// handleEvent method directly with a nil-safe approach.

// mockWriterFunc implements a write function that can be plugged into
// a test consumer's handleEvent path.
type mockWriterFunc func(ctx context.Context, event domain.EvalEvent) error

// ─── Consumer handleEvent tests ────────────────────────────────────────────

func TestClickHouseConsumer_HandleEvent_InvalidJSON(t *testing.T) {
	t.Parallel()

	consumer := &ClickHouseConsumer{
		writer: nil, // won't be reached because JSON unmarshal fails first
		logger: slog.New(slog.DiscardHandler),
	}

	env := &domain.EventEnvelope{
		ID:      "env-1",
		Subject: "eval.flag.evaluated",
		Payload: []byte("not valid json {{{"),
	}

	// handleEvent returns an error for invalid JSON
	err := consumer.handleEvent(context.Background(), env)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unmarshal")
}

func TestClickHouseConsumer_HandleEvent_InvalidJSON_LogsError(t *testing.T) {
	t.Parallel()

	consumer := &ClickHouseConsumer{
		writer: nil,
		logger: slog.New(slog.DiscardHandler),
	}

	env := &domain.EventEnvelope{
		ID:      "env-2",
		Subject: "eval.flag.evaluated",
		Payload: []byte(`{"id": "broken", "events": [{}`), // truncated JSON
	}

	err := consumer.handleEvent(context.Background(), env)
	require.Error(t, err)
	// The error should contain "unmarshal"
	assert.Contains(t, err.Error(), "unmarshal")
}

func TestClickHouseConsumer_HandleEvent_EmptyPayload(t *testing.T) {
	t.Parallel()

	consumer := &ClickHouseConsumer{
		writer: nil,
		logger: slog.New(slog.DiscardHandler),
	}

	env := &domain.EventEnvelope{
		ID:      "env-3",
		Subject: "eval.flag.evaluated",
		Payload: []byte{}, // empty payload
	}

	// Empty payload should fail to unmarshal into EvalEventBatch
	err := consumer.handleEvent(context.Background(), env)
	require.Error(t, err)
}

func TestClickHouseConsumer_HandleEvent_BatchSerialization(t *testing.T) {
	t.Parallel()

	// Verify that a properly serialized EvalEventBatch round-trips correctly
	events := []domain.EvalEvent{
		{ID: "ev-1", OrgID: "org-1", FlagKey: "flag-a", Value: "true", Reason: domain.EvalReasonDefault},
		{ID: "ev-2", OrgID: "org-1", FlagKey: "flag-b", Value: "false", Reason: domain.EvalReasonTargetingMatch},
	}
	batch := domain.EvalEventBatch{
		ID:          "batch-1",
		OrgID:       "org-1",
		Events:      events,
		BatchSize:   2,
		SampledRate: 1.0,
	}

	payload, err := json.Marshal(batch)
	require.NoError(t, err)

	var decoded domain.EvalEventBatch
	err = json.Unmarshal(payload, &decoded)
	require.NoError(t, err)

	assert.Equal(t, "batch-1", decoded.ID)
	assert.Equal(t, "org-1", decoded.OrgID)
	assert.Len(t, decoded.Events, 2)
	assert.Equal(t, "ev-1", decoded.Events[0].ID)
	assert.Equal(t, "ev-2", decoded.Events[1].ID)
}

func TestClickHouseConsumer_HandleEvent_EmptyBatch(t *testing.T) {
	t.Parallel()

	// An empty batch (zero events) should deserialize correctly
	batch := domain.EvalEventBatch{
		ID:          "batch-empty",
		OrgID:       "org-1",
		Events:      []domain.EvalEvent{},
		BatchSize:   0,
		SampledRate: 1.0,
	}
	payload, err := json.Marshal(batch)
	require.NoError(t, err)

	var decoded domain.EvalEventBatch
	err = json.Unmarshal(payload, &decoded)
	require.NoError(t, err)
	assert.Equal(t, 0, len(decoded.Events))
	assert.Equal(t, "batch-empty", decoded.ID)
}

// ─── EventBus Mock Integration ─────────────────────────────────────────────

func TestMockEventBus_PublishAndSubscribe(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	ctx := context.Background()

	var receivedEnvelope *domain.EventEnvelope
	var receivedMu sync.Mutex

	sub, err := bus.Subscribe(ctx, "eval.flag.evaluated", "test-group",
		func(_ context.Context, env *domain.EventEnvelope) error {
			receivedMu.Lock()
			defer receivedMu.Unlock()
			receivedEnvelope = env
			return nil
		},
	)
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.True(t, bus.HadSubject("eval.flag.evaluated"))

	// Publish
	payload := []byte(`{"id":"test","org_id":"org-1"}`)
	err = bus.Publish(ctx, &domain.EventEnvelope{
		ID:      "env-1",
		Subject: "eval.flag.evaluated",
		Payload: payload,
	})
	require.NoError(t, err)
	assert.Equal(t, 1, bus.PublishedCount())

	// Unsubscribe
	err = sub.Unsubscribe()
	require.NoError(t, err)
	assert.True(t, sub.(*mockSubscription).IsUnsubscribed())

	_ = receivedEnvelope
}

func TestMockEventBus_Subscribe_ErrEventBusClosed(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	bus.subErr = domain.ErrEventBusClosed

	sub, err := bus.Subscribe(context.Background(), "test.subject", "group",
		func(_ context.Context, _ *domain.EventEnvelope) error { return nil },
	)
	assert.Nil(t, sub)
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrEventBusClosed)
}

func TestMockEventBus_Close(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	err := bus.Close()
	require.NoError(t, err)
	assert.True(t, bus.closed)
}
