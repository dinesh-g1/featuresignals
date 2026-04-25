'use client';

import { useCallback } from 'react';
import { X, Server, HardDrive, Network, Activity, Cpu } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CostBreakdown, CostAddon } from '@/types/billing';

// ─── Types ────────────────────────────────────────────────────────────────

export interface CostBreakdownProps {
  tenantId: string;
  tenantName: string;
  onClose?: () => void;
}

interface LineItem {
  id: string;
  icon: typeof Cpu;
  label: string;
  usage: string;
  unitPrice: number;
  unit: string;
  amount: number;
}

// ─── Default Unit Prices ──────────────────────────────────────────────────

const DEFAULT_UNIT_PRICES: Record<string, { unitPrice: number; unit: string }> = {
  cpu: { unitPrice: 0.042, unit: 'vCPU-hr' },
  memory: { unitPrice: 0.015, unit: 'GB-hr' },
  storage: { unitPrice: 0.10, unit: 'GB-month' },
  network: { unitPrice: 0.01, unit: 'GB' },
  api_calls: { unitPrice: 0.50, unit: '10K calls' },
};

const LINE_ITEM_ICONS: Record<string, typeof Cpu> = {
  cpu: Cpu,
  memory: Server,
  storage: HardDrive,
  network: Network,
  api_calls: Activity,
};

// ─── Build Line Items ─────────────────────────────────────────────────────

function buildLineItems(costBreakdown: CostBreakdown): LineItem[] {
  const items: LineItem[] = [];

  // Compute inferred usage from addons mapped to known categories
  const addonMap = new Map<string, CostAddon>();
  for (const addon of costBreakdown.addons) {
    const key = addon.name.toLowerCase().replace(/\s+/g, '_');
    addonMap.set(key, addon);
  }

  const categoryKeys = ['cpu', 'memory', 'storage', 'network', 'api_calls'];

  for (const key of categoryKeys) {
    const addon = addonMap.get(key);
    const defaults = DEFAULT_UNIT_PRICES[key];
    const icon = LINE_ITEM_ICONS[key] ?? Activity;
    const label = key === 'api_calls' ? 'API Calls'
      : key.charAt(0).toUpperCase() + key.slice(1);

    if (addon) {
      items.push({
        id: key,
        icon,
        label,
        usage: addon.description || '—',
        unitPrice: defaults.unitPrice,
        unit: defaults.unit,
        amount: addon.amount,
      });
    } else {
      items.push({
        id: key,
        icon,
        label,
        usage: '—',
        unitPrice: defaults.unitPrice,
        unit: defaults.unit,
        amount: 0,
      });
    }
  }

  return items;
}

// ─── Line Item Row ────────────────────────────────────────────────────────

function LineItemRow({ item }: { item: LineItem }) {
  const Icon = item.icon;

  return (
    <tr className="border-b border-border-default last:border-b-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-tertiary">
            <Icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{item.label}</p>
            <p className="text-xs text-text-muted">{item.usage}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-right">
        <span className="text-sm text-text-secondary tabular-nums">
          {formatCurrency(item.unitPrice, 'EUR')}/{item.unit}
        </span>
      </td>
      <td className="py-3 text-right">
        <span className="text-sm font-medium text-text-primary tabular-nums">
          {formatCurrency(item.amount, 'EUR')}
        </span>
      </td>
    </tr>
  );
}

// ─── Subtotals Row ────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  highlight = false,
  valueClassName,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClassName?: string;
}) {
  return (
    <tr className={highlight ? 'border-t-2 border-border-default' : ''}>
      <td colSpan={2} className={cn('py-2 pr-4 text-sm', highlight ? 'font-semibold text-text-primary' : 'text-text-secondary')}>
        {label}
      </td>
      <td className={cn('py-2 text-right text-sm font-medium tabular-nums', valueClassName ?? 'text-text-primary')}>
        {value}
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export function CostBreakdown({ tenantId, tenantName, onClose }: CostBreakdownProps) {
  const {
    data: costBreakdown,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['billing', 'cost', tenantId],
    queryFn: () => api.getTenantCostBreakdown(tenantId),
    staleTime: 60_000,
    gcTime: 120_000,
    retry: 2,
  });

  // ─── Loading State ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
        <div className="border-t border-border-default pt-3 space-y-2">
          <Skeleton className="h-4 w-28 ml-auto" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-5 w-32 ml-auto" />
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────
  if (error || !costBreakdown) {
    return (
      <div className="rounded-lg border border-accent-danger/20 bg-accent-danger/5 p-4 text-center">
        <p className="text-sm text-accent-danger font-medium">
          Failed to load cost breakdown
        </p>
        <p className="text-xs text-text-secondary mt-1">
          {(error instanceof Error ? error.message : 'Unable to retrieve cost data for this tenant.')}
        </p>
      </div>
    );
  }

  // ─── Data ────────────────────────────────────────────────────────
  const lineItems = buildLineItems(costBreakdown);
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const basePrice = costBreakdown.basePrice;
  const totalCost = costBreakdown.totalCost;
  const marginPercent = basePrice > 0
    ? Math.round(((totalCost - basePrice) / totalCost) * 100)
    : 0;
  const marginAmount = totalCost - basePrice;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-text-primary">{tenantName}</h4>
          <p className="text-xs text-text-muted mt-0.5">
            Tier: <span className="capitalize">{costBreakdown.tier}</span>
            {' · '}
            Currency: {costBreakdown.currency}
          </p>
        </div>
        <Badge variant="primary" size="sm">
          Current Month
        </Badge>
      </div>

      {/* Line items table */}
      <div className="overflow-hidden rounded-lg border border-border-default">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-bg-tertiary/50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Component
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                Unit Price
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-default bg-bg-tertiary/30">
              <td className="px-4 py-3" colSpan={3}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">Base Price</span>
                  <span className="text-xs text-text-muted">— Monthly subscription</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-border-default">
              <td className="px-4 py-3" colSpan={2}></td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-medium text-text-primary tabular-nums">
                  {formatCurrency(basePrice, costBreakdown.currency)}
                </span>
              </td>
            </tr>
          </tbody>
          <tbody>
            {lineItems.map((item) => (
              <LineItemRow key={item.id} item={item} />
            ))}
          </tbody>
          <tbody>
            <SummaryRow label="Subtotal" value={formatCurrency(subtotal + basePrice, costBreakdown.currency)} />
            <SummaryRow
              label={`Margin (${marginPercent}%)`}
              value={formatCurrency(marginAmount, costBreakdown.currency)}
              valueClassName="text-accent-success"
            />
            <SummaryRow
              label="Total Cost"
              value={formatCurrency(totalCost, costBreakdown.currency)}
              highlight
              valueClassName="text-text-primary text-base"
            />
          </tbody>
        </table>
      </div>

      {/* Invoice period note */}
      <p className="text-xs text-text-muted mt-3 text-right">
        Costs are estimates for the current billing period and may vary based on actual usage.
      </p>
    </div>
  );
}
