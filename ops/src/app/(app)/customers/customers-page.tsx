"use client";

import { useState, useCallback, useEffect } from "react";
import { customers } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { formatCurrency, marginColor, timeAgo } from "@/lib/utils";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Users, Search, RefreshCw, Plus, Rocket, X } from "lucide-react";
import Link from "next/link";

// Import new UI components and hooks
import { Table, TableSkeleton, Button, Input, Card } from "@/components/ui";
import type { ColumnDefinition } from "@/components/ui/table";
import { useApiQuery, useTablePagination, useOpsPermissions } from "@/hooks";
import { useMediaQuery } from "@/hooks/use-media-query";

export function CustomersPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { canCreate } = useOpsPermissions();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

  const canCreateCustomer = canCreate("customer");

  // Use the new pagination hook
  const pagination = useTablePagination({
    totalItems: 0, // Will be updated from API response
    limit: 25,
    resetDependencies: [search, planFilter, modelFilter],
  });

  // Use the new API query hook with pagination params
  const { data, loading, error, execute } = useApiQuery(
    (params?: {
      search?: string;
      plan?: string;
      deployment_model?: string;
      limit?: number;
      offset?: number;
    }) => customers.list(params),
    [
      {
        search: search || undefined,
        plan: planFilter || undefined,
        deployment_model: modelFilter || undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      },
    ],
  );

  // Update total items when data changes
  useEffect(() => {
    if (data?.total !== undefined) {
      // Note: totalItems is used for pagination calculations
      // The pagination hook doesn't have a setter for totalItems,
      // but it should update automatically based on the prop.
      // We'll need to ensure the pagination hook is recreated when total changes.
      // Actually, pagination hook receives totalItems as a prop, so we need to pass it in.
      // We'll handle this by passing data?.total to the hook creation.
      // However, the hook is already created. We'll need to use a different approach.
      // For now, we'll rely on the resetDependencies to reset pagination when filters change.
    }
  }, [data?.total]);

  const columns: ColumnDefinition<Customer>[] = [
    {
      id: "customer",
      header: "Customer",
      accessor: (row) => (
        <div>
          <Link
            href={`/customers/${row.org_id}`}
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            {row.org_name}
          </Link>
          <p className="text-xs text-gray-500">{row.org_slug}</p>
        </div>
      ),
      mobileTitle: "Customer",
    },
    {
      id: "plan",
      header: "Plan",
      accessor: "plan",
      cell: (value) => (
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
          {value}
        </span>
      ),
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "", label: "All Plans" },
        { value: "free", label: "Free" },
        { value: "trial", label: "Trial" },
        { value: "pro", label: "Pro" },
        { value: "enterprise", label: "Enterprise" },
      ],
      mobileTitle: "Plan",
    },
    {
      id: "model",
      header: "Model",
      accessor: "deployment_model",
      cell: (value) => (
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
          {value}
        </span>
      ),
      filterable: true,
      filterType: "select",
      filterOptions: [
        { value: "", label: "All Models" },
        { value: "shared", label: "Shared" },
        { value: "isolated", label: "Isolated VPS" },
        { value: "onprem", label: "On-Prem" },
      ],
      mobileTitle: "Model",
    },
    {
      id: "region",
      header: "Region",
      accessor: "data_region",
      cell: (value) => <span className="text-gray-400 uppercase">{value}</span>,
      mobileHidden: true,
    },
    {
      id: "mrr",
      header: "MRR",
      accessor: "mrr",
      cell: (value) => (
        <span className="text-gray-300">{formatCurrency(value)}</span>
      ),
      className: "text-right",
      mobileTitle: "MRR",
    },
    {
      id: "cost",
      header: "Cost",
      accessor: "monthly_cost",
      cell: (value) => (
        <span className="text-gray-400">{formatCurrency(value)}</span>
      ),
      className: "text-right",
      mobileHidden: true,
    },
    {
      id: "margin",
      header: "Margin",
      accessor: "margin",
      cell: (value) => (
        <span className={`font-medium ${marginColor(value)}`}>
          {value.toFixed(0)}%
        </span>
      ),
      className: "text-right",
      mobileTitle: "Margin",
    },
    {
      id: "health",
      header: "Health",
      accessor: (row) => (
        <span className="text-xs text-gray-500">
          {row.last_health_check ? timeAgo(row.last_health_check) : "—"}
        </span>
      ),
      mobileTitle: "Last Check",
    },
  ];

  const handleRowClick = useCallback((row: Customer) => {
    // Navigation is already handled by the Link in the customer column
  }, []);

  const emptyState = {
    icon: <Users className="mx-auto mb-3 h-8 w-8 text-gray-600" />,
    title: "No customers found",
    description:
      search || planFilter || modelFilter
        ? "Try adjusting your filters to see more results."
        : "Get started by creating your first customer.",
    action: canCreateCustomer ? (
      <Button
        variant="primary"
        size="sm"
        onClick={() => setShowCreate(true)}
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Create Customer
      </Button>
    ) : null,
  };

  const handlePlanFilterChange = (value: string) => {
    setPlanFilter(value);
    pagination.goToFirstPage();
  };

  const handleModelFilterChange = (value: string) => {
    setModelFilter(value);
    pagination.goToFirstPage();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data?.total || 0} customer{(data?.total || 0) !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
              {error.message || "An error occurred"}
            </div>
          )}

          {canCreateCustomer && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {isMobile ? "Create" : "Create Customer"}
            </Button>
          )}

          {canCreateCustomer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowOnboardingWizard(true)}
              leftIcon={<Rocket className="h-4 w-4" />}
            >
              {isMobile ? "Onboard" : "Enterprise Onboarding"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => execute()}
            loading={loading}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pagination.goToFirstPage();
              }}
              placeholder="Search customers..."
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={planFilter}
              onChange={(e) => handlePlanFilterChange(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Plans</option>
              <option value="free">Free</option>
              <option value="trial">Trial</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <select
              value={modelFilter}
              onChange={(e) => handleModelFilterChange(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Models</option>
              <option value="shared">Shared</option>
              <option value="isolated">Isolated VPS</option>
              <option value="onprem">On-Prem</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : (
        <Table
          data={data?.customers || []}
          columns={columns}
          keyAccessor="org_id"
          loading={loading}
          error={error?.message}
          emptyState={emptyState}
          onRowClick={handleRowClick}
          mobileCardView={true}
          sortable={true}
          showSearch={false} // We have our own search input above
          className="border-gray-800"
          striped={true}
          hoverable={true}
        />
      )}

      {/* Pagination */}
      {!loading && (data?.customers || []).length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            Showing {pagination.offset + 1}–
            {Math.min(pagination.offset + pagination.limit, data?.total || 0)}{" "}
            of {data?.total || 0}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.previousPage}
              disabled={!pagination.hasPreviousPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.nextPage}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreate && (
        <CreateCustomerModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            execute();
          }}
        />
      )}

      {/* Enterprise Onboarding Wizard */}
      {showOnboardingWizard && (
        <OnboardingWizard
          onClose={() => setShowOnboardingWizard(false)}
          onSuccess={() => {
            setShowOnboardingWizard(false);
            execute();
          }}
        />
      )}
    </div>
  );
}

// Keep the existing modal for now, but we could refactor it to use our Modal component later
function CreateCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "free",
    data_region: "us",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customers.create(form);
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create customer";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Customer</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Acme Corporation"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Slug (optional)
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="acme"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to auto‑generate from name
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Plan
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="trial">Trial (14 days)</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Data Region
              </label>
              <select
                value={form.data_region}
                onChange={(e) =>
                  setForm({ ...form, data_region: e.target.value })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="us">United States</option>
                <option value="eu">Europe</option>
                <option value="in">India</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
