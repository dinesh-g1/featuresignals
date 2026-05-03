// Package domain defines core types for the FeatureSignals platform.
// Credit types handle the pre-paid credit system for cost-bearing features
// (AI Janitor, future LLM features, compute-heavy operations).
package domain

import (
	"context"
	"errors"
	"time"
)

// ─── CostBearer ───────────────────────────────────────────────────────────

// CostBearer represents a feature that incurs marginal cost per use.
// Each bearer is registered once at startup via migrations or admin API;
// the billing system automatically handles credit tracking, invoicing,
// and balance alerts for all registered bearers.
type CostBearer struct {
	ID          string `json:"id"`           // e.g., "ai_janitor"
	DisplayName string `json:"display_name"` // e.g., "AI Janitor Actions"
	Description string `json:"description"`  // e.g., "Scan repos, analyze flags, apply fixes"
	UnitName    string `json:"unit_name"`    // e.g., "scan credit"
	FreeUnits   int    `json:"free_units"`   // included per month on Free tier
	ProUnits    int    `json:"pro_units"`    // included per month on Pro tier
}

// CreditPack is a purchasable bundle of units for a CostBearer.
type CreditPack struct {
	ID         string `json:"id"`          // e.g., "ai_janitor_starter"
	BearerID   string `json:"bearer_id"`   // e.g., "ai_janitor"
	Name       string `json:"name"`        // e.g., "Starter"
	Credits    int    `json:"credits"`      // e.g., 50
	PricePaise int64  `json:"price_paise"` // e.g., 24900 (INR 249.00)
	IsActive   bool   `json:"is_active"`
}

// CreditBalance is the current credit state for one organization + one bearer.
type CreditBalance struct {
	OrgID        string    `json:"org_id"`
	BearerID     string    `json:"bearer_id"`
	Balance      int       `json:"balance"`
	LifetimeUsed int       `json:"lifetime_used"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreditPurchase records a credit pack purchase for audit trail and invoicing.
type CreditPurchase struct {
	ID          string    `json:"id"`
	OrgID       string    `json:"org_id"`
	PackID      string    `json:"pack_id"`
	BearerID    string    `json:"bearer_id"`
	Credits     int       `json:"credits"`
	PricePaise  int64     `json:"price_paise"`
	InvoiceID   string    `json:"invoice_id,omitempty"`
	PurchasedAt time.Time `json:"purchased_at"`
}

// CreditConsumption records a single credit deduction for audit trail.
type CreditConsumption struct {
	ID             string         `json:"id"`
	OrgID          string         `json:"org_id"`
	BearerID       string         `json:"bearer_id"`
	Operation      string         `json:"operation"`       // e.g., "scan_repo", "analyze_flag", "apply_fix"
	Credits        int            `json:"credits"`         // credits consumed (positive)
	Metadata       map[string]any `json:"metadata,omitempty"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	ConsumedAt     time.Time      `json:"consumed_at"`
}

// ─── CreditStore ──────────────────────────────────────────────────────────

// CreditStore is the persistence interface for the credit system.
// Implemented in store/postgres/credit_store.go.
type CreditStore interface {
	// ── Bearer & Pack Management ──────────────────────────────────────

	// ListCostBearers returns all registered cost bearers.
	ListCostBearers(ctx context.Context) ([]CostBearer, error)

	// GetCostBearer returns a single cost bearer by ID.
	GetCostBearer(ctx context.Context, bearerID string) (*CostBearer, error)

	// ListCreditPacks returns all active credit packs for a bearer.
	ListCreditPacks(ctx context.Context, bearerID string) ([]CreditPack, error)

	// GetCreditPack returns a single credit pack by ID.
	GetCreditPack(ctx context.Context, packID string) (*CreditPack, error)

	// ── Balance Operations ────────────────────────────────────────────

	// GetCreditBalance returns the current balance for an org+bearer pair.
	// Returns zero balance (not error) if no balance row exists yet.
	GetCreditBalance(ctx context.Context, orgID, bearerID string) (*CreditBalance, error)

	// ListCreditBalances returns all credit balances for an organization.
	ListCreditBalances(ctx context.Context, orgID string) ([]CreditBalance, error)

	// ── Atomic Operations ─────────────────────────────────────────────

	// ConsumeCredits atomically deducts credits from an org's balance.
	// Uses UPDATE ... WHERE balance >= $credits RETURNING balance.
	// Returns the new balance or ErrInsufficientCredits.
	// Idempotent: reusing the same idempotencyKey returns the previous
	// consumption without deducting again.
	ConsumeCredits(ctx context.Context, orgID, bearerID string, credits int,
		operation string, metadata map[string]any, idempotencyKey string) (newBalance int, err error)

	// PurchaseCredits processes a credit pack purchase in a single transaction:
	// 1. Validates the pack exists and is active
	// 2. Creates a purchase record
	// 3. Atomically adds credits to the balance (INSERT ... ON CONFLICT UPDATE)
	// Returns the purchase record for invoice inclusion.
	PurchaseCredits(ctx context.Context, orgID, packID string) (*CreditPurchase, error)

	// ── History ───────────────────────────────────────────────────────

	// ListCreditPurchases returns credit pack purchases for an org,
	// ordered by purchase date descending.
	ListCreditPurchases(ctx context.Context, orgID string, limit, offset int) ([]CreditPurchase, error)

	// ListCreditConsumptions returns credit consumption records for an org,
	// optionally filtered by bearer, ordered by consumption date descending.
	ListCreditConsumptions(ctx context.Context, orgID, bearerID string, limit, offset int) ([]CreditConsumption, error)

	// ── Monthly Reset ─────────────────────────────────────────────────

	// GrantMonthlyCredits gives included monthly credits at the start of a
	// billing period. Idempotent: safe to call multiple times per period
	// (tracks grants in monthly_credit_grants table).
	GrantMonthlyCredits(ctx context.Context, orgID, plan string, periodStart time.Time) error
}

// ─── Credit Errors ────────────────────────────────────────────────────────

var (
	// ErrInsufficientCredits is returned when an org lacks credits for an operation.
	ErrInsufficientCredits = errors.New("insufficient credits")

	// ErrInvalidCreditPack is returned when a credit pack ID does not exist
	// or is not active.
	ErrInvalidCreditPack = errors.New("invalid credit pack")

	// ErrBearerNotFound is returned when a cost bearer ID is not registered.
	ErrBearerNotFound = errors.New("cost bearer not found")
)
