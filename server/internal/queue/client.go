package queue

import (
	"context"

	"github.com/hibiken/asynq"
)

// Client wraps asynq.Client for use by HTTP handlers.
// Each Client is bound to a Redis address and creates asynq tasks
// for background cell provisioning and deprovisioning.
type Client struct {
	inner *asynq.Client
}

// NewClient creates a new queue Client connected to the given Redis address.
func NewClient(redisAddr string) *Client {
	return &Client{
		inner: asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr}),
	}
}

// EnqueueProvisionCell enqueues a cell provisioning task and returns the
// asynq task ID for tracking.
func (c *Client) EnqueueProvisionCell(ctx context.Context, payload ProvisionCellPayload) (string, error) {
	task, err := NewProvisionCellTask(payload)
	if err != nil {
		return "", err
	}
	info, err := c.inner.EnqueueContext(ctx, task)
	if err != nil {
		return "", err
	}
	return info.ID, nil
}

// EnqueueDeprovisionCell enqueues a cell deprovisioning task and returns the
// asynq task ID for tracking.
func (c *Client) EnqueueDeprovisionCell(ctx context.Context, payload DeprovisionCellPayload) (string, error) {
	task, err := NewDeprovisionCellTask(payload)
	if err != nil {
		return "", err
	}
	info, err := c.inner.EnqueueContext(ctx, task)
	if err != nil {
		return "", err
	}
	return info.ID, nil
}

// Close shuts down the underlying asynq client, flushing any pending tasks.
func (c *Client) Close() error {
	return c.inner.Close()
}