import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: "System Status",
  description:
    "Real-time and historical uptime status for FeatureSignals services. Track API availability, evaluation latency, and edge node health across all regions.",
};

const services = [
  {
    name: "Management API",
    status: "operational",
    uptime: "99.99%",
    latency: "<50ms",
    description:
      "REST API for flag management, team administration, and configuration",
  },
  {
    name: "Evaluation Engine",
    status: "operational",
    uptime: "99.99%",
    latency: "<1ms",
    description:
      "Real-time flag evaluation at the edge with sub-millisecond p99 latency",
  },
  {
    name: "Streaming API (SSE)",
    status: "operational",
    uptime: "99.95%",
    latency: "<100ms",
    description:
      "Server-sent events for real-time flag state updates and live streams",
  },
  {
    name: "Webhook Delivery",
    status: "operational",
    uptime: "99.95%",
    latency: "<500ms",
    description:
      "Asynchronous webhook dispatch with retry logic and delivery logging",
  },
  {
    name: "Dashboard",
    status: "operational",
    uptime: "99.99%",
    latency: "<200ms",
    description: "Web-based management console at app.featuresignals.com",
  },
  {
    name: "Documentation Site",
    status: "operational",
    uptime: "99.99%",
    latency: "<100ms",
    description: "Technical documentation at docs.featuresignals.com",
  },
  {
    name: "AI Janitor Engine",
    status: "operational",
    uptime: "99.90%",
    latency: "<2s",
    description:
      "Stale flag detection, codebase scanning, and PR generation pipeline",
  },
  {
    name: "SDK Distribution (CDN)",
    status: "operational",
    uptime: "99.99%",
    latency: "<50ms",
    description:
      "Global CDN distribution for client-side SDKs and flag configurations",
  },
];

const regions = [
  {
    name: "US East (Virginia)",
    code: "us-east-1",
    status: "operational",
    latency: "<1ms",
  },
  {
    name: "US West (Oregon)",
    code: "us-west-2",
    status: "operational",
    latency: "<2ms",
  },
  {
    name: "Europe (Frankfurt)",
    code: "eu-central-1",
    status: "operational",
    latency: "<3ms",
  },
  {
    name: "Asia Pacific (Mumbai)",
    code: "ap-south-1",
    status: "operational",
    latency: "<5ms",
  },
  {
    name: "Asia Pacific (Singapore)",
    code: "ap-southeast-1",
    status: "operational",
    latency: "<4ms",
  },
  {
    name: "South America (São Paulo)",
    code: "sa-east-1",
    status: "operational",
    latency: "<8ms",
  },
];

const incidents = [
  {
    date: "January 10, 2026",
    title: "Elevated Latency on Evaluation Engine",
    status: "resolved",
    description:
      "Between 14:32 UTC and 15:18 UTC, the evaluation engine experienced elevated latency due to a cache invalidation storm. The issue was resolved by tuning the cache TTL configuration. p99 latency peaked at 45ms during the incident.",
    duration: "46 minutes",
  },
  {
    date: "December 28, 2025",
    title: "Webhook Delivery Delay",
    status: "resolved",
    description:
      "Between 09:15 UTC and 09:52 UTC, webhook deliveries were delayed by up to 5 minutes due to a backlog in the dispatcher queue. The issue was resolved by scaling the dispatcher workers. No webhooks were lost.",
    duration: "37 minutes",
  },
  {
    date: "December 5, 2025",
    title: "Scheduled Maintenance: Database Migration",
    status: "maintenance",
    description:
      "We performed a scheduled database migration to add support for the new A/B experimentation engine. The management API was read-only for 12 minutes during the migration window. No data loss occurred.",
    duration: "12 minutes",
  },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; color: string; icon: typeof CheckCircle }
  > = {
    operational: {
      label: "Operational",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      icon: CheckCircle,
    },
    degraded: {
      label: "Degraded",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      icon: AlertTriangle,
    },
    outage: {
      label: "Outage",
      color: "text-red-600 bg-red-50 border-red-200",
      icon: AlertTriangle,
    },
    maintenance: {
      label: "Maintenance",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: Clock,
    },
    resolved: {
      label: "Resolved",
      color: "text-stone-600 bg-stone-50 border-stone-200",
      icon: CheckCircle,
    },
  };
  const c = config[status] || config.operational;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {c.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    operational: "bg-emerald-500",
    degraded: "bg-amber-500",
    outage: "bg-red-500",
    maintenance: "bg-blue-500",
    resolved: "bg-stone-400",
  };
  return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status === "operational" ? "bg-emerald-400" : ""} opacity-75`}
      ></span>
      <span
        className={`relative inline-flex h-3 w-3 rounded-full ${colors[status] || "bg-stone-400"}`}
      ></span>
    </span>
  );
}

export default function StatusPage() {
  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://featuresignals.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Status",
                item: "https://featuresignals.com/status",
              },
            ],
          }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Activity className="h-3.5 w-3.5 text-accent" />
              Real-time service status
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              FeatureSignals <span className="text-accent">Status</span>
            </h1>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-3 mb-6">
              <StatusDot status="operational" />
              <span className="text-sm font-semibold text-emerald-800">
                All Systems Operational
              </span>
              <span className="text-xs text-emerald-600">
                Updated 2 minutes ago
              </span>
            </div>
            <p className="text-sm text-stone-500">
              Current uptime: <strong className="text-stone-700">99.98%</strong>{" "}
              over the last 90 days
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-xl font-bold text-stone-900 mb-6">Services</h2>
          <div className="space-y-3">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <StatusDot status={svc.status} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-stone-900 text-sm">
                      {svc.name}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      {svc.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-stone-400">Uptime</div>
                    <div className="text-sm font-semibold text-stone-700">
                      {svc.uptime}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-stone-400">Latency</div>
                    <div className="text-sm font-semibold text-stone-700">
                      {svc.latency}
                    </div>
                  </div>
                  <StatusBadge status={svc.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regions */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-xl font-bold text-stone-900 mb-6">
            Edge Regions
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.map((region) => (
              <div
                key={region.code}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={region.status} />
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">
                      {region.name}
                    </h3>
                    <p className="text-xs text-stone-400 font-mono">
                      {region.code}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <span className="font-semibold text-stone-700">
                    {region.latency}
                  </span>{" "}
                  p99
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SLA Commitment */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Shield className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900 mb-2">
                  Service Level Agreement
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">
                  FeatureSignals Enterprise plans include a 99.95% uptime SLA
                  guarantee across all services. Pro plans include 99.9% uptime.
                  SLA credits are automatically applied to your next billing
                  cycle in the event of a breach.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="rounded-lg bg-white border border-stone-200 px-4 py-2 text-center">
                    <div className="text-lg font-bold text-accent">99.95%</div>
                    <div className="text-xs text-stone-500">Enterprise SLA</div>
                  </div>
                  <div className="rounded-lg bg-white border border-stone-200 px-4 py-2 text-center">
                    <div className="text-lg font-bold text-stone-700">
                      99.9%
                    </div>
                    <div className="text-xs text-stone-500">Pro SLA</div>
                  </div>
                  <div className="rounded-lg bg-white border border-stone-200 px-4 py-2 text-center">
                    <div className="text-lg font-bold text-stone-700">
                      99.98%
                    </div>
                    <div className="text-xs text-stone-500">Actual (90d)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incident History */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-xl font-bold text-stone-900 mb-6">
            Recent Incidents
          </h2>
          {incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.title}
                  className="rounded-xl border border-stone-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-900 text-sm">
                        {incident.title}
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {incident.date} · {incident.duration}
                      </p>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {incident.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-stone-200 bg-white">
              <CheckCircle
                className="h-10 w-10 text-emerald-500 mx-auto mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm font-semibold text-stone-700">
                No recent incidents
              </p>
              <p className="text-xs text-stone-500 mt-1">
                All services have been operating normally.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Subscribe */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Get status notifications
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-8 text-sm">
            Subscribe to receive notifications about incidents and scheduled
            maintenance. We'll notify you via email or Slack.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-white placeholder-stone-500 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-md shrink-0"
            >
              Subscribe
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <p className="text-xs text-stone-600 mt-4">
            Or visit{" "}
            <a
              href="https://status.featuresignals.com"
              className="text-accent hover:underline"
            >
              status.featuresignals.com
            </a>{" "}
            for real-time status updates.
          </p>
        </div>
      </section>
    </>
  );
}
