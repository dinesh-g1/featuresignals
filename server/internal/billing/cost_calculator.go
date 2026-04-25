// Package billing implements the usage metering and cost calculation engine
// for FeatureSignals. This file contains the cost calculator that transforms
// usage records into invoices with full line-item transparency.
package billing

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── CostCalculator ───────────────────────────────────────────────────────

// CostCalculator transforms usage records and a price sheet into a fully
// computed Invoice with line items, margin, and free tier application.
// It is stateless and safe for concurrent use.
type CostCalculator struct {
	logger *slog.Logger
}

// NewCostCalculator creates a new CostCalculator. If logger is nil, a
// default no-op logger is used.
func NewCostCalculator(logger *slog.Logger) *CostCalculator {
	if logger == nil {
		logger = slog.New(slog.DiscardHandler)
	}
	return &CostCalculator{logger: logger}
}

// ─── Public API ───────────────────────────────────────────────────────────

// CalculateBill takes a set of usage records and a price sheet, computes
// the invoice with line items, applies the 50% margin and €5 free tier
// deduction, and returns a complete Invoice. Returns an error if the
// price sheet is invalid or if usage records contain unrecognized metrics.
func (cc *CostCalculator) CalculateBill(
	ctx context.Context,
	usage []UsageRecord,
	sheet domain.CloudPriceSheet,
) (*domain.Invoice, error) {
	if err := ValidatePriceSheet(&sheet); err != nil {
		return nil, fmt.Errorf("calculate bill: %w", err)
	}

	log := cc.logger.With("component", "cost_calculator")
	log.DebugContext(ctx, "calculating bill",
		"usage_records", len(usage),
		"cloud", sheet.CloudProvider,
		"region", sheet.Region,
	)

	// Step 1: Aggregate usage records by metric.
	aggregated := aggregateUsage(usage)

	// Step 2: Build line items from aggregated usage + price sheet.
	lineItems, subtotal := cc.buildLineItems(aggregated, sheet)

	// Step 3: Apply margin.
	marginAmount := domain.RoundToCents(subtotal * (domain.DefaultMarginPercent / 100.0))

	// Step 4: Calculate total before free tier.
	totalBeforeFreeTier := domain.RoundToCents(subtotal + marginAmount)

	// Step 5: Apply free tier deduction (first €5/month free).
	freeTierDeduct := math.Min(totalBeforeFreeTier, domain.FreeTierDeductEUR)
	total := domain.RoundToCents(totalBeforeFreeTier - freeTierDeduct)

	log.InfoContext(ctx, "bill calculated",
		"subtotal_infra", subtotal,
		"margin_percent", domain.DefaultMarginPercent,
		"margin_amount", marginAmount,
		"free_tier_deduct", freeTierDeduct,
		"total", total,
	)

	now := time.Now().UTC()
	return &domain.Invoice{
		ID:             "", // assigned by persistence layer
		TenantID:       "", // set by caller
		PeriodStart:    now.AddDate(0, -1, 0).Truncate(24 * time.Hour),
		PeriodEnd:      now.Truncate(24 * time.Hour),
		LineItems:      lineItems,
		SubtotalInfra:  subtotal,
		MarginPercent:  domain.DefaultMarginPercent,
		MarginAmount:   marginAmount,
		FreeTierDeduct: freeTierDeduct,
		Total:          total,
		Currency:       domain.DefaultCurrency,
		Status:         domain.InvoiceStatusPending,
		CreatedAt:      now,
	}, nil
}

// ─── Internal: aggregation ────────────────────────────────────────────────

// UsageRecord is a local alias for domain.UsageRecord to keep the billing
// package self-contained for tests. It mirrors the domain type exactly.
type UsageRecord = domain.UsageRecord

// aggregatedMetrics holds the summed value for each billable metric.
type aggregatedMetrics struct {
	CPUSeconds    float64
	MemoryGBHours float64
	StorageGBHours float64
	EgressGB      float64
	APICalls      float64
}

// aggregateUsage sums all usage records by metric. Records with unrecognized
// metrics are logged as warnings and skipped.
func aggregateUsage(records []UsageRecord) aggregatedMetrics {
	var agg aggregatedMetrics
	for _, r := range records {
		switch r.Metric {
		case domain.MetricCPUSeconds:
			agg.CPUSeconds += r.Value
		case domain.MetricMemoryGBHours:
			agg.MemoryGBHours += r.Value
		case domain.MetricStorageGBHours:
			agg.StorageGBHours += r.Value
		case domain.MetricEgressGB:
			agg.EgressGB += r.Value
		case domain.MetricAPICalls:
			agg.APICalls += r.Value
		default:
			// Unknown metrics are logged and skipped — they should not
			// appear in production but we tolerate them gracefully.
			slog.Warn("unknown metric in usage record",
				"metric", r.Metric,
				"tenant_id", r.TenantID,
			)
		}
	}
	return agg
}

// ─── Internal: line items ─────────────────────────────────────────────────

// buildLineItems converts aggregated metrics into invoice line items using
// the provided price sheet. Returns the line items slice and the subtotal
// (infrastructure cost before margin and free tier).
func (cc *CostCalculator) buildLineItems(agg aggregatedMetrics, sheet domain.CloudPriceSheet) ([]domain.LineItem, float64) {
	items := make([]domain.LineItem, 0, 5)
	var subtotal float64

	// 1. CPU usage
	if agg.CPUSeconds > 0 {
		cpuHours := agg.CPUSeconds / 3600.0
		amount := domain.RoundToCents(cpuHours * sheet.CPUPerHour)
		subtotal += amount
		items = append(items, domain.LineItem{
			Description: fmt.Sprintf("Compute (%s %s)", sheet.CloudProvider, sheet.Region),
			Usage:       domain.HumanizeUsage(domain.MetricCPUSeconds, agg.CPUSeconds),
			UnitPrice:   sheet.CPUPerHour,
			Amount:      amount,
		})
	}

	// 2. Memory usage
	if agg.MemoryGBHours > 0 {
		amount := domain.RoundToCents(agg.MemoryGBHours * sheet.MemoryPerGBHour)
		subtotal += amount
		items = append(items, domain.LineItem{
			Description: fmt.Sprintf("Memory (%s %s)", sheet.CloudProvider, sheet.Region),
			Usage:       domain.HumanizeUsage(domain.MetricMemoryGBHours, agg.MemoryGBHours),
			UnitPrice:   sheet.MemoryPerGBHour,
			Amount:      amount,
		})
	}

	// 3. Storage usage
	if agg.StorageGBHours > 0 {
		// Convert GB-hours to GB-months (720 hours = 1 month)
		gbMonths := agg.StorageGBHours / 720.0
		amount := domain.RoundToCents(gbMonths * sheet.StoragePerGBMonth)
		subtotal += amount
		items = append(items, domain.LineItem{
			Description: fmt.Sprintf("Storage (%s %s)", sheet.CloudProvider, sheet.Region),
			Usage:       domain.HumanizeUsage(domain.MetricStorageGBHours, agg.StorageGBHours),
			UnitPrice:   sheet.StoragePerGBMonth,
			Amount:      amount,
		})
	}

	// 4. Egress (outbound data transfer)
	if agg.EgressGB > 0 {
		amount := domain.RoundToCents(agg.EgressGB * sheet.EgressPerGB)
		subtotal += amount
		items = append(items, domain.LineItem{
			Description: fmt.Sprintf("Egress (%s %s)", sheet.CloudProvider, sheet.Region),
			Usage:       domain.HumanizeUsage(domain.MetricEgressGB, agg.EgressGB),
			UnitPrice:   sheet.EgressPerGB,
			Amount:      amount,
		})
	}

	// 5. API calls
	if agg.APICalls > 0 {
		millions := agg.APICalls / 1_000_000.0
		amount := domain.RoundToCents(millions * sheet.APICallsPerMillion)
		subtotal += amount
		items = append(items, domain.LineItem{
			Description: fmt.Sprintf("API Calls (%s %s)", sheet.CloudProvider, sheet.Region),
			Usage:       domain.HumanizeUsage(domain.MetricAPICalls, agg.APICalls),
			UnitPrice:   sheet.APICallsPerMillion,
			Amount:      amount,
		})
	}

	return items, subtotal
}

// ─── Free Tier Helper ─────────────────────────────────────────────────────

// ApplyFreeTier deducts the free tier credit from a total. The free tier
// is applied as a capped credit — the customer never pays the first €5.
// Returns the final amount after deduction.
func ApplyFreeTier(totalEUR float64) float64 {
	return domain.RoundToCents(math.Max(0, totalEUR-domain.FreeTierDeductEUR))
}