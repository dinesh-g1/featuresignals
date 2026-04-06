"use client";

import { useEffect, useState } from "react";
import { SectionReveal } from "@/components/section-reveal";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Globe,
  Server,
  Cpu,
  Shield,
  Info,
} from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "outage" | "unknown";

interface ServiceCheck {
  name: string;
  description: string;
  icon: typeof Server;
  status: ServiceStatus;
}

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
  unknown: {
    label: "Checking...",
    color: "text-slate-500",
    bg: "bg-slate-50",
    icon: Activity,
  },
};

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

function getOverallStatus(services: ServiceCheck[]): ServiceStatus {
  if (services.some((s) => s.status === "outage")) return "outage";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  if (services.every((s) => s.status === "unknown")) return "unknown";
  return "operational";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function StatusPage() {
  const [services, setServices] = useState<ServiceCheck[]>([
    { name: "Management API", description: "Dashboard, CRUD operations, authentication", icon: Server, status: "unknown" },
    { name: "Evaluation API", description: "Flag evaluation, SDK endpoints", icon: Cpu, status: "unknown" },
    { name: "SSE Streaming", description: "Real-time flag update notifications", icon: Activity, status: "unknown" },
    { name: "Dashboard", description: "Web application", icon: Globe, status: "unknown" },
  ]);
  const [lastChecked, setLastChecked] = useState<string>("");

  useEffect(() => {
    async function checkHealth() {
      const updated = [...services];
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
        const isHealthy = res.ok;
        updated[0] = { ...updated[0], status: isHealthy ? "operational" : "degraded" };
        updated[1] = { ...updated[1], status: isHealthy ? "operational" : "degraded" };
        updated[2] = { ...updated[2], status: isHealthy ? "operational" : "degraded" };
      } catch {
        updated[0] = { ...updated[0], status: "unknown" };
        updated[1] = { ...updated[1], status: "unknown" };
        updated[2] = { ...updated[2], status: "unknown" };
      }
      updated[3] = { ...updated[3], status: "operational" };
      setServices(updated);
      setLastChecked(new Date().toLocaleString());
    }
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                : overall === "unknown"
                  ? "Checking status..."
                  : overallCfg.label}
            </div>
            {lastChecked && (
              <p className="mt-3 text-sm text-slate-400">
                Last checked: {lastChecked} &middot; Auto-refreshes every 60
                seconds
              </p>
            )}
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
                    <StatusBadge status={service.status} />
                  </div>
                );
              })}
            </div>
          </SectionReveal>

          <SectionReveal delay={0.1}>
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">
                This page checks the FeatureSignals API health endpoint in
                real-time. For self-hosted deployments, configure{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">
                  NEXT_PUBLIC_API_URL
                </code>{" "}
                to point to your instance.
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="border-t border-slate-100 bg-slate-50 py-10 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-lg font-semibold text-slate-900">
              Report an Issue
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              If you are experiencing an issue that is not reflected on this
              page, please contact us.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="mailto:support@featuresignals.com"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
              >
                Contact Support
              </a>
              <a
                href="https://github.com/dinesh-g1/featuresignals/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                Open GitHub Issue
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
