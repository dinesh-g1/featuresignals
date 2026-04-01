"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

const settingsTabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/members", label: "Members" },
  { href: "/settings/environments", label: "Environments" },
];

export default function SettingsPage() {
  const pathname = usePathname();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<any[]>([]);

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
  }, [token, projectId]);

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

      <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Environments</h2>
        <div className="space-y-2">
          {envs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">No environments configured.</p>
            </div>
          ) : (
            envs.map((env) => (
              <div key={env.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30">
                <div className="h-3 w-3 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: env.color }} />
                <span className="text-sm font-medium text-slate-700">{env.name}</span>
                <span className="text-xs text-slate-500">({env.slug})</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
