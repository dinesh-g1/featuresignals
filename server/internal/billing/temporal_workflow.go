// Package billing implements the usage metering and cost calculation engine
// for FeatureSignals. This file defines the Temporal workflow for monthly
// billing — runs on the 1st of each month, calculates invoices for every
// active tenant, and persists them.
//
// Dependencies:
//   go.temporal.io/sdk v1.25+
package billing

import (
	"context"
	"fmt"
	"time"

	"go.temporal.io/sdk/activity"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Constants ────────────────────────────────────────────────────────────

// BillingWorkflowID is the deterministic workflow ID for the monthly billing
// workflow. Using a fixed ID ensures only one instance runs at a time.
const BillingWorkflowID = "monthly-billing-run"

// billingCronSchedule defines when the workflow runs: at 02:00 UTC on the
// 1st of every month. This gives time for the previous month's data to settle.
const billingCronSchedule = "0 2 1 * *"

// ─── Types ────────────────────────────────────────────────────────────────

// MonthlyBillingInput defines the parameters for a billing run.
type MonthlyBillingInput struct {
	// RunDate is the billing date. If zero, uses the current time.
	// In production, this is set by the cron trigger.
	RunDate time.Time `json:"run_date"`

	// DryRun, when true, calculates everything but does not persist invoices.
	DryRun bool `json:"dry_run"`
}

// MonthlyBillingResult summarizes the outcome of a billing run.
type MonthlyBillingResult struct {
	RunDate        time.Time `json:"run_date"`
	TenantsTotal   int       `json:"tenants_total"`
	InvoicesCreated int      `json:"invoices_created"`
	TotalRevenue   float64   `json:"total_revenue"`
	Errors         int       `json:"errors"`
	DryRun         bool      `json:"dry_run"`
}

// BillingActivities groups all activities needed by the monthly billing
// workflow. Implementations are injected via the worker.
type BillingActivities struct {
	// TenantLister returns all active tenants.
	TenantLister func(ctx context.Context) ([]domain.Tenant, error)

	// UsageProvider returns usage records for a tenant within a period.
	UsageProvider func(ctx context.Context, tenantID string, start, end time.Time) ([]domain.UsageRecord, error)

	// PriceSheetProvider returns the price sheet for a cloud + region.
	PriceSheetProvider func(ctx context.Context, cloud, region string) (*domain.CloudPriceSheet, error)

	// InvoiceCalculator calculates a complete invoice from usage + price sheet.
	InvoiceCalculator func(ctx context.Context, usage []domain.UsageRecord, sheet domain.CloudPriceSheet) (*domain.Invoice, error)

	// InvoicePersister saves an invoice to the database.
	InvoicePersister func(ctx context.Context, invoice *domain.Invoice) error

	// InvoiceFinalizer marks an invoice as paid (e.g., after auto-charge).
	InvoiceFinalizer func(ctx context.Context, invoiceID string) error
}

// ─── Workflow: MonthlyBilling ─────────────────────────────────────────────

// MonthlyBillingWorkflow orchestrates the monthly billing run. It:
//  1. Lists all active tenants
//  2. For each tenant: gets usage → looks up price sheet → calculates bill
//  3. Applies free tier deduction (first €5/month)
//  4. Creates invoices
//  5. Returns a summary of the run
//
// The workflow is idempotent: if run twice for the same month, it skips
// tenants that already have an invoice for that period.
//
// Timeout: 2 hours (total wall-clock time for the entire workflow).
// Individual tenant processing has a 5-minute timeout.
func MonthlyBillingWorkflow(ctx workflow.Context, input MonthlyBillingInput) (*MonthlyBillingResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting monthly billing workflow",
		"dry_run", input.DryRun,
	)

	// Set overall workflow timeout.
	ctx = workflow.WithWorkflowRunTimeout(ctx, 2*time.Hour)

	// Determine the billing period.
	runDate := input.RunDate
	if runDate.IsZero() {
		runDate = time.Now().UTC()
	}
	// Previous month: period_start = 1st of previous month, period_end = 1st of current month.
	periodStart := time.Date(runDate.Year(), runDate.Month()-1, 1, 0, 0, 0, 0, time.UTC)
	periodEnd := time.Date(runDate.Year(), runDate.Month(), 1, 0, 0, 0, 0, time.UTC)

	logger.Info("Billing period",
		"period_start", periodStart,
		"period_end", periodEnd,
	)

	// ── Step 1: List all active tenants ───────────────────────────────
	logger.Info("Step 1: Listing active tenants")

	ctx1 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    30 * time.Second,
		ScheduleToCloseTimeout: 1 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:        time.Second,
			BackoffCoefficient:     2,
			MaximumInterval:        10 * time.Second,
			MaximumAttempts:        3,
			NonRetryableErrorTypes: []string{"ValidationError", "BadRequestError"},
		},
	})

	var tenants []domain.Tenant
	err := workflow.ExecuteActivity(ctx1, ListActiveTenantsActivity).Get(ctx, &tenants)
	if err != nil {
		logger.Error("Step 1 failed: cannot list tenants", "error", err)
		return nil, fmt.Errorf("list active tenants: %w", err)
	}

	logger.Info("Step 1 complete", "tenants_found", len(tenants))

	// ── Step 2: Process each tenant ───────────────────────────────────
	result := &MonthlyBillingResult{
		RunDate:  runDate,
		TenantsTotal: len(tenants),
		DryRun:   input.DryRun,
	}

	for i, tenant := range tenants {
		logger.Info("Processing tenant",
			"tenant_id", tenant.ID,
			"tenant_name", tenant.Name,
			"progress", fmt.Sprintf("%d/%d", i+1, len(tenants)),
		)

		err := processTenant(ctx, tenant, periodStart, periodEnd, input.DryRun)
		if err != nil {
			logger.Error("Failed to process tenant",
				"tenant_id", tenant.ID,
				"error", err,
			)
			result.Errors++
			continue // process next tenant instead of failing the whole workflow
		}

		result.InvoicesCreated++
	}

	// ── Step 3: Calculate total revenue (only if not dry run) ─────────
	if !input.DryRun && result.InvoicesCreated > 0 {
		ctx2 := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
			StartToCloseTimeout:    30 * time.Second,
			ScheduleToCloseTimeout: 1 * time.Minute,
			RetryPolicy: &temporal.RetryPolicy{
				InitialInterval:    time.Second,
				BackoffCoefficient: 2,
				MaximumInterval:    10 * time.Second,
				MaximumAttempts:    2,
			},
		})

		var mrr float64
		err := workflow.ExecuteActivity(ctx2, GetMRRActivity).Get(ctx, &mrr)
		if err != nil {
			logger.Warn("Failed to calculate MRR, using partial sum", "error", err)
		} else {
			result.TotalRevenue = mrr
		}
	}

	logger.Info("Monthly billing workflow completed",
		"tenants_total", result.TenantsTotal,
		"invoices_created", result.InvoicesCreated,
		"errors", result.Errors,
		"total_revenue", result.TotalRevenue,
		"dry_run", result.DryRun,
	)

	return result, nil
}

