"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { customers, environments, licenses, audit } from "@/lib/api";
import { formatCurrency, timeAgo, statusBadge } from "@/lib/utils";
import type {
  CustomerDetail,
  CustomerEnvironment,
  License,
  OpsAuditLog,
} from "@/lib/types";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Building,
  Globe,
  Shield,
  Server,
  DollarSign,
  FileText,
  RefreshCw,
  Edit,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

interface CustomerDetailPageProps {
  orgId: string;
}

type Tab =
  | "overview"
  | "subdomains"
  | "license"
  | "environment"
  | "financial"
  | "audit";

export function CustomerDetailPage({ orgId }: CustomerDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Customer data
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [environment, setEnvironment] = useState<CustomerEnvironment | null>(
    null,
  );
  const [license, setLicense] = useState<License | null>(null);
  const [auditLogs, setAuditLogs] = useState<OpsAuditLog[]>([]);

  // Subdomain management
  const [subdomainForm, setSubdomainForm] = useState({
    customDomain: "",
    sslEnabled: true,
  });
  const [subdomainLoading, setSubdomainLoading] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  // Derived values from customer data
  const margin = useMemo(() => {
    if (!customer) return 0;
    return customer.mrr && customer.monthly_cost
      ? ((customer.mrr - customer.monthly_cost) / customer.mrr) * 100
      : 0;
  }, [customer]);

  const status = useMemo(() => {
    if (!customer?.environment) return "inactive";
    return customer.environment.status || "inactive";
  }, [customer]);

  const loadCustomerData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load customer details
      const customerData = await customers.get(orgId);
      setCustomer(customerData);

      // Load environment if exists
      if (customerData.environment) {
        setEnvironment(customerData.environment);
      }

      // Load license if exists
      if (customerData.license) {
        setLicense(customerData.license);
      }

      // Load recent audit logs
      const auditData = await audit.list({ limit: 10 });
      setAuditLogs(
        auditData.logs.filter(
          (log: any) =>
            log.target_id === orgId || log.target_type === "organization",
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load customer data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const handleUpdateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubdomainLoading(true);
    setSubdomainError(null);

    try {
      // TODO: Implement subdomain update API call
      // This would call an endpoint like PUT /api/v1/ops/environments/{id}/domain
      console.log("Updating subdomain:", subdomainForm);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reload customer data
      await loadCustomerData();

      // Reset form
      setSubdomainForm({
        customDomain: "",
        sslEnabled: true,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update subdomain";
      setSubdomainError(message);
    } finally {
      setSubdomainLoading(false);
    }
  };

  const handleRemoveCustomDomain = async () => {
    if (!environment?.custom_domain) return;

    if (
      !confirm(
        `Are you sure you want to remove the custom domain "${environment.custom_domain}"?`,
      )
    ) {
      return;
    }

    try {
      // TODO: Implement remove custom domain API call
      console.log("Removing custom domain:", environment.custom_domain);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reload customer data
      await loadCustomerData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove custom domain";
      alert(`Error: ${message}`);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <Building className="h-4 w-4" />,
    },
    {
      id: "subdomains",
      label: "Subdomains",
      icon: <Globe className="h-4 w-4" />,
    },
    { id: "license", label: "License", icon: <Shield className="h-4 w-4" /> },
    {
      id: "environment",
      label: "Environment",
      icon: <Server className="h-4 w-4" />,
    },
    {
      id: "financial",
      label: "Financial",
      icon: <DollarSign className="h-4 w-4" />,
    },
    { id: "audit", label: "Audit Log", icon: <FileText className="h-4 w-4" /> },
  ];

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-red-400">{error || "Customer not found"}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Organization
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-white">{customer.org?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Slug</p>
                    <p className="text-white">{customer.org?.slug || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Plan</p>
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium capitalize text-gray-300">
                      {customer.org?.plan || "free"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Created</p>
                    <p className="text-white">
                      {timeAgo(customer.org?.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Health & Status
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400">Health Score</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${customer.health_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-white">
                        {customer.health_score || 0}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {status || "unknown"}
                    </span>
                  </div>
                  {environment?.last_health_check && (
                    <div>
                      <p className="text-xs text-gray-400">Last Health Check</p>
                      <p className="text-white">
                        {timeAgo(environment.last_health_check)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-300">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab("subdomains")}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  <Globe className="mr-2 inline h-4 w-4" />
                  Manage Domains
                </button>
                <button
                  onClick={() => setActiveTab("license")}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  <Shield className="mr-2 inline h-4 w-4" />
                  View License
                </button>
                <button
                  onClick={() => setActiveTab("environment")}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  <Server className="mr-2 inline h-4 w-4" />
                  Environment Details
                </button>
                <button
                  onClick={loadCustomerData}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  <RefreshCw className="mr-2 inline h-4 w-4" />
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        );

      case "subdomains":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-4 text-sm font-medium text-gray-300">
                Current Domain Configuration
              </h3>

              {environment ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <p className="text-xs text-gray-400">Default Subdomain</p>
                      <p className="mt-1 font-mono text-sm text-white">
                        {environment.subdomain ||
                          `${customer.org?.slug || "unknown"}.featuresignals.com`}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Always available, managed by FeatureSignals
                      </p>
                    </div>

                    {environment.custom_domain ? (
                      <div className="rounded border border-blue-500/30 bg-blue-500/5 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-gray-400">
                              Custom Domain
                            </p>
                            <p className="mt-1 font-mono text-sm text-white">
                              {environment.custom_domain}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-xs text-green-400">
                                  SSL Active
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                CNAME verified
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={handleRemoveCustomDomain}
                            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-red-400"
                            title="Remove custom domain"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded border border-gray-800 bg-gray-900 p-3">
                        <p className="text-xs text-gray-400">Custom Domain</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Not configured
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Add your own domain for white-labeling
                        </p>
                      </div>
                    )}
                  </div>

                  {environment.cloudflare_record_id && (
                    <div className="rounded border border-gray-800 bg-gray-900 p-3">
                      <p className="text-xs text-gray-400">DNS Record</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300">
                          CNAME{" "}
                          {environment.custom_domain || environment.subdomain} →
                          app.featuresignals.com
                        </code>
                        <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">
                          Active
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Cloudflare Record ID: {environment.cloudflare_record_id}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-4">
                  <p className="text-sm text-yellow-400">
                    No isolated environment found. Domain management is only
                    available for isolated VPS deployments.
                  </p>
                </div>
              )}
            </div>

            {environment && (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="mb-4 text-sm font-medium text-gray-300">
                  {environment.custom_domain
                    ? "Update Custom Domain"
                    : "Add Custom Domain"}
                </h3>

                <form onSubmit={handleUpdateSubdomain} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      value={subdomainForm.customDomain}
                      onChange={(e) =>
                        setSubdomainForm({
                          ...subdomainForm,
                          customDomain: e.target.value,
                        })
                      }
                      placeholder="flags.yourcompany.com"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the domain you want to use for your FeatureSignals
                      instance. You'll need to create a CNAME record pointing to{" "}
                      <code className="text-gray-400">
                        app.featuresignals.com
                      </code>
                      .
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sslEnabled"
                      checked={subdomainForm.sslEnabled}
                      onChange={(e) =>
                        setSubdomainForm({
                          ...subdomainForm,
                          sslEnabled: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="sslEnabled"
                      className="text-sm text-gray-400"
                    >
                      Automatically provision SSL certificate (Let's Encrypt)
                    </label>
                  </div>

                  {subdomainError && (
                    <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                      {subdomainError}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={subdomainLoading || !subdomainForm.customDomain}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {subdomainLoading
                        ? "Processing..."
                        : environment.custom_domain
                          ? "Update Domain"
                          : "Add Domain"}
                    </button>

                    {environment.custom_domain && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomDomain}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
                      >
                        Remove Domain
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-6 rounded border border-gray-800 bg-gray-900 p-4">
                  <h4 className="mb-2 text-xs font-medium text-gray-300">
                    DNS Configuration Guide
                  </h4>
                  <ol className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 text-xs">
                        1
                      </span>
                      <span>Add a CNAME record in your DNS provider:</span>
                    </li>
                    <li className="ml-6 font-mono text-gray-300">
                      {subdomainForm.customDomain || "yourdomain.com"} →
                      app.featuresignals.com
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 text-xs">
                        2
                      </span>
                      <span>
                        SSL certificates are automatically provisioned within
                        5-10 minutes
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-800 text-xs">
                        3
                      </span>
                      <span>
                        Domain verification happens automatically once DNS
                        propagates
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        );

      case "license":
        return (
          <div className="space-y-6">
            {license ? (
              <>
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="mb-4 text-sm font-medium text-gray-300">
                    License Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">License Key</p>
                      <code className="mt-1 block rounded bg-gray-800 px-3 py-2 font-mono text-sm text-gray-300">
                        {license.license_key?.slice(0, 24)}...
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Plan</p>
                      <span className="mt-1 inline-block rounded bg-gray-800 px-2 py-1 text-xs font-medium capitalize text-gray-300">
                        {license.plan}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Issued</p>
                      <p className="mt-1 text-white">
                        {timeAgo(license.issued_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Expires</p>
                      <p className="mt-1 text-white">
                        {license.expires_at
                          ? timeAgo(license.expires_at)
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                    <h3 className="mb-3 text-sm font-medium text-gray-300">
                      Usage Limits
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Seats</span>
                          <span className="text-white">
                            {license.current_seats} /{" "}
                            {license.max_seats || "Unlimited"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${Math.min(100, (license.current_seats / (license.max_seats || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Projects</span>
                          <span className="text-white">
                            {license.current_projects} /{" "}
                            {license.max_projects || "Unlimited"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${Math.min(100, (license.current_projects / (license.max_projects || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Environments</span>
                          <span className="text-white">
                            {license.current_environments} /{" "}
                            {license.max_environments || "Unlimited"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${Math.min(100, (license.current_environments / (license.max_environments || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                    <h3 className="mb-3 text-sm font-medium text-gray-300">
                      Monthly Usage
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Evaluations</span>
                          <span className="text-white">
                            {license.evaluations_this_month?.toLocaleString()} /{" "}
                            {license.max_evaluations_per_month?.toLocaleString() ||
                              "Unlimited"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${Math.min(100, (license.evaluations_this_month / (license.max_evaluations_per_month || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">API Calls</span>
                          <span className="text-white">
                            {license.api_calls_this_month?.toLocaleString()} /{" "}
                            {license.max_api_calls_per_month?.toLocaleString() ||
                              "Unlimited"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${Math.min(100, (license.api_calls_this_month / (license.max_api_calls_per_month || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Breach Count</span>
                          <span className="text-white">
                            {license.breach_count || 0}
                          </span>
                        </div>
                        {license.last_breach_at && (
                          <p className="mt-1 text-xs text-gray-500">
                            Last breach: {timeAgo(license.last_breach_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <p className="text-gray-400">
                  No license found for this customer.
                </p>
              </div>
            )}
          </div>
        );

      case "environment":
        return (
          <div className="space-y-6">
            {environment ? (
              <>
                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="mb-4 text-sm font-medium text-gray-300">
                    Environment Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-400">Deployment Model</p>
                      <span className="mt-1 inline-block rounded bg-gray-800 px-2 py-1 text-xs font-medium capitalize text-gray-300">
                        {environment.deployment_model}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <span
                        className={`mt-1 inline-block rounded px-2 py-1 text-xs font-medium ${
                          environment.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : environment.status === "provisioning"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {environment.status}
                      </span>
                    </div>
                    {environment.vps_type && (
                      <div>
                        <p className="text-xs text-gray-400">VPS Type</p>
                        <p className="mt-1 text-white">
                          {environment.vps_type}
                        </p>
                      </div>
                    )}
                    {environment.vps_region && (
                      <div>
                        <p className="text-xs text-gray-400">Region</p>
                        <p className="mt-1 text-white">
                          {environment.vps_region}
                        </p>
                      </div>
                    )}
                    {environment.provisioned_at && (
                      <div>
                        <p className="text-xs text-gray-400">Provisioned</p>
                        <p className="mt-1 text-white">
                          {timeAgo(environment.provisioned_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {environment.deployment_model === "isolated" && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                      <h3 className="mb-3 text-sm font-medium text-gray-300">
                        VPS Specifications
                      </h3>
                      <div className="space-y-2">
                        {environment.vps_cpu_cores && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              vCPU Cores
                            </span>
                            <span className="text-xs text-white">
                              {environment.vps_cpu_cores}
                            </span>
                          </div>
                        )}
                        {environment.vps_memory_gb && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              Memory
                            </span>
                            <span className="text-xs text-white">
                              {environment.vps_memory_gb} GB
                            </span>
                          </div>
                        )}
                        {environment.vps_disk_gb && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Disk</span>
                            <span className="text-xs text-white">
                              {environment.vps_disk_gb} GB
                            </span>
                          </div>
                        )}
                        {environment.vps_ip && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              IP Address
                            </span>
                            <span className="font-mono text-xs text-white">
                              {environment.vps_ip}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                      <h3 className="mb-3 text-sm font-medium text-gray-300">
                        Cost Breakdown
                      </h3>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">
                            VPS Cost
                          </span>
                          <span className="text-xs text-white">
                            {formatCurrency(environment.monthly_vps_cost)}
                          </span>
                        </div>
                        {environment.monthly_backup_cost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              Backup Cost
                            </span>
                            <span className="text-xs text-white">
                              {formatCurrency(environment.monthly_backup_cost)}
                            </span>
                          </div>
                        )}
                        {environment.monthly_support_cost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">
                              Support Cost
                            </span>
                            <span className="text-xs text-white">
                              {formatCurrency(environment.monthly_support_cost)}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex justify-between border-t border-gray-800 pt-2">
                          <span className="text-sm font-medium text-gray-300">
                            Total Monthly
                          </span>
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(
                              environment.monthly_vps_cost +
                                environment.monthly_backup_cost +
                                environment.monthly_support_cost,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <p className="text-gray-400">
                  {customer.org?.plan === "free"
                    ? "Free plan customers use shared infrastructure."
                    : "No dedicated environment found for this customer."}
                </p>
              </div>
            )}
          </div>
        );

      case "financial":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-4 text-sm font-medium text-gray-300">
                Financial Summary
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded border border-gray-800 bg-gray-900 p-4">
                  <p className="text-xs text-gray-400">
                    Monthly Recurring Revenue
                  </p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatCurrency(customer.mrr || 0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Current month</p>
                </div>
                <div className="rounded border border-gray-800 bg-gray-900 p-4">
                  <p className="text-xs text-gray-400">Monthly Cost</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {formatCurrency(customer.monthly_cost || 0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Infrastructure + Support
                  </p>
                </div>
                <div className="rounded border border-gray-800 bg-gray-900 p-4">
                  <p className="text-xs text-gray-400">Margin</p>
                  <p
                    className={`mt-1 text-xl font-semibold ${
                      margin >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {margin.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {margin >= 0 ? "Profitable" : "Negative margin"}
                  </p>
                </div>
              </div>
            </div>

            {environment && (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-300">
                  Cost Analysis
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue (MRR)</span>
                      <span className="text-white">
                        {formatCurrency(customer.mrr || 0)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">VPS Cost</span>
                      <span className="text-white">
                        {formatCurrency(environment.monthly_vps_cost || 0)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, ((environment.monthly_vps_cost || 0) / (customer.mrr || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  {environment.monthly_backup_cost > 0 && (
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Backup Cost</span>
                        <span className="text-white">
                          {formatCurrency(environment.monthly_backup_cost)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, (environment.monthly_backup_cost / (customer.mrr || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {environment.monthly_support_cost > 0 && (
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Support Cost</span>
                        <span className="text-white">
                          {formatCurrency(environment.monthly_support_cost)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, (environment.monthly_support_cost / (customer.mrr || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex justify-between border-t border-gray-800 pt-4">
                    <span className="font-medium text-gray-300">
                      Net Margin
                    </span>
                    <span
                      className={`font-medium ${
                        margin >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatCurrency(
                        (customer?.mrr || 0) - (customer?.monthly_cost || 0),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "audit":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-4 text-sm font-medium text-gray-300">
                Recent Activity
              </h3>

              {auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded border border-gray-800 bg-gray-900 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white">
                              {log.action.replace(/_/g, " ")}
                            </span>
                            {log.target_type && (
                              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                                {log.target_type}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {log.ops_user_name || "System"} •{" "}
                            {timeAgo(log.created_at)}
                          </p>
                          {log.details &&
                            typeof log.details === "object" &&
                            Object.keys(log.details).length > 0 && (
                              <div className="mt-2">
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-gray-500">
                                    Details
                                  </summary>
                                  <pre className="mt-1 overflow-auto rounded bg-gray-800 p-2 text-gray-300">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )}
                        </div>
                        {log.ip_address && (
                          <code className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
                            {log.ip_address}
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">
                  No audit logs found for this customer.
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/customers"
              className="text-sm text-gray-400 hover:text-white"
            >
              Customers
            </Link>
            <span className="text-gray-600">/</span>
            <h1 className="text-xl font-bold text-white">
              {customer.org?.name}
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Organization ID:{" "}
            <code className="text-gray-300">{orgId.slice(0, 8)}...</code>
          </p>
        </div>
        <button
          onClick={loadCustomerData}
          className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}
