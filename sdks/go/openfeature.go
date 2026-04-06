package featuresignals

import (
	"context"
	"fmt"
	"sync"
	"time"

	of "github.com/open-feature/go-sdk/openfeature"
)

// Provider implements the OpenFeature FeatureProvider, StateHandler, and
// EventHandler interfaces, backed by a FeatureSignals Client. All evaluations
// are local lookups against the client's cached flag values — no additional
// network calls are made.
//
// Usage:
//
//	client := featuresignals.NewClient("fs_srv_...", "production",
//	    featuresignals.WithBaseURL("http://localhost:8080"),
//	)
//
//	of.SetProviderAndWait(featuresignals.NewProvider(client))
//	ofClient := of.NewClient("my-service")
//	enabled, _ := ofClient.BooleanValue(ctx, "dark-mode", false, of.EvaluationContext{})
type Provider struct {
	client  *Client
	eventCh chan of.Event
	done    chan struct{}
	once    sync.Once
}

var (
	_ of.FeatureProvider = (*Provider)(nil)
	_ of.StateHandler    = (*Provider)(nil)
	_ of.EventHandler    = (*Provider)(nil)
)

// NewProvider creates an OpenFeature provider backed by the given Client.
func NewProvider(client *Client) *Provider {
	return &Provider{
		client:  client,
		eventCh: make(chan of.Event, 10),
		done:    make(chan struct{}),
	}
}

func (p *Provider) Metadata() of.Metadata {
	return of.Metadata{Name: "FeatureSignals"}
}

func (p *Provider) Hooks() []of.Hook {
	return nil
}

// Init is called by the OpenFeature SDK during SetProviderAndWait. It registers
// an internal event bridge and blocks until the underlying client has fetched
// its initial flag set (or a 30 s timeout elapses).
func (p *Provider) Init(_ of.EvaluationContext) error {
	internalCh := make(chan clientEvent, 10)
	p.client.addEventSub(internalCh)
	go p.bridgeEvents(internalCh)

	if p.client.IsReady() {
		return nil
	}
	select {
	case <-p.client.Ready():
		return nil
	case <-time.After(30 * time.Second):
		return fmt.Errorf("featuresignals: provider init timed out waiting for client")
	}
}

// Shutdown is called by the OpenFeature SDK when the provider is removed. It
// stops the event bridge goroutine and closes the underlying client.
func (p *Provider) Shutdown() {
	p.once.Do(func() { close(p.done) })
	p.client.Close()
}

// EventChannel returns the channel the OpenFeature SDK reads for provider
// lifecycle events (PROVIDER_CONFIGURATION_CHANGED, PROVIDER_ERROR, etc.).
func (p *Provider) EventChannel() <-chan of.Event {
	return p.eventCh
}

func (p *Provider) bridgeEvents(in <-chan clientEvent) {
	for {
		select {
		case <-p.done:
			return
		case evt, ok := <-in:
			if !ok {
				return
			}
			var ofEvt of.Event
			switch evt.kind {
			case clientEventUpdate:
				ofEvt = of.Event{
					EventType:    of.ProviderConfigChange,
					ProviderName: "FeatureSignals",
				}
			case clientEventError:
				ofEvt = of.Event{
					EventType:    of.ProviderError,
					ProviderName: "FeatureSignals",
					ProviderEventDetails: of.ProviderEventDetails{
						Message: evt.err.Error(),
					},
				}
			default:
				continue
			}
			select {
			case p.eventCh <- ofEvt:
			case <-p.done:
				return
			}
		}
	}
}

func (p *Provider) BooleanEvaluation(_ context.Context, flag string, defaultValue bool, _ of.FlattenedContext) of.BoolResolutionDetail {
	v, ok := p.client.getFlag(flag)
	if !ok {
		return of.BoolResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewFlagNotFoundResolutionError(flag),
				Reason:          of.ErrorReason,
			},
		}
	}
	b, ok := v.(bool)
	if !ok {
		return of.BoolResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewTypeMismatchResolutionError("expected bool"),
				Reason:          of.ErrorReason,
			},
		}
	}
	return of.BoolResolutionDetail{
		Value:                    b,
		ProviderResolutionDetail: of.ProviderResolutionDetail{Reason: of.CachedReason},
	}
}

func (p *Provider) StringEvaluation(_ context.Context, flag string, defaultValue string, _ of.FlattenedContext) of.StringResolutionDetail {
	v, ok := p.client.getFlag(flag)
	if !ok {
		return of.StringResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewFlagNotFoundResolutionError(flag),
				Reason:          of.ErrorReason,
			},
		}
	}
	s, ok := v.(string)
	if !ok {
		return of.StringResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewTypeMismatchResolutionError("expected string"),
				Reason:          of.ErrorReason,
			},
		}
	}
	return of.StringResolutionDetail{
		Value:                    s,
		ProviderResolutionDetail: of.ProviderResolutionDetail{Reason: of.CachedReason},
	}
}

func (p *Provider) FloatEvaluation(_ context.Context, flag string, defaultValue float64, _ of.FlattenedContext) of.FloatResolutionDetail {
	v, ok := p.client.getFlag(flag)
	if !ok {
		return of.FloatResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewFlagNotFoundResolutionError(flag),
				Reason:          of.ErrorReason,
			},
		}
	}
	f, ok := v.(float64)
	if !ok {
		return of.FloatResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewTypeMismatchResolutionError("expected float64"),
				Reason:          of.ErrorReason,
			},
		}
	}
	return of.FloatResolutionDetail{
		Value:                    f,
		ProviderResolutionDetail: of.ProviderResolutionDetail{Reason: of.CachedReason},
	}
}

func (p *Provider) IntEvaluation(_ context.Context, flag string, defaultValue int64, _ of.FlattenedContext) of.IntResolutionDetail {
	v, ok := p.client.getFlag(flag)
	if !ok {
		return of.IntResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewFlagNotFoundResolutionError(flag),
				Reason:          of.ErrorReason,
			},
		}
	}
	// JSON numbers unmarshal as float64 in Go
	f, ok := v.(float64)
	if !ok {
		return of.IntResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewTypeMismatchResolutionError("expected numeric"),
				Reason:          of.ErrorReason,
			},
		}
	}
	return of.IntResolutionDetail{
		Value:                    int64(f),
		ProviderResolutionDetail: of.ProviderResolutionDetail{Reason: of.CachedReason},
	}
}

func (p *Provider) ObjectEvaluation(_ context.Context, flag string, defaultValue interface{}, _ of.FlattenedContext) of.InterfaceResolutionDetail {
	v, ok := p.client.getFlag(flag)
	if !ok {
		return of.InterfaceResolutionDetail{
			Value: defaultValue,
			ProviderResolutionDetail: of.ProviderResolutionDetail{
				ResolutionError: of.NewFlagNotFoundResolutionError(flag),
				Reason:          of.ErrorReason,
			},
		}
	}
	return of.InterfaceResolutionDetail{
		Value:                    v,
		ProviderResolutionDetail: of.ProviderResolutionDetail{Reason: of.CachedReason},
	}
}