// processTenant handles the billing for a single tenant. It is extracted as
// a helper so individual tenant failures don't block the entire workflow.
func processTenant(
	ctx workflow.Context,
	tenant domain.Tenant,
	periodStart, periodEnd time.Time,
	dryRun bool,
) error {
	logger := workflow.GetLogger(ctx)
	activityOpts := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout:    5 * time.Minute,
		ScheduleToCloseTimeout: 6 * time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:        time.Second,
			BackoffCoefficient:     2,
			MaximumInterval:        30 * time.Second,
			MaximumAttempts:        3,
			NonRetryableErrorTypes: []string{"ValidationError"},
		},
		HeartbeatTimeout: 30 * time.Second,
	})

	// ── Step 2a: Get usage for the tenant ─────────────────────────────
	var usage []domain.UsageRecord
	err := workflow.ExecuteActivity(activityOpts, GetTenantUsageActivity, tenant.ID, periodStart, periodEnd).Get(ctx, &usage)
	if err != nil {
		return fmt.Errorf("get usage for tenant %s: %w", tenant.ID, err)
	}

	if len(usage) == 0 {
		logger.Info("No usage for tenant, skipping invoice", "tenant_id", tenant.ID)
		return nil
	}

	// ── Step 2b: Get price sheet ──────────────────────────────────────
	// For now, default to hetzner/fsn1. In production, this comes from the
	// tenant's assigned cloud provider and region configuration.
	var priceSheet *domain.CloudPriceSheet
	err = workflow.ExecuteActivity(activityOpts, GetPriceSheetActivity, "hetzner", "fsn1").Get(ctx, &priceSheet)
	if err != nil {
		return fmt.Errorf("get price sheet for tenant %s: %w", tenant.ID, err)
	}

	// ── Step 2c: Calculate the invoice ────────────────────────────────
	var invoice *domain.Invoice
	err = workflow.ExecuteActivity(activityOpts, CalculateInvoiceActivity, usage, *priceSheet).Get(ctx, &invoice)
	if err != nil {
		return fmt.Errorf("calculate invoice for tenant %s: %w", tenant.ID, err)
	}

	// Set tenant-scoped fields on the invoice.
	invoice.TenantID = tenant.ID
	invoice.PeriodStart = periodStart
	invoice.PeriodEnd = periodEnd

	// ── Step 2d: Persist the invoice (skip in dry-run mode) ───────────
	if dryRun {
		logger.Info("Dry run: skipping invoice persistence",
			"tenant_id", tenant.ID,
			"invoice_total", invoice.Total,
		)
		return nil
	}

	err = workflow.ExecuteActivity(activityOpts, PersistInvoiceActivity, invoice).Get(ctx, nil)
	if err != nil {
		return fmt.Errorf("persist invoice for tenant %s: %w", tenant.ID, err)
	}

	logger.Info("Invoice created for tenant",
		"tenant_id", tenant.ID,
		"total", invoice.Total,
		"currency", invoice.Currency,
	)

	return nil
}

