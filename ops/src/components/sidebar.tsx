"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { capitalize } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  LayoutDashboard,
  Server,
  Users,
  DollarSign,
  Activity,
  Shield,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    roles: ["all"],
  },
  {
    icon: Server,
    label: "Environments",
    href: "/environments",
    roles: ["founder", "engineer", "customer_success", "demo_team"],
  },
  {
    icon: Users,
    label: "Customers",
    href: "/customers",
    roles: ["founder", "engineer", "customer_success"],
  },
  {
    icon: Shield,
    label: "Licenses",
    href: "/licenses",
    roles: ["founder", "engineer"],
  },
  {
    icon: Activity,
    label: "Sandboxes",
    href: "/sandboxes",
    roles: ["all"],
  },
  {
    icon: Activity,
    label: "Observability",
    href: "/observability",
    roles: ["founder", "engineer"],
  },
  {
    icon: DollarSign,
    label: "Financial",
    href: "/financial",
    roles: ["founder", "finance"],
  },
  {
    icon: FileText,
    label: "Audit Log",
    href: "/audit",
    roles: ["founder", "engineer", "customer_success"],
  },
  {
    icon: Settings,
    label: "Ops Users",
    href: "/ops-users",
    roles: ["founder"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const opsRole = useAppStore((s) => s.opsRole);
  const logout = useAppStore((s) => s.logout);
  const userName = useAppStore((s) => s.user?.name);
  const userEmail = useAppStore((s) => s.user?.email);

  // Hide sidebar on mobile - mobile navigation will handle it
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");

  const currentRole = opsRole?.ops_role || "viewer";

  const canSeeItem = (roles: string[]) => {
    if (roles.includes("all")) return true;
    return roles.includes(currentRole);
  };

  // Don't render sidebar on mobile devices
  if (isMobile) {
    return null;
  }

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900 md:flex md:flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600">
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold text-white">Ops Portal</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          if (!canSeeItem(item.roles)) return null;

          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  isActive
                    ? "text-blue-400"
                    : "text-transparent group-hover:text-gray-500",
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
              {userName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {userName}
              </p>
              <p className="truncate text-xs text-gray-400">{userEmail}</p>
            </div>
          </div>
          {opsRole && (
            <div className="mt-2">
              <span className="inline-block rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
                {capitalize(opsRole.ops_role.replace("_", " "))}
              </span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={logout}
          className="border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
