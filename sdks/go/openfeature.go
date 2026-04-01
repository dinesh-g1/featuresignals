package featuresignals

import (
	"context"

	of "github.com/open-feature/go-sdk/openfeature"
)

// Provider implements the OpenFeature FeatureProvider interface, backed by a
// FeatureSignals Client. All evaluations are local lookups against the client's
// cached flag values — no additional network calls are made.
//
// Usage:
//
//	client := featuresignals.NewClient("fs_srv_...", "production",
//	    featuresignals.WithBaseURL("http://localhost:8080"),
//	)
//	<-client.Ready()
//
//	of.SetProviderAndWait(featuresignals.NewProvider(client))
//	ofClient := of.NewClient("my-service")
//	enabled, _ := ofClient.BooleanValue(ctx, "dark-mode", false, of.EvaluationContext{})
type Provider struct {
	client *Client
}

var _ of.FeatureProvider = (*Provider)(nil)

// NewProvider creates an OpenFeature provider backed by the given Client.
func NewProvider(client *Client) *Provider {
	return &Provider{client: client}
}

func (p *Provider) Metadata() of.Metadata {
	return of.Metadata{Name: "FeatureSignals"}
}

func (p *Provider) Hooks() []of.Hook {
	return nil
}

func (p *Provider) BooleanEvaluation(_ context.Context, flag string, defaultValue bool, evalCtx of.FlattenedContext) of.BoolResolutionDetail {
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

func (p *Provider) StringEvaluation(_ context.Context, flag string, defaultValue string, evalCtx of.FlattenedContext) of.StringResolutionDetail {
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

func (p *Provider) FloatEvaluation(_ context.Context, flag string, defaultValue float64, evalCtx of.FlattenedContext) of.FloatResolutionDetail {
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

func (p *Provider) IntEvaluation(_ context.Context, flag string, defaultValue int64, evalCtx of.FlattenedContext) of.IntResolutionDetail {
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

func (p *Provider) ObjectEvaluation(_ context.Context, flag string, defaultValue interface{}, evalCtx of.FlattenedContext) of.InterfaceResolutionDetail {
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
