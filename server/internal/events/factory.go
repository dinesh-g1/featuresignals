package events

import (
	"fmt"
	"log/slog"

	"github.com/nats-io/nats.go"

	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
	natsbus "github.com/featuresignals/server/internal/events/nats"
)

// NewEventBus creates a domain.EventBus based on the configured provider.
//
// Supported providers:
//   - "nats" — NATS-backed event bus (requires NATS_URL)
//   - "noop" — No-op event bus for single-instance deployments and development
//
// Returns the EventBus and a cleanup function that should be called during
// graceful shutdown (defer cleanup()).
func NewEventBus(cfg *config.Config, logger *slog.Logger) (domain.EventBus, func(), error) {
	busLogger := logger.With("component", "eventbus_factory")

	switch cfg.EventBusProvider {
	case "nats":
		nc, err := nats.Connect(cfg.NATSURL,
			nats.Name("featuresignals-server"),
			nats.RetryOnFailedConnect(true),
			nats.MaxReconnects(-1),
		)
		if err != nil {
			return nil, nil, fmt.Errorf("nats connect %s: %w", cfg.NATSURL, err)
		}

		bus := natsbus.NewNATSEventBus(nc, busLogger)
		cleanup := func() {
			if err := bus.Close(); err != nil {
				busLogger.Warn("error closing NATS event bus", "error", err)
			}
		}

		busLogger.Info("NATS event bus connected", "url", cfg.NATSURL)
		return bus, cleanup, nil

	case "noop":
		bus := NewNoopEventBus(busLogger)
		cleanup := func() {
			_ = bus.Close()
		}
		busLogger.Info("no-op event bus initialized (cross-service messaging disabled)")
		return bus, cleanup, nil

	default:
		return nil, nil, fmt.Errorf("unknown EVENT_BUS_PROVIDER: %q (expected \"nats\" or \"noop\")", cfg.EventBusProvider)
	}
}
