// Package domain defines core types for the FeatureSignals platform.
// Billing types handle invoicing for the flat-rate subscription model.
// Cost-bearing features (AI Janitor, etc.) use the pre-paid credit system
// defined in credits.go.
package domain

import (
	"errors"
	"time"
)

// ─── Invoice Status ───────────────────────────────────────────────────────

const (
	InvoiceStatusPending = "pending"
	InvoiceStatusPaid    = "paid"
	InvoiceStatusFailed  = "failed"
)

// ─── Pro Plan Pricing ─────────────────────────────────────────────────────

const (
	// ProPlanMonthlyPaise is the Pro plan monthly price in INR paise.
	// INR 1,999.00 = 199900 paise. All monetary values use paise to
	// avoid floating-point precision issues.
	ProPlanMonthlyPaise = 199900

	// ProPlanAnnualPaise is the Pro plan annual price in INR paise.
	// INR 19,990.00 = 1999000 paise (~17% discount vs monthly).
	ProPlanAnnualPaise = 1999000

	// ProPlanMonthlyUSDCents is the Pro plan monthly price in USD cents.
	// $29.00 = 2900 cents.
	ProPlanMonthlyUSDCents = 2900

	// DefaultCurrency is the billing currency for all invoices.
	DefaultCurrency = "INR"
)

// ─── Pro Plan Amount Helpers ──────────────────────────────────────────────

// ProPlanAmountPaise returns the Pro plan monthly price in INR paise.
func ProPlanAmountPaise() int64 {
	return ProPlanMonthlyPaise
}

// ProPlanAmountUSDCents returns the Pro plan monthly price in USD cents.
func ProPlanAmountUSDCents() int64 {
	return ProPlanMonthlyUSDCents
}

// ─── Entities ─────────────────────────────────────────────────────────────

// Invoice represents a monthly billing statement for an organization.
// The new flat-rate model: platform_fee + credit_purchases = total.
// All monetary values are stored in paise (int64) to avoid float
// precision issues.
type Invoice struct {
	ID                   string     `json:"id"`
	OrgID                string     `json:"org_id"`
	PeriodStart          time.Time  `json:"period_start"`
	PeriodEnd            time.Time  `json:"period_end"`
	LineItems            []LineItem `json:"line_items"`
	PlatformFeePaise     int64      `json:"platform_fee_paise"`      // e.g., 199900 = INR 1,999.00
	CreditPurchasesPaise int64      `json:"credit_purchases_paise"`  // sum of credit pack purchases this period
	TaxPaise             int64      `json:"tax_paise"`
	TotalPaise           int64      `json:"total_paise"`
	Currency             string     `json:"currency"` // "INR" or "USD"
	Status               string     `json:"status"`   // "pending", "paid", "failed"
	PaidAt               *time.Time `json:"paid_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

// LineItem is a single row on an invoice. Each line item describes one
// charge (platform fee or credit pack purchase) with its amount in paise.
type LineItem struct {
	Description string `json:"description"`  // e.g., "Pro Plan (May 1-31)"
	AmountPaise int64  `json:"amount_paise"` // e.g., 199900
}



// ─── Errors ───────────────────────────────────────────────────────────────

var (
	// ErrInvoiceAlreadyPaid is returned when attempting to modify or
	// cancel a paid invoice.
	ErrInvoiceAlreadyPaid = errors.New("invoice already paid")

	// ErrInvoicePastDue is returned when attempting to pay an invoice
	// past its due date.
	ErrInvoicePastDue = errors.New("invoice past due")
)

// ─── Formatting Helpers ───────────────────────────────────────────────────

// FormatPaiseToINR converts a paise amount to a human-readable INR string.
// 199900 → "1,999.00"
func FormatPaiseToINR(paise int64) string {
	negative := paise < 0
	if negative {
		paise = -paise
	}
	rupees := paise / 100
	paiseRemainder := paise % 100

	// Format rupees with commas for Indian numbering (e.g., 1,999).
	rs := formatIntWithCommas(rupees)
	result := rs + "." + padTwoDigits(paiseRemainder)
	if negative {
		result = "-" + result
	}
	return result
}

// FormatPaiseToUSD converts a USD cents amount to a human-readable USD string.
// 2900 → "29.00"
func FormatPaiseToUSD(cents int64) string {
	negative := cents < 0
	if negative {
		cents = -cents
	}
	dollars := cents / 100
	centsRemainder := cents % 100

	ds := formatIntWithCommas(dollars)
	result := ds + "." + padTwoDigits(centsRemainder)
	if negative {
		result = "-" + result
	}
	return result
}

func formatIntWithCommas(n int64) string {
	if n == 0 {
		return "0"
	}
	// Build string in reverse with commas every 3 digits (Indian: last 3, then every 2).
	// For simplicity and global readability, use international grouping (every 3).
	s := intToStr(n)
	// Insert commas: from right, every 3 digits.
	var result []byte
	for i := len(s) - 1; i >= 0; i-- {
		if (len(s)-1-i) > 0 && (len(s)-1-i)%3 == 0 {
			result = append([]byte{','}, result...)
		}
		result = append([]byte{s[i]}, result...)
	}
	return string(result)
}

func padTwoDigits(n int64) string {
	if n < 10 {
		return "0" + intToStr(n)
	}
	return intToStr(n)
}

func intToStr(n int64) string {
	if n == 0 {
		return "0"
	}
	negative := n < 0
	if negative {
		n = -n
	}
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