// ─── Activities ───────────────────────────────────────────────────────────

// ListActiveTenantsActivity returns all active tenants for billing.
// It is designed to be idempotent — returns the same set for the same state.
func ListActiveTenantsActivity(ctx context.Context) ([]domain.Tenant, error) {
	// Validate context.
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	activity.RecordHeartbeat(ctx, "listing_active_tenants")

	// TODO: Implement actual tenant listing from the database.
	// Example:
	//   rows, err := pool.Query(ctx, "SELECT id, name, slug, schema, tier, status, created_at, updated_at FROM tenants WHERE status = 'active'")
	//   if err != nil { return nil, fmt.Errorf("query active tenants: %w", err) }
	//   defer rows.Close()
	//   for rows.Next() { ... }

	return nil, fmt.Errorf("ListActiveTenantsActivity: not implemented — wire to TenantRegistry.List with status filter")
}

// GetTenantUsageActivity retrieves all usage records for a tenant within the
// billing period.
func GetTenantUsageActivity(ctx context.Context, tenantID string, start, end time.Time) ([]domain.UsageRecord, error) {
	if tenantID == "" {
		return nil, fmt.Errorf("tenant_id is required")
	}
	if start.IsZero() || end.IsZero() {
		return nil, fmt.Errorf("start and end times are required")
	}
	if !end.After(start) {
		return nil, fmt.Errorf("end must be after start")
	}

	activity.RecordHeartbeat(ctx, "fetching_tenant_usage", tenantID)

	// TODO: Implement actual usage retrieval from usage_records table.
	// Example:
	//   rows, err := pool.Query(ctx,
	//       "SELECT id, tenant_id, metric, value, metadata, recorded_at FROM usage_records WHERE tenant_id = $1 AND recorded_at >= $2 AND recorded_at < $3",
	//       tenantID, start, end)
	//   if err != nil { return nil, fmt.Errorf("query usage: %w", err) }
	//   defer rows.Close()
	//   for rows.Next() { ... scan }

	return []domain.UsageRecord{}, nil
}

