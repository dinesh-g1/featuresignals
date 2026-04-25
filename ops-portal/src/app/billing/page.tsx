"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Euro,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  Eye,
  RotateCcw,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { useMRR, useInvoices, useRetryPayment } from "@/hooks/use-billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  createColumnHelper,
  type ColumnDef,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { CostBreakdown } from "@/components/billing/cost-breakdown";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency } from "@/lib/utils";
import type { Invoice } from "@/types/billing";

// ─── Constants ────────────────────────────────────────────────────────────

const CHART_COLOR = "#6366f1";
const CHART_GRID_COLOR = "#1e293b";
const CHART_TEXT_COLOR = "#94a3b8";

const INVOICE_STATUS_MAP: Record<
  string,
  "success" | "warning" | "danger" | "info" | "default"
> = {
  paid: "success",
  pending: "info",
  past_due: "warning",
  failed: "danger",
  cancelled: "default",
};

// ─── Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: typeof Euro;
  label: string;
  value: string;
  sublabel?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  loading?: boolean;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  trend,
  trendLabel,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10">
            <Icon className="h-5 w-5 text-accent-primary" aria-hidden="true" />
          </div>

          {trend && (
            <Badge
              variant={
                trend === "up"
                  ? "success"
                  : trend === "down"
                    ? "danger"
                    : "default"
              }
              size="sm"
            >
              <TrendingUp
                className={cn(
                  "mr-1 h-3 w-3",
                  trend === "down" && "rotate-180",
                  trend === "neutral" && "text-text-muted",
                )}
                aria-hidden="true"
              />
              {trendLabel}
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {value}
          </p>
          <p className="text-sm text-text-secondary mt-1">{label}</p>
          {sublabel && (
            <p className="text-xs text-text-muted mt-0.5">{sublabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-default bg-bg-elevated px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-semibold text-text-primary tabular-nums">
        {formatCurrency(payload[0].value, "EUR")}
      </p>
    </div>
  );
}

// ─── Invoices Column Helper ───────────────────────────────────────────────

const invoiceColumnHelper = createColumnHelper<Invoice>();

function buildInvoiceColumns(
  onViewCost: (invoice: Invoice) => void,
  onRetryPayment: (invoice: Invoice) => void,
): ColumnDef<Invoice>[] {
  return [
    invoiceColumnHelper.accessor("tenantName", {
      header: "Customer",
      cell: (info) => (
        <span className="text-sm font-medium text-text-primary">
          {info.getValue() as string}
        </span>
      ),
      enableSorting: true,
    }) as ColumnDef<Invoice>,
    invoiceColumnHelper.accessor("amount", {
      header: "Amount",
      cell: (info) => {
        const invoice = info.row.original;
        return (
          <span className="text-sm font-medium tabular-nums text-text-primary">
            {formatCurrency(invoice.amount, invoice.currency)}
          </span>
        );
      },
      enableSorting: true,
    }) as ColumnDef<Invoice>,
    invoiceColumnHelper.accessor("dueDate", {
      header: "Due Date",
      cell: (info) => {
        const dueDate = new Date(info.getValue() as string);
        const isOverdue =
          dueDate < new Date() && info.row.original.status !== "paid";
        return (
          <span
            className={cn(
              "text-sm whitespace-nowrap",
              isOverdue
                ? "text-accent-danger font-medium"
                : "text-text-secondary",
            )}
          >
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(dueDate)}
          </span>
        );
      },
      enableSorting: true,
    }) as ColumnDef<Invoice>,
    invoiceColumnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <Badge variant={INVOICE_STATUS_MAP[status] ?? "default"} size="sm">
            <span className="capitalize">{status.replace("_", " ")}</span>
          </Badge>
        );
      },
      enableSorting: true,
    }) as ColumnDef<Invoice>,
    invoiceColumnHelper.accessor("id", {
      header: "",
      id: "actions",
      cell: (info) => {
        const invoice = info.row.original;
        const needsRetry =
          invoice.status === "failed" || invoice.status === "past_due";

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-accent-primary"
              onClick={(e) => {
                e.stopPropagation();
                onViewCost(invoice);
              }}
              aria-label={`View cost breakdown for ${invoice.tenantName}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {needsRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-muted hover:text-accent-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryPayment(invoice);
                }}
                aria-label={`Retry payment for ${invoice.tenantName}`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
    }) as ColumnDef<Invoice>,
  ];
}

// ─── Page Component ───────────────────────────────────────────────────────

export default function BillingPage() {
  const toast = useToast();

  // ─── Queries ──────────────────────────────────────────────────────
  const {
    data: mrrData,
    isLoading: mrrLoading,
    error: mrrError,
    refetch: refetchMRR,
  } = useMRR();

  const {
    data: invoiceList,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useInvoices({ pageSize: 50 });

  // ─── Mutations ────────────────────────────────────────────────────
  const retryPaymentMutation = useRetryPayment();

  // ─── State ────────────────────────────────────────────────────────
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCostModal, setShowCostModal] = useState(false);

  // ─── Derived ─────────────────────────────────────────────────────
  const isLoading = mrrLoading || invoicesLoading;
  const hasError = mrrError || invoicesError;

  const invoices = invoiceList?.invoices ?? [];

  // Chart data derived from MRR monthly revenue
  const chartData = useMemo(() => {
    if (!mrrData?.monthlyRevenue) return [];
    return mrrData.monthlyRevenue.map((point) => {
      const date = new Date(point.month);
      const label = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
      }).format(date);
      return {
        month: label,
        revenue: point.revenue,
      };
    });
  }, [mrrData]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleViewCost = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowCostModal(true);
  }, []);

  const handleCostModalClose = useCallback((open: boolean) => {
    if (!open) {
      setShowCostModal(false);
      setSelectedInvoice(null);
    }
  }, []);

  const handleRetryPayment = useCallback(
    async (invoice: Invoice) => {
      try {
        await retryPaymentMutation.mutateAsync(invoice.id);
        toast.success(
          "Payment retry initiated",
          `Retrying payment for ${invoice.tenantName}.`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to retry payment";
        toast.error("Payment retry failed", message);
      }
    },
    [retryPaymentMutation, toast],
  );

  const handleRefresh = useCallback(() => {
    refetchMRR();
    refetchInvoices();
  }, [refetchMRR, refetchInvoices]);

  const allLoading = isLoading && !mrrData && !invoiceList;
  const invoicesColumns = useMemo(
    () => buildInvoiceColumns(handleViewCost, handleRetryPayment),
    [handleViewCost, handleRetryPayment],
  );

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
          <p className="text-sm text-text-muted mt-1">
            {mrrData
              ? `${mrrData.currency} ${formatCurrency(mrrData.currentMRR, mrrData.currency)} MRR`
              : "Revenue, invoices, and cost management"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh billing data"
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Full Error State ─────────────────────────────────────── */}
      {hasError && !mrrData && !invoiceList && (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <ErrorState
            title="Unable to load billing data"
            message={
              (mrrError instanceof Error ? mrrError.message : undefined) ??
              (invoicesError instanceof Error
                ? invoicesError.message
                : undefined) ??
              "An unexpected error occurred while fetching billing information."
            }
            onRetry={handleRefresh}
          />
        </div>
      )}

      {/* ─── Full Loading State ───────────────────────────────────── */}
      {allLoading && (
        <div className="space-y-6">
          {/* Skeleton stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Euro} label="" value="" loading />
            <StatCard icon={Users} label="" value="" loading />
            <StatCard icon={TrendingUp} label="" value="" loading />
          </div>

          {/* Skeleton chart */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>

          {/* Skeleton table */}
          <div>
            <Skeleton className="h-6 w-36 mb-4" />
            <SkeletonTable rows={4} />
          </div>
        </div>
      )}

      {/* ─── Data Loaded ──────────────────────────────────────────── */}
      {!allLoading && (
        <>
          {/* ─── Stat Cards Row ───────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Euro}
              label="Monthly Recurring Revenue"
              value={
                mrrData
                  ? formatCurrency(mrrData.currentMRR, mrrData.currency)
                  : "€0.00"
              }
              sublabel={mrrData ? `Based on active subscriptions` : undefined}
              trend={
                mrrData?.currentMRR && mrrData.currentMRR > 0 ? "up" : "neutral"
              }
              trendLabel={mrrData ? "Current month" : undefined}
              loading={mrrLoading && !mrrData}
            />

            <StatCard
              icon={Users}
              label="Avg. Revenue per Customer"
              value={
                mrrData
                  ? formatCurrency(
                      mrrData.avgRevenuePerCustomer,
                      mrrData.currency,
                    )
                  : "€0.00"
              }
              sublabel="Per active tenant"
              trend="neutral"
              loading={mrrLoading && !mrrData}
            />

            <StatCard
              icon={TrendingUp}
              label="Churn Rate"
              value={mrrData ? `${mrrData.churnRate.toFixed(1)}%` : "0.0%"}
              sublabel="Monthly basis"
              trend={
                mrrData?.churnRate && mrrData.churnRate > 5
                  ? "down"
                  : mrrData?.churnRate && mrrData.churnRate > 0
                    ? "neutral"
                    : "up"
              }
              trendLabel={
                mrrData?.churnRate && mrrData.churnRate > 0
                  ? `${mrrData.churnRate.toFixed(1)}% churn`
                  : "No churn"
              }
              loading={mrrLoading && !mrrData}
            />
          </div>

          {/* ─── Revenue Chart ────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-sm text-text-muted">
                    No revenue data available yet.
                  </p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_GRID_COLOR}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }}
                        tickFormatter={(value: number) =>
                          value >= 1000
                            ? `€${(value / 1000).toFixed(0)}k`
                            : `€${value}`
                        }
                        width={60}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={CHART_COLOR}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Payment Method ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10">
                  <CreditCard
                    className="h-6 w-6 text-accent-primary"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      Visa
                    </p>
                    <CheckCircle2
                      className="h-4 w-4 text-accent-success"
                      aria-hidden="true"
                    />
                    <span className="text-xs text-accent-success font-medium">
                      Default
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mt-0.5">
                    **** **** **** 4242
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Expires 12/28
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  Connected
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-border-default pt-4">
                <Button variant="secondary" size="sm">
                  Update Payment Method
                </Button>
                <span className="text-xs text-text-muted">
                  Powered by Stripe
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ─── Outstanding Invoices ─────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Outstanding Invoices
              {invoiceList && (
                <span className="ml-2 text-sm font-normal text-text-muted">
                  ({invoiceList.total} total)
                </span>
              )}
            </h2>

            {!invoicesLoading && invoicesError && !invoiceList && (
              <div className="py-6">
                <ErrorState
                  compact
                  title="Failed to load invoices"
                  message={invoicesError.message}
                  onRetry={() => refetchInvoices()}
                />
              </div>
            )}

            {invoicesLoading && !invoiceList && <SkeletonTable rows={4} />}

            {!invoicesLoading && invoiceList && invoices.length === 0 && (
              <EmptyState
                icon={AlertCircle}
                title="No billing data yet"
                description="Invoices will appear here once customers start using the platform."
              />
            )}

            {invoiceList && invoices.length > 0 && (
              <Table<Invoice>
                columns={invoicesColumns}
                data={invoices}
                loading={invoicesLoading}
                skeletonRows={4}
                enableSorting
                enablePagination={invoices.length > 20}
                manualPagination={false}
                pageSize={20}
              />
            )}
          </div>
        </>
      )}

      {/* ─── Cost Breakdown Modal ─────────────────────────────────── */}
      <Modal
        open={showCostModal}
        onOpenChange={handleCostModalClose}
        title="Cost Breakdown"
        description={
          selectedInvoice
            ? `Detailed cost analysis for ${selectedInvoice.tenantName}`
            : "Loading cost details..."
        }
        hideFooter
        size="lg"
      >
        {selectedInvoice && (
          <CostBreakdown
            tenantId={selectedInvoice.tenantId}
            tenantName={selectedInvoice.tenantName}
            onClose={() => {
              setShowCostModal(false);
              setSelectedInvoice(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
