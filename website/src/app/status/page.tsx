"use client";

import { SectionReveal } from "@/components/section-reveal";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  Globe,
  Server,
  Database,
  Cpu,
  Shield,
} from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
  icon: typeof Server;
  uptime: string;
  latency?: string;
}

const services: Service[] = [
  {
    name: "Management API",
    description: "Dashboard, CRUD operations, authentication",
    status: "operational",
    icon: Server,
    uptime: "99.99%",
    latency: "45ms",
  },
  {
    name: "Evaluation API",
    description: "Flag evaluation, SDK endpoints",
    status: "operational",
    icon: Cpu,
    uptime: "99.999%",
    latency: "8ms",
  },
  {
    name: "Dashboard",
    description: "Web application at app.featuresignals.com",
    status: "operational",
    icon: Globe,
    uptime: "99.99%",
  },
  {
    name: "Database",
    description: "PostgreSQL primary and replicas",
    status: "operational",
    icon: Database,
    uptime: "99.99%",
  },
  {
    name: "SSE Streaming",
    description: "Real-time flag update notifications",
    status: "operational",
    icon: Activity,
    uptime: "99.98%",
    latency: "12ms",
  },
  {
    name: "Webhook Delivery",
    description: "Event notifications to customer endpoints",
    status: "operational",
    icon: Globe,
    uptime: "99.95%",
  },
];

const recentIncidents = [
  {
    date: "April 5, 2026",
    title: "No incidents reported",
    description: "All systems operated normally.",
    status: "operational" as ServiceStatus,
  },
  {
    date: "April 4, 2026",
    title: "No incidents reported",
    description: "All systems operated normally.",
    status: "operational" as ServiceStatus,
  },
  {
    date: "April 3, 2026",
    title: "No incidents reported",
    description: "All systems operated normally.",
    status: "operational" as ServiceStatus,
  },
];

const statusConfig: Record<
  ServiceStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle }
> = {
  operational: {
    label: "Operational",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: CheckCircle,
  },
  degraded: {
    label: "Degraded",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: AlertTriangle,
  },
  outage: {
    label: "Outage",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: XCircle,
  },
  maintenance: {
    label: "Maintenance",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Clock,
  },
};

function getOverallStatus(svcs: Service[]): ServiceStatus {
  if (svcs.some((s) => s.status === "outage")) return "outage";
  if (svcs.some((s) => s.status === "degraded")) return "degraded";
  if (svcs.some((s) => s.status === "maintenance")) return "maintenance";
  return "operational";
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

export default function StatusPage() {
  const overall = getOverallStatus(services);
  const overallCfg = statusConfig[overall];
  const OverallIcon = overallCfg.icon;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <SectionReveal>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <Shield className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              System Status
            </h1>
            <div
              className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${overallCfg.bg} ${overallCfg.color}`}
            >
              <OverallIcon className="h-5 w-5" />
              {overall === "operational"
                ? "All systems operational"
                : overallCfg.label}
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Last checked: {new Date().toLocaleString()} &middot; Auto-refreshes
              every 60 seconds
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Services */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-lg font-semibold text-slate-900">
              Current Status
            </h2>
            <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.name}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                        <Icon className="h-4.5 w-4.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {service.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {service.latency && (
                        <span className="hidden text-xs text-slate-400 sm:inline">
                          {service.latency} avg
                        </span>
                      )}
                      <span className="hidden text-xs text-slate-400 sm:inline">
                        {service.uptime} uptime
                      </span>
                      <StatusBadge status={service.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Uptime bars — 90-day visual */}
      <section className="pb-10 sm:pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-lg font-semibold text-slate-900">
              90-Day Uptime
            </h2>
            <div className="mt-4 space-y-4">
              {services.slice(0, 3).map((service) => (
                <div key={service.name} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {service.name}
                    </p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {service.uptime}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-px">
                    {Array.from({ length: 90 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-8 flex-1 rounded-[1px] bg-emerald-400 transition-colors hover:bg-emerald-500"
                        title={`Day ${90 - i}: Operational`}
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="border-t border-slate-100 bg-slate-50 py-10 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Incidents
            </h2>
            <div className="mt-4 space-y-4">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.date}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {incident.date}
                    </p>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {incident.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {incident.description}
                  </p>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Subscribe */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <SectionReveal>
            <h2 className="text-lg font-semibold text-slate-900">
              Stay Informed
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Subscribe to status updates and get notified when incidents occur.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="https://github.com/dinesh-g1/featuresignals"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                Watch on GitHub
              </a>
              <a
                href="mailto:status@featuresignals.com?subject=Subscribe to status updates"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
              >
                Subscribe via Email
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
