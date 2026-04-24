//go:build !redis

package main

import (
	"log/slog"

	"github.com/featuresignals/server/internal/events"
)

func init() {
	connectRedis = noopConnectRedis
}

// noopConnectRedis returns a no-op Redis client. When the URL is non-empty, it
// logs a warning that the real Redis driver has not been compiled in.
//
// To enable real Redis support, build with:
//
//	go build -tags redis ./cmd/relay
//
// and ensure github.com/redis/go-redis/v9 is in go.mod.
func noopConnectRedis(url string, logger *slog.Logger) events.RedisClient {
	if url == "" {
		return events.NewNoopRedisClient(logger)
	}
	logger.Warn("redis-url provided but no Redis driver compiled; " +
		"build with -tags redis and add github.com/redis/go-redis/v9 to go.mod")
	return events.NewNoopRedisClient(logger)
}