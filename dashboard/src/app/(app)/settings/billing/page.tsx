"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { api, type PricingConfig } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

const settingsTabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/webhooks", label: "Webhooks" },
];

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  past_due: "bg-amber-50 text-amber-700 ring-amber-100",
  canceled: "bg-red-50 text-red-700 ring-red-100",
  trialing: "bg-blue-50 text-blue-700 ring-blue-100",
  unpaid: "bg-red-50 text-red-700 ring-red-100",
};

const planBadgeColors: Record<string, string> = {
  free: "bg-slate-100 text-slate-700 ring-slate-200",
  pro: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  enterprise: "bg-purple-50 text-purple-700 ring-purple-200",
};

export default function BillingPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = useAppStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    api.getPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast("Payment successful! Your plan has been upgraded to Pro.", "success");
    } else if (status === "failed") {
      toast("Payment failed. Please try again or contact support.", "error");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    Promise.all([
      api.getSubscription(token).catch(() => null),
      api.getUsage(token).catch(() => null),
    ])
      .then(([sub, usg]) => {
        setSubscription(sub);
        setUsage(usg);
      })
      .catch(() => setError("Failed to load billing information"))
      .finally(() => setLoading(false));
  }, [token]);

  const plan = subscription?.plan || "free";
  const status = subscription?.status;
  const isPaid = plan !== "free";

  async function handleUpgrade() {
    if (!token) return;
    setUpgrading(true);
    try {
      const data = await api.createCheckout(token);
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payu_url;

      const fields = ["key", "txnid", "hash", "amount", "productinfo", "firstname", "email", "phone", "surl", "furl"];
      for (const field of fields) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = field;
        input.value = (data as any)[field];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      toast(err.message || "Failed to start checkout", "error");
      setUpgrading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <nav className="flex gap-1 border-b border-slate-200">
        {settingsTabs.map((tab) => {
          const active = pathname === tab.href || pathname === tab.href + "/";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${active ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs font-medium text-red-600 hover:text-red-700">
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Current Plan */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
                <p className="mt-1 text-sm text-slate-500">Manage your subscription and billing</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${planBadgeColors[plan] || planBadgeColors.free}`}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </span>
                {status && status !== "none" && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusColors[status] || statusColors.active}`}>
                    {status.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>

            {subscription?.current_period_end && (
              <p className="mb-4 text-xs text-slate-500">
                {status === "canceled" ? "Access expires" : "Next billing date"}:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </p>
            )}

            <div className="flex gap-3">
              {!isPaid && (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md disabled:opacity-50"
                >
                  {upgrading ? "Redirecting to PayU..." : "Upgrade to Pro"}
                </button>
              )}
              {isPaid && (
                <p className="text-sm text-slate-500">
                  To manage or cancel your subscription, please contact{" "}
                  <a href="mailto:support@featuresignals.com" className="font-medium text-indigo-600 hover:text-indigo-700">
                    support@featuresignals.com
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Usage */}
          {usage && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UsageCard label="Team Seats" used={usage.seats_used ?? 0} limit={usage.seats_limit ?? 3} />
                <UsageCard label="Projects" used={usage.projects_used ?? 0} limit={usage.projects_limit ?? 1} />
                <UsageCard label="Environments" used={usage.environments_used ?? 0} limit={usage.environments_limit ?? 2} />
              </div>
            </div>
          )}

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PlanCard
              name={pricing?.plans?.free?.name ?? "Free"}
              price={pricing?.plans?.free?.display_price ?? "₹0"}
              period={pricing?.plans?.free?.billing_period ? `/${pricing.plans.free.billing_period}` : "/month"}
              features={pricing?.plans?.free?.features ?? ["1 project", "2 environments", "3 team members", "Community support"]}
              current={plan === "free"}
            />
            <PlanCard
              name={pricing?.plans?.pro?.name ?? "Pro"}
              price={pricing?.plans?.pro?.display_price ?? "₹999"}
              period={pricing?.plans?.pro?.billing_period ? `/${pricing.plans.pro.billing_period}` : "/month"}
              features={pricing?.plans?.pro?.features ?? ["Unlimited projects", "Unlimited environments", "Unlimited team members", "Priority support"]}
              current={plan === "pro"}
              highlighted
              action={
                plan === "free"
                  ? { label: upgrading ? "Redirecting..." : "Upgrade to Pro", onClick: handleUpgrade, disabled: upgrading }
                  : undefined
              }
            />
            <PlanCard
              name={pricing?.plans?.enterprise?.name ?? "Enterprise"}
              price={pricing?.plans?.enterprise?.display_price ?? "Custom"}
              period=""
              features={pricing?.plans?.enterprise?.features ?? ["Everything in Pro", "Dedicated support", "Custom SLA", "Self-hosted option"]}
              current={plan === "enterprise"}
              action={
                plan !== "enterprise"
                  ? { label: "Contact Sales", href: "mailto:support@featuresignals.com" }
                  : undefined
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {used} <span className="text-sm font-normal text-slate-400">/ {limit}</span>
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
        <div
          className={`h-1.5 rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  current,
  highlighted,
  action,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  current: boolean;
  highlighted?: boolean;
  action?: { label: string; onClick?: () => void; href?: string; disabled?: boolean };
}) {
  return (
    <div
      className={`rounded-xl border p-6 transition-all ${
        highlighted
          ? "border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-100 shadow-sm"
          : "border-slate-200 bg-white hover:shadow-lg hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
        {current && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
            Current
          </span>
        )}
      </div>
      <div className="mt-2">
        <span className="text-3xl font-bold text-slate-900">{price}</span>
        {period && <span className="text-sm text-slate-500">{period}</span>}
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <a
              href={action.href}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              disabled={action.disabled}
              className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                highlighted
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
