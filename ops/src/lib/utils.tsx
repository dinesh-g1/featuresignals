import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function capitalize(str: string): string {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return dateStr;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-400";
    case "provisioning":
      return "text-yellow-400";
    case "maintenance":
      return "text-orange-400";
    case "suspended":
      return "text-red-400";
    case "decommissioning":
      return "text-gray-400";
    case "decommissioned":
      return "text-gray-600";
    default:
      return "text-gray-400";
  }
}

export function statusBadge(status: string): React.ReactNode {
  const colorMap: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    provisioning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    maintenance: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
    decommissioning: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    decommissioned: "bg-gray-500/5 text-gray-600 border-gray-500/10",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colorMap[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}
    >
      {status}
    </span>
  );
}

export function planBadge(plan: string): React.ReactNode {
  const colorMap: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-400",
    trial: "bg-yellow-500/10 text-yellow-400",
    pro: "bg-blue-500/10 text-blue-400",
    enterprise: "bg-purple-500/10 text-purple-400",
    onprem: "bg-indigo-500/10 text-indigo-400",
  };

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${colorMap[plan] || "bg-gray-500/10 text-gray-400"}`}
    >
      {plan}
    </span>
  );
}

export function marginColor(margin: number): string {
  if (margin >= 70) return "text-green-400";
  if (margin >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}
