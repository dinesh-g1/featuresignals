package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/retry"
)

var whTracer = otel.Tracer("featuresignals/webhook")

// Event represents a flag change event dispatched to matching webhooks.
type Event struct {
	Type    string      `json:"type"`
	EnvID   string      `json:"env_id"`
	FlagID  string      `json:"flag_id,omitempty"`
	Action  string      `json:"action"`
	OrgID   string      `json:"org_id"`
	SentAt  time.Time   `json:"sent_at"`
	Payload interface{} `json:"payload,omitempty"`
}

// Store is the subset of domain.Store the dispatcher needs.
type Store interface {
	ListWebhooks(ctx context.Context, orgID string, limit, offset int) ([]domain.Webhook, error)
	CreateWebhookDelivery(ctx context.Context, d *domain.WebhookDelivery) error
}

// HTTPClient allows substituting the real http.Client in tests.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

const defaultWorkers = 10

type deliveryWork struct {
	ctx context.Context
	wh  domain.Webhook
	evt Event
}

// Dispatcher fans out flag change events to registered webhooks.
type Dispatcher struct {
	store      Store
	client     HTTPClient
	logger     *slog.Logger
	events     chan Event
	work       chan deliveryWork
	maxRetries int
	workers    int
	recorder   OTELMetricsRecorder
}

// OTELMetricsRecorder records webhook metrics via OTEL.
type OTELMetricsRecorder interface {
	RecordWebhookDelivery(ctx context.Context, success bool, durationMs float64)
}

// NewDispatcher creates a dispatcher that processes events on a background goroutine.
func NewDispatcher(store Store, logger *slog.Logger, recorder OTELMetricsRecorder) *Dispatcher {
	return &Dispatcher{
		store:      store,
		client:     &http.Client{Timeout: 10 * time.Second},
		logger:     logger.With("component", "webhook-dispatcher"),
		events:     make(chan Event, 256),
		work:       make(chan deliveryWork, 256),
		maxRetries: 3,
		workers:    defaultWorkers,
		recorder:   recorder,
	}
}

// SetHTTPClient replaces the default HTTP client (useful for testing).
func (d *Dispatcher) SetHTTPClient(c HTTPClient) {
	d.client = c
}

// Enqueue adds an event to the dispatch queue (non-blocking, drops if full).
func (d *Dispatcher) Enqueue(evt Event) {
	select {
	case d.events <- evt:
	default:
		d.logger.Warn("webhook event queue full, dropping event", "type", evt.Type)
	}
}

// Start begins processing events. It launches a bounded pool of worker
// goroutines and a dispatcher goroutine. All goroutines are owned by the
// provided context and exit cleanly when it is cancelled.
func (d *Dispatcher) Start(ctx context.Context) {
	var wg sync.WaitGroup

	for i := 0; i < d.workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for w := range d.work {
				d.deliver(w.ctx, w.wh, w.evt)
			}
		}()
	}

	go func() {
		defer func() {
			close(d.work)
			wg.Wait()
		}()
		for {
			select {
			case <-ctx.Done():
				return
			case evt := <-d.events:
				d.dispatch(ctx, evt)
			}
		}
	}()
}

func (d *Dispatcher) dispatch(ctx context.Context, evt Event) {
	webhooks, err := d.store.ListWebhooks(ctx, evt.OrgID, 0, 0)
	if err != nil {
		d.logger.Error("failed to list webhooks", "error", err, "org_id", evt.OrgID)
		return
	}

	for _, wh := range webhooks {
		if !wh.Enabled {
			continue
		}
		if !eventMatches(wh.Events, evt.Type) {
			continue
		}
		select {
		case d.work <- deliveryWork{ctx: ctx, wh: wh, evt: evt}:
		case <-ctx.Done():
			return
		}
	}
}

func eventMatches(subscribed []string, eventType string) bool {
	for _, s := range subscribed {
		if s == eventType || s == "*" {
			return true
		}
	}
	return false
}

func (d *Dispatcher) deliver(ctx context.Context, wh domain.Webhook, evt Event) {
	ctx, span := whTracer.Start(ctx, "webhook.Deliver",
		trace.WithAttributes(
			attribute.String("webhook_id", wh.ID),
			attribute.String("webhook_url", wh.URL),
			attribute.String("event_type", evt.Type),
		),
	)
	defer span.End()

	start := time.Now()
	payload, _ := json.Marshal(evt)

	var lastStatus int
	var lastBody string
	var success bool

	for attempt := 1; attempt <= d.maxRetries; attempt++ {
		if attempt > 1 {
			backoff := retry.JitteredBackoff(attempt-1, retry.DefaultBase, retry.DefaultFactor, retry.DefaultCap)
			select {
			case <-ctx.Done():
				lastBody = ctx.Err().Error()
				break
			case <-time.After(backoff):
			}
		}

		attemptCtx, attemptCancel := context.WithTimeout(ctx, 10*time.Second)
		defer attemptCancel()
		req, err := http.NewRequestWithContext(attemptCtx, "POST", wh.URL, bytes.NewReader(payload))
		if err != nil {
			d.logger.Error("failed to create webhook request", "error", err, "webhook_id", wh.ID)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "FeatureSignals-Webhook/1.0")

		if wh.Secret != "" {
			sig := sign(payload, wh.Secret)
			req.Header.Set("X-FeatureSignals-Signature", sig)
		}

		resp, err := d.client.Do(req)
		if err != nil {
			d.logger.Warn("webhook delivery failed", "error", err, "webhook_id", wh.ID, "attempt", attempt)
			lastStatus = 0
			lastBody = err.Error()
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		resp.Body.Close()

		lastStatus = resp.StatusCode
		lastBody = string(body)

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			success = true
			break
		}

		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			d.logger.Warn("webhook non-retryable client error",
				"status", resp.StatusCode, "webhook_id", wh.ID, "attempt", attempt)
			break
		}

		d.logger.Warn("webhook non-2xx", "status", resp.StatusCode, "webhook_id", wh.ID, "attempt", attempt)
	}

	span.SetAttributes(
		attribute.Bool("success", success),
		attribute.Int("response_status", lastStatus),
	)

	if d.recorder != nil {
		durationMs := float64(time.Since(start).Milliseconds())
		d.recorder.RecordWebhookDelivery(ctx, success, durationMs)
	}

	delivery := &domain.WebhookDelivery{
		WebhookID:      wh.ID,
		EventType:      evt.Type,
		Payload:        payload,
		ResponseStatus: lastStatus,
		ResponseBody:   lastBody,
		Success:        success,
	}
	if err := d.store.CreateWebhookDelivery(ctx, delivery); err != nil {
		d.logger.Error("failed to record delivery", "error", err, "webhook_id", wh.ID)
	}
}

func sign(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return fmt.Sprintf("sha256=%s", hex.EncodeToString(mac.Sum(nil)))
}
