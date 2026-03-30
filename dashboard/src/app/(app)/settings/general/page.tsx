"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function SettingsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<any[]>([]);

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then(setEnvs).catch(() => {});
  }, [token, projectId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <Link href="/settings/general" className="border-b-2 border-blue-600 px-4 py-2 text-sm font-medium text-blue-600">General</Link>
        <Link href="/settings/api-keys" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">API Keys</Link>
        <Link href="/settings/members" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Members</Link>
        <Link href="/settings/environments" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Environments</Link>
      </nav>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-4">Environments</h2>
        <div className="space-y-2">
          {envs.map((env) => (
            <div key={env.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color }} />
              <span className="text-sm font-medium">{env.name}</span>
              <span className="text-xs text-gray-500">({env.slug})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