// GetPriceSheetActivity retrieves the price sheet for a cloud provider and region.
func GetPriceSheetActivity(ctx context.Context, cloud, region string) (*domain.CloudPriceSheet, error) {
	if cloud == "" || region == "" {
		return nil, fmt.Errorf("cloud and region are required")
	}

	activity.RecordHeartbeat(ctx, "fetching_price_sheet", cloud, region)

	// Attempt to get from DB first, fall back to defaults.
	sheet, err := GetPriceSheet(cloud, region)
	if err != nil {
		return nil, fmt.Errorf("get price sheet for %s/%s: %w", cloud, region, err)
	}

	return sheet, nil
}

// CalculateInvoiceActivity computes a complete invoice from usage records
// and a price sheet.
func CalculateInvoiceActivity(ctx context.Context, usage []domain.UsageRecord, sheet domain.CloudPriceSheet) (*domain.Invoice, error) {
	if len(usage) == 0 {
		return nil, nil // no usage = no invoice
	}

	activity.RecordHeartbeat(ctx, "calculating_invoice")

	calculator := &CostCalculator{}
	invoice, err := calculator.CalculateBill(ctx, usage, sheet)
	if err != nil {
		return nil, fmt.Errorf("calculate bill: %w", err)
	}

	return invoice, nil
}

// PersistInvoiceActivity saves an invoice to the database.
func PersistInvoiceActivity(ctx context.Context, invoice *domain.Invoice) error {
	if invoice == nil {
		return nil // nothing to persist
	}
	if invoice.TenantID == "" {
		return fmt.Errorf("invoice tenant_id is required")
	}

	activity.RecordHeartbeat(ctx, "persisting_invoice", invoice.ID)

	// TODO: Implement actual invoice persistence.
	// Example:
	//   lineItemsJSON, err := json.Marshal(invoice.LineItems)
	//   if err != nil { return fmt.Errorf("marshal line items: %w", err) }
	//   _, err = pool.Exec(ctx,
	//       `INSERT INTO invoices (id, tenant_id, period_start, period_end, subtotal_infra, margin_percent, margin_amount, free_tier_deduct, total, currency, status, line_items, created_at)
	//        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
	//       invoice.ID, invoice.TenantID, invoice.PeriodStart, invoice.PeriodEnd,
	//       invoice.SubtotalInfra, invoice.MarginPercent, invoice.MarginAmount,
	//       invoice.FreeTierDeduct, invoice.Total, invoice.Currency, invoice.Status,
	//       lineItemsJSON, invoice.CreatedAt)
	//   if err != nil { return fmt.Errorf("insert invoice: %w", err) }

	return fmt.Errorf("PersistInvoiceActivity: not implemented — wire to BillingProvider.CreateInvoice")
}

// GetMRRActivity calculates the total Monthly Recurring Revenue across all tenants.
func GetMRRActivity(ctx context.Context) (float64, error) {
	activity.RecordHeartbeat(ctx, "calculating_mrr")

	// TODO: Implement actual MRR calculation.
	// Example:
	//   var mrr float64
	//   err := pool.QueryRow(ctx, "SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status = 'paid' AND created_at >= date_trunc('month', NOW())").Scan(&mrr)
	//   if err != nil { return 0, fmt.Errorf("calculate MRR: %w", err) }
	//   return mrr, nil

	return 0, fmt.Errorf("GetMRRActivity: not implemented — wire to BillingProvider.GetMRR")
}

// ─── Worker Registration ──────────────────────────────────────────────────

// RegisterBillingWorker registers the monthly billing workflow and all its
// activities with a Temporal worker. This is called at server startup.
//
// Usage:
//   w := worker.New(temporalClient, "billing-task-queue", worker.Options{})
//   RegisterBillingWorker(w, &BillingActivities{...})
//   go w.Run(ctx)
//
// func RegisterBillingWorker(w worker.Worker, activities *BillingActivities) {
//     w.RegisterWorkflow(MonthlyBillingWorkflow)
//     w.RegisterActivity(activities.ListActiveTenants)
//     w.RegisterActivity(activities.GetTenantUsage)
//     w.RegisterActivity(activities.GetPriceSheet)
//     w.RegisterActivity(activities.CalculateInvoice)
//     w.RegisterActivity(activities.PersistInvoice)
//     w.RegisterActivity(activities.GetMRR)
// }