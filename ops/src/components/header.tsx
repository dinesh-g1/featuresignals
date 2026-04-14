"use client";

import { useAppStore } from "@/stores/app-store";
import { capitalize } from "@/lib/utils";

export function Header() {
  const user = useAppStore((s) => s.user);
  const opsRole = useAppStore((s) => s.opsRole);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
      <div>
        <h2 className="text-sm font-medium text-gray-300">
          FeatureSignals Operations
        </h2>
      </div>
      <div className="flex items-center gap-4">
        {opsRole && (
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
            {capitalize(opsRole.ops_role.replace("_", " "))}
          </span>
        )}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="text-sm text-gray-300">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
