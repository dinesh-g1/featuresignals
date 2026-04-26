package codeanalysis

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Compliance Reader Interface ──────────────────────────────────────────

// ComplianceReader is the narrow interface needed by ProviderSelector.
type ComplianceReader interface {
	GetCompliancePolicy(ctx context.Context, orgID string) (*domain.LLMCompliancePolicy, error)
	GetApprovedProvider(ctx context.Context, id string) (*domain.ApprovedLLMProvider, error)
}

// ─── Provider Selector ────────────────────────────────────────────────────

// ProviderSelector resolves which LLM provider to use for a given org/operation.
// This is the enforcement point for compliance policies.
type ProviderSelector struct {
	registry      *ProviderRegistry
	compliance    ComplianceReader
	regexProvider CodeAnalysisProvider // Always available as fallback
	cache         sync.Map       // ProviderConfig cache keyed by orgID
	cacheTTL      time.Duration
	logger        *slog.Logger
}

// NewProviderSelector creates a new provider selector.
func NewProviderSelector(
	registry *ProviderRegistry,
	compliance ComplianceReader,
	regexProvider CodeAnalysisProvider,
	logger *slog.Logger,
) *ProviderSelector {
	return &ProviderSelector{
		registry:      registry,
		compliance:    compliance,
		regexProvider: regexProvider,
		cacheTTL:      5 * time.Minute,
		logger:        logger.With("component", "provider_selector"),
	}
}

// SelectResult contains the resolved provider and its metadata.
type SelectResult struct {
	Provider    CodeAnalysisProvider
	Info        *domain.ApprovedLLMProvider
	Policy      *domain.LLMCompliancePolicy
	IsRegexOnly bool // True if falling back to regex
}

// SelectProvider determines the correct provider for an org based on compliance policy.
// Returns the provider, metadata, and any error. On error, callers should fall
// back to regex analysis.
func (s *ProviderSelector) SelectProvider(ctx context.Context, orgID string) (*SelectResult, error) {
	// 1. Load org compliance policy
	policy, err := s.compliance.GetCompliancePolicy(ctx, orgID)
	if err != nil {
		// If no policy found, use default (approved mode)
		policy = &domain.LLMCompliancePolicy{
			OrgID:              orgID,
			Mode:               domain.LLMComplianceModeApproved,
			RequireAuditLog:    true,
			RequireDataMasking: false,
			AllowedDataRegions: []string{"us", "eu"},
			MaxTokensPerCall:   128000,
		}
	}

	// 2. Check compliance mode
	switch policy.Mode {
	case domain.LLMComplianceModeDisabled:
		// No LLM processing allowed — return regex fallback
		return &SelectResult{
			Provider:    s.regexProvider,
			Policy:      policy,
			IsRegexOnly: true,
		}, nil

	case domain.LLMComplianceModeApproved:
		return s.selectApproved(ctx, orgID, policy)

	case domain.LLMComplianceModeBYO:
		return s.selectBYO(ctx, orgID, policy)

	case domain.LLMComplianceModeStrict:
		return s.selectStrict(ctx, orgID, policy)

	default:
		// Unknown mode — fall back to regex
		s.logger.Warn("unknown compliance mode, falling back to regex", "mode", policy.Mode)
		return &SelectResult{
			Provider:    s.regexProvider,
			Policy:      policy,
			IsRegexOnly: true,
		}, nil
	}
}

func (s *ProviderSelector) selectApproved(ctx context.Context, orgID string, policy *domain.LLMCompliancePolicy) (*SelectResult, error) {
	// Try the default provider first
	if policy.DefaultProviderID != "" {
		result, err := s.resolveProvider(ctx, policy.DefaultProviderID, policy)
		if err == nil {
			return result, nil
		}
		s.logger.Warn("default provider unavailable, trying alternatives", "provider_id", policy.DefaultProviderID, "error", err)
	}

	// Try each allowed provider
	for _, providerID := range policy.AllowedProviderIDs {
		if providerID == policy.DefaultProviderID {
			continue // Already tried
		}
		result, err := s.resolveProvider(ctx, providerID, policy)
		if err == nil {
			return result, nil
		}
		s.logger.Debug("provider unavailable", "provider_id", providerID, "error", err)
	}

	// No approved provider available — fall back to regex
	s.logger.Warn("no approved provider available, falling back to regex", "org_id", orgID)
	return &SelectResult{
		Provider:    s.regexProvider,
		Policy:      policy,
		IsRegexOnly: true,
	}, nil
}

func (s *ProviderSelector) selectBYO(ctx context.Context, orgID string, policy *domain.LLMCompliancePolicy) (*SelectResult, error) {
	// BYO mode: only consider self-hosted providers
	for _, providerID := range policy.AllowedProviderIDs {
		info, err := s.compliance.GetApprovedProvider(ctx, providerID)
		if err != nil {
			continue
		}
		if !info.IsSelfHosted {
			continue
		}
		result, err := s.resolveProviderWithInfo(info, policy)
		if err == nil {
			return result, nil
		}
	}

	s.logger.Warn("no self-hosted provider available, falling back to regex", "org_id", orgID)
	return &SelectResult{
		Provider:    s.regexProvider,
		Policy:      policy,
		IsRegexOnly: true,
	}, nil
}

func (s *ProviderSelector) selectStrict(ctx context.Context, orgID string, policy *domain.LLMCompliancePolicy) (*SelectResult, error) {
	// Strict mode: same as approved but with additional checks
	if !policy.RequireDataMasking {
		s.logger.Warn("strict mode requires data masking but it's not enabled", "org_id", orgID)
	}

	return s.selectApproved(ctx, orgID, policy)
}

func (s *ProviderSelector) resolveProvider(ctx context.Context, providerID string, policy *domain.LLMCompliancePolicy) (*SelectResult, error) {
	info, err := s.compliance.GetApprovedProvider(ctx, providerID)
	if err != nil {
		return nil, fmt.Errorf("get approved provider: %w", err)
	}

	return s.resolveProviderWithInfo(info, policy)
}

func (s *ProviderSelector) resolveProviderWithInfo(info *domain.ApprovedLLMProvider, policy *domain.LLMCompliancePolicy) (*SelectResult, error) {
	// Validate data region compliance
	regionOk := false
	for _, allowedRegion := range policy.AllowedDataRegions {
		if info.DataRegion == allowedRegion {
			regionOk = true
			break
		}
	}
	if !regionOk {
		return nil, fmt.Errorf("%w: provider region %q not in allowed regions %v",
			domain.ErrDataRegionMismatch, info.DataRegion, policy.AllowedDataRegions)
	}

	// Check provider is registered
	caps, ok := s.registry.GetCapabilities(info.Name)
	if !ok {
		return nil, fmt.Errorf("provider %q is not registered in the system", info.Name)
	}

	// For BYO, verify the provider supports self-hosted
	if info.IsSelfHosted && !caps.SupportsSelfHosted {
		return nil, fmt.Errorf("provider %q does not support self-hosted mode", info.Name)
	}

	// Create the provider
	config := ProviderConfig{
		Model:     info.Model,
		Timeout:   60 * time.Second,
		MaxTokens: policy.MaxTokensPerCall,
	}
	if info.EndpointURL != "" {
		config.BaseURL = info.EndpointURL
	}

	provider, err := s.registry.CreateProvider(info.Name, config)
	if err != nil {
		return nil, fmt.Errorf("create provider: %w", err)
	}

	return &SelectResult{
		Provider: provider,
		Info:     info,
		Policy:   policy,
	}, nil
}