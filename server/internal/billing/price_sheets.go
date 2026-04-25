// Package billing implements the usage metering and cost calculation engine
// for FeatureSignals. This file defines the default cloud price sheets for
// all supported providers and regions.
//
// Prices are based on published on-demand rates (May 2025) for comparable
// compute instances (2 vCPU, 4 GB RAM — roughly equivalent to Hetzner CPX21).
// All prices are in EUR per unit as defined by CloudPriceSheet.
//
// Providers:
//   - Hetzner:   fsn1 (Falkenstein), ash (Ashburn), hil (Helsinki)
//   - AWS:       eu-central-1, us-east-1, us-west-2, ap-southeast-1
//   - Azure:     westeurope, eastus, southeastasia
//   - GCP:       europe-west1, us-central1, asia-southeast1
package billing

import (
	"fmt"
	"sync"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Price Sheet Registry ─────────────────────────────────────────────────

// defaultPriceSheets holds the canonical price sheets for all supported cloud
// provider + region combinations. Loaded once at startup and never mutated.
var defaultPriceSheets []domain.CloudPriceSheet
var priceSheetsOnce sync.Once

// initPriceSheets populates the default price sheets. Called once via sync.Once.
// Prices are in EUR and represent actual infrastructure costs (before margin).
func initPriceSheets() {
	defaultPriceSheets = []domain.CloudPriceSheet{
		// ── Hetzner ─────────────────────────────────────────────────────────
		// Hetzner is our primary provider for Community Edition cells.
		// Pricing based on CPX21 (2 vCPU, 4 GB RAM) at published rates.
		{
			CloudProvider:     "hetzner",
			Region:            "fsn1",
			CPUPerHour:        0.0096,  // €0.0096/h — 2 vCPU share of CPX21
			MemoryPerGBHour:   0.0024,  // €0.0024/GB-h — 4 GB share of CPX21
			StoragePerGBMonth: 0.04,    // €0.04/GB-month — block storage
			EgressPerGB:       0.01,    // €0.01/GB — included traffic after 1 TB
			APICallsPerMillion: 0.20,   // €0.20/M — load balancer + API gateway
		},
		{
			CloudProvider:      "hetzner",
			Region:             "ash",
			CPUPerHour:         0.0106,  // Slight US premium over Falkenstein
			MemoryPerGBHour:    0.0026,
			StoragePerGBMonth:  0.044,
			EgressPerGB:        0.01,
			APICallsPerMillion: 0.20,
		},
		{
			CloudProvider:      "hetzner",
			Region:             "hil",
			CPUPerHour:         0.0096,  // Same pricing as Falkenstein
			MemoryPerGBHour:    0.0024,
			StoragePerGBMonth:  0.04,
			EgressPerGB:        0.01,
			APICallsPerMillion: 0.20,
		},

		// ── AWS ─────────────────────────────────────────────────────────────
		// Based on t3a.large (2 vCPU, 8 GB RAM) — adjusting CPU/memory split
		// for our 4 GB reference. Egress is the big differentiator on AWS.
		{
			CloudProvider:      "aws",
			Region:             "eu-central-1",
			CPUPerHour:         0.0250,  // €0.025/h — ~50% of t3a.large CPU share
			MemoryPerGBHour:    0.0062,  // €0.0062/GB-h
			StoragePerGBMonth:  0.10,    // €0.10/GB-month — gp3 EBS
			EgressPerGB:        0.09,    // €0.09/GB — first 10 TB/month
			APICallsPerMillion: 1.00,    // €1.00/M — API Gateway + ALB
		},
		{
			CloudProvider:      "aws",
			Region:             "us-east-1",
			CPUPerHour:         0.0220,
			MemoryPerGBHour:    0.0055,
			StoragePerGBMonth:  0.08,
			EgressPerGB:        0.09,
			APICallsPerMillion: 1.00,
		},
		{
			CloudProvider:      "aws",
			Region:             "us-west-2",
			CPUPerHour:         0.0220,
			MemoryPerGBHour:    0.0055,
			StoragePerGBMonth:  0.08,
			EgressPerGB:        0.09,
			APICallsPerMillion: 1.00,
		},
		{
			CloudProvider:      "aws",
			Region:             "ap-southeast-1",
			CPUPerHour:         0.0280,
			MemoryPerGBHour:    0.0070,
			StoragePerGBMonth:  0.12,
			EgressPerGB:        0.11,
			APICallsPerMillion: 1.00,
		},

		// ── Azure ───────────────────────────────────────────────────────────
		// Based on B2s (2 vCPU, 4 GB RAM). Azure egress is region-paired.
		{
			CloudProvider:      "azure",
			Region:             "westeurope",
			CPUPerHour:         0.0260,
			MemoryPerGBHour:    0.0065,
			StoragePerGBMonth:  0.10,
			EgressPerGB:        0.08,
			APICallsPerMillion: 1.20,
		},
		{
			CloudProvider:      "azure",
			Region:             "eastus",
			CPUPerHour:         0.0240,
			MemoryPerGBHour:    0.0060,
			StoragePerGBMonth:  0.08,
			EgressPerGB:        0.08,
			APICallsPerMillion: 1.20,
		},
		{
			CloudProvider:      "azure",
			Region:             "southeastasia",
			CPUPerHour:         0.0300,
			MemoryPerGBHour:    0.0075,
			StoragePerGBMonth:  0.13,
			EgressPerGB:        0.10,
			APICallsPerMillion: 1.20,
		},

		// ── GCP ─────────────────────────────────────────────────────────────
		// Based on e2-standard-2 (2 vCPU, 8 GB RAM), adjusted for 4 GB reference.
		// GCP egress is the most expensive of the four providers.
		{
			CloudProvider:      "gcp",
			Region:             "europe-west1",
			CPUPerHour:         0.0240,
			MemoryPerGBHour:    0.0060,
			StoragePerGBMonth:  0.09,
			EgressPerGB:        0.12,
			APICallsPerMillion: 1.50,
		},
		{
			CloudProvider:      "gcp",
			Region:             "us-central1",
			CPUPerHour:         0.0220,
			MemoryPerGBHour:    0.0055,
			StoragePerGBMonth:  0.09,
			EgressPerGB:        0.12,
			APICallsPerMillion: 1.50,
		},
		{
			CloudProvider:      "gcp",
			Region:             "asia-southeast1",
			CPUPerHour:         0.0280,
			MemoryPerGBHour:    0.0070,
			StoragePerGBMonth:  0.11,
			EgressPerGB:        0.14,
			APICallsPerMillion: 1.50,
		},
	}
}

// ─── Accessors ────────────────────────────────────────────────────────────

// DefaultPriceSheets returns all default price sheets. Initialized once on
// first access. Safe for concurrent use.
func DefaultPriceSheets() []domain.CloudPriceSheet {
	priceSheetsOnce.Do(initPriceSheets)
	return defaultPriceSheets
}

// GetPriceSheet looks up a price sheet by cloud provider and region.
// Returns domain.ErrInvalidPriceSheet if no matching sheet is found.
func GetPriceSheet(cloud, region string) (*domain.CloudPriceSheet, error) {
	for _, sheet := range DefaultPriceSheets() {
		if sheet.CloudProvider == cloud && sheet.Region == region {
			s := sheet // copy
			return &s, nil
		}
	}
	return nil, fmt.Errorf("price sheet %s/%s: %w", cloud, region, domain.ErrInvalidPriceSheet)
}

// SupportedProviders returns a map of cloud provider → list of regions.
func SupportedProviders() map[string][]string {
	result := make(map[string][]string)
	for _, sheet := range DefaultPriceSheets() {
		result[sheet.CloudProvider] = append(result[sheet.CloudProvider], sheet.Region)
	}
	return result
}

// ─── Validation ───────────────────────────────────────────────────────────

// ValidatePriceSheet returns an error if any price in the sheet is negative.
func ValidatePriceSheet(sheet *domain.CloudPriceSheet) error {
	if sheet.CloudProvider == "" {
		return fmt.Errorf("cloud_provider is required")
	}
	if sheet.Region == "" {
		return fmt.Errorf("region is required")
	}
	if sheet.CPUPerHour < 0 {
		return fmt.Errorf("cpu_per_hour must be >= 0")
	}
	if sheet.MemoryPerGBHour < 0 {
		return fmt.Errorf("memory_per_gb_hour must be >= 0")
	}
	if sheet.StoragePerGBMonth < 0 {
		return fmt.Errorf("storage_per_gb_month must be >= 0")
	}
	if sheet.EgressPerGB < 0 {
		return fmt.Errorf("egress_per_gb must be >= 0")
	}
	if sheet.APICallsPerMillion < 0 {
		return fmt.Errorf("api_calls_per_million must be >= 0")
	}
	return nil
}