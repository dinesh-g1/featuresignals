// Package domain defines core types for the FeatureSignals platform.
// Billing types handle usage metering, cost calculation, and invoicing
// across cloud providers and regions.
package domain

import (
	"context"
	"errors"
	"time"
)

// ─── Usage & Metering ─────────────────────────────────────────────────────

// UsageMetric constants for metering — these are the five billable metrics.
const (
	MetricCPUSeconds    = "cpu_seconds"
	MetricMemoryGBHours = "memory_gb_hours"
	MetricStorageGBHours = "storage_gb_hours"
	MetricEgressGB      = "egress_gb"
	MetricAPICalls      = "api_calls"
)

// ValidBillableMetrics returns all billable metric names for validation.
func ValidBillableMetrics() []string {
	return []string{
		MetricCPUSeconds,
		MetricMemoryGBHours,
		MetricStorageGBHours,
		MetricEgressGB,
		MetricAPICalls,
	}
}

// IsValidMetric returns true if the given metric is a recognized billable metric.
func IsValidMetric(metric string) bool {
	switch metric {
	case MetricCPUSeconds, MetricMemoryGBHours, MetricStorageGBHours, MetricEgressGB, MetricAPICalls:
		return true
	default:
		return false
	}
}

// ─── Invoice Status ───────────────────────────────────────────────────────

const (
	InvoiceStatusPending = "pending"
	InvoiceStatusPaid    = "paid"
	InvoiceStatusFailed  = "failed"
)

// DefaultMarginPercent is the standard markup over infrastructure cost (50%).
const DefaultMarginPercent = 50.0

// FreeTierDeductEUR is the monthly free tier credit in EUR.
const FreeTierDeductEUR = 5.0

// DefaultCurrency is the billing currency for all invoices.
const DefaultCurrency = "EUR"

// ─── Entities ─────────────────────────────────────────────────────────────

// UsageRecord represents a single metering data point ingested from the
// infrastructure monitoring pipeline. Records are batched and written to the
// usage_records table at high volume.
type UsageRecord struct {
	ID         string    `json:"id"`
	TenantID   string    `json:"tenant_id"`
	Metric     string    `json:"metric"`      // "cpu_seconds", "memory_gb_hours", "storage_gb_hours", "egress_gb", "api_calls"
	Value      float64   `json:"value"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	RecordedAt time.Time `json:"recorded_at"`
}

// Invoice represents a monthly billing statement for a tenant. It includes a
// full line-item breakdown of infrastructure usage, the 50% margin, and the
// €5 free tier deduction. Every invoice is transparent — the customer sees
// exactly what they used and what it cost.
type Invoice struct {
	ID             string     `json:"id"`
	TenantID       string     `json:"tenant_id"`
	PeriodStart    time.Time  `json:"period_start"`
	PeriodEnd      time.Time  `json:"period_end"`
	LineItems      []LineItem `json:"line_items"`
	SubtotalInfra  float64    `json:"subtotal_infra"`
	MarginPercent  float64    `json:"margin_percent"`
	MarginAmount   float64    `json:"margin_amount"`
	FreeTierDeduct float64    `json:"free_tier_deduct"`
	Total          float64    `json:"total"`
	Currency       string     `json:"currency"`
	Status         string     `json:"status"` // "pending", "paid", "failed"
	CreatedAt      time.Time  `json:"created_at"`
	PaidAt         *time.Time `json:"paid_at,omitempty"`
}

// LineItem is a single row on an invoice describing one billable metric's
// usage during the billing period. The Usage field is a human-readable
// quantity string (e.g. "720 CPU-hours", "1,024 GB-months").
type LineItem struct {
	Description string  `json:"description"`
	Usage       string  `json:"usage"`       // Human-readable: "720 CPU-hours"
	UnitPrice   float64 `json:"unit_price"`
	Amount      float64 `json:"amount"`
}

// CloudPriceSheet defines the per-unit infrastructure costs for a specific
// cloud provider and region combination. Prices are in EUR per the stated unit
// (per hour, per GB-month, per GB, per million calls).
//
// Prices are loaded from the price_sheets table and cached for the evaluation
// hot path. Updates propagate via the same LISTEN/NOTIFY mechanism used by
// the flag evaluation cache.
type CloudPriceSheet struct {
	CloudProvider    string  `json:"cloud_provider"`
	Region           string  `json:"region"`
	CPUPerHour       float64 `json:"cpu_per_hour"`
	MemoryPerGBHour  float64 `json:"memory_per_gb_hour"`
	StoragePerGBMonth float64 `json:"storage_per_gb_month"`
	EgressPerGB      float64 `json:"egress_per_gb"`
	APICallsPerMillion float64 `json:"api_calls_per_million"`
}

// ─── BillingProvider ──────────────────────────────────────────────────────

// BillingProvider is the domain interface for all billing operations. It
// abstracts cost calculation, price sheet lookups, usage tracking, and
// invoice management behind a single, testable interface.
//
// Implementations live in server/internal/billing/ and must not be imported
// from handlers — handlers depend on this interface only.
type BillingProvider interface {
	// CalculateBill takes a set of usage records and a price sheet and returns
	// a fully computed invoice with line items, margin, and free tier deduction.
	CalculateBill(ctx context.Context, usage []UsageRecord, sheet CloudPriceSheet) (*Invoice, error)

	// GetPriceSheet returns the current pricing for a given cloud and region.
	GetPriceSheet(ctx context.Context, cloud, region string) (*CloudPriceSheet, error)

	// GetUsage returns all usage records for a tenant within a time window.
	GetUsage(ctx context.Context, tenantID string, start, end time.Time) ([]UsageRecord, error)

	// RecordUsage persists a batch of usage records. This is called by the
	// metering middleware on a background goroutine — never on the request path.
	RecordUsage(ctx context.Context, records []UsageRecord) error

	// GetInvoice returns a single invoice by ID.
	GetInvoice(ctx context.Context, invoiceID string) (*Invoice, error)

	// ListInvoices returns all invoices for a tenant, most recent first.
	ListInvoices(ctx context.Context, tenantID string) ([]*Invoice, error)

	// GetMRR returns the total Monthly Recurring Revenue across all tenants.
	GetMRR(ctx context.Context) (float64, error)
}

// ─── MeteringMiddleware ───────────────────────────────────────────────────

// MeteringMiddleware records usage metrics for every API request. It is
// designed to be non-blocking — writes are batched and flushed on a background
// goroutine so the request path is never slowed down.
type MeteringMiddleware interface {
	// RecordRequest records a single API request's metering data (duration,
	// endpoint, status code) for the given tenant. This must never block or
	// return errors to the caller — failures are logged and swallowed.
	RecordRequest(ctx context.Context, tenantID, endpoint string, statusCode int, duration time.Duration) error
}

// ─── Errors ───────────────────────────────────────────────────────────────

var (
	// ErrInvalidPriceSheet is returned when a price sheet cannot be found for
	// the requested cloud provider and region combination.
	ErrInvalidPriceSheet = errors.New("invalid price sheet")

	// ErrInvoiceAlreadyPaid is returned when attempting to modify or cancel a
	// paid invoice.
	ErrInvoiceAlreadyPaid = errors.New("invoice already paid")

	// ErrInvoicePastDue is returned when attempting to pay an invoice past its
	// due date.
	ErrInvoicePastDue = errors.New("invoice past due")
)

// ─── Helpers ──────────────────────────────────────────────────────────────

// RoundToCents rounds a float64 to two decimal places (euro cents).
// This is the standard rounding for all monetary values in the billing system.
func RoundToCents(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100.0
}

// HumanizeUsage converts a raw usage value and metric name into a
// human-readable string for display in invoice line items.
func HumanizeUsage(metric string, value float64) string {
	switch metric {
	case MetricCPUSeconds:
		hours := value / 3600.0
		return formatQuantity(hours, "CPU-hours")
	case MetricMemoryGBHours:
		return formatQuantity(value, "GB-hours")
	case MetricStorageGBHours:
		gbMonths := value / 720.0 // approximate: hours → 30-day month
		return formatQuantity(gbMonths, "GB-months")
	case MetricEgressGB:
		return formatQuantity(value, "GB")
	case MetricAPICalls:
		millions := value / 1_000_000.0
		return formatQuantity(millions, "M calls")
	default:
		return formatQuantity(value, "units")
	}
}

func formatQuantity(value float64, unit string) string {
	if value < 1 {
		return formatDecimal(value, 2) + " " + unit
	}
	return formatDecimal(value, 0) + " " + unit
}

func formatDecimal(value float64, prec int) string {
	// Use integer arithmetic to avoid float formatting issues.
	mult := 1.0
	for i := 0; i < prec; i++ {
		mult *= 10
	}
	trunc := int64(value * mult)
	if prec == 0 {
		return intToStr(trunc)
	}
	intPart := trunc / int64(mult)
	fracPart := trunc % int64(mult)
	if fracPart < 0 {
		fracPart = -fracPart
	}
	return intToStr(intPart) + "." + padZeros(fracPart, prec)
}

func intToStr(n int64) string {
	if n == 0 {
		return "0"
	}
	negative := n < 0
	if negative {
		n = -n
	}
	// Build reversed digits.
	var buf [32]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if negative {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

func padZeros(n int64, width int) string {
	s := intToStr(n)
	for len(s) < width {
		s = "0" + s
	}
	return s
}