//go:build redis

package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/events"

	"github.com/redis/go-redis/v9"
)

func init() {
	connectRedis = realConnectRedis
}

// realConnectRedis creates a real Redis client backed by go-redis/v9.
// Returns a wrapper that satisfies events.RedisClient.
func realConnectRedis(url string, logger *slog.Logger) events.RedisClient {
	if url == "" {
		return events.NewNoopRedisClient(logger)
	}

	opts, err := redis.ParseURL(url)
	if err != nil {
		logger.Error("invalid redis URL, falling back to no-op client",
			"error", err,
			"url", url,
		)
		return events.NewNoopRedisClient(logger)
	}

	rdb := redis.NewClient(opts)

	// Verify connectivity.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Error("redis ping failed, falling back to no-op client",
			"error", err,
			"url", url,
		)
		rdb.Close()
		return events.NewNoopRedisClient(logger)
	}

	logger.Info("connected to Redis", "addr", opts.Addr)
	return &goRedisClient{rdb: rdb, logger: logger}
}

// goRedisClient wraps a *redis.Client to satisfy events.RedisClient.
type goRedisClient struct {
	rdb    *redis.Client
	logger *slog.Logger
}

func (c *goRedisClient) Publish(ctx context.Context, channel string, message any) error {
	return c.rdb.Publish(ctx, channel, message).Err()
}

func (c *goRedisClient) Subscribe(ctx context.Context, channels ...string) (events.RedisSubscription, error) {
	pubSub := c.rdb.Subscribe(ctx, channels...)

	// Wait for subscription to be active.
	_, err := pubSub.Receive(ctx)
	if err != nil {
		pubSub.Close()
		return nil, err
	}

	return &goRedisSubscription{pubSub: pubSub}, nil
}

func (c *goRedisClient) Close() error {
	return c.rdb.Close()
}

// goRedisSubscription wraps *redis.PubSub to satisfy events.RedisSubscription.
type goRedisSubscription struct {
	pubSub *redis.PubSub
}

func (s *goRedisSubscription) Channel() <-chan *events.RedisMessage {
	ch := make(chan *events.RedisMessage)
	go func() {
		for msg := range s.pubSub.Channel() {
			ch <- &events.RedisMessage{
				Channel: msg.Channel,
				Pattern: msg.Pattern,
				Payload: []byte(msg.Payload),
			}
		}
		close(ch)
	}()
	return ch
}

func (s *goRedisSubscription) Close() error {
	return s.pubSub.Close()
}