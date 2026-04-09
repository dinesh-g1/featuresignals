import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const colorMap = {
  indigo: {
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    hoverShadow: "hover:shadow-indigo-200/60",
  },
  emerald: {
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    hoverShadow: "hover:shadow-emerald-200/60",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
    hoverShadow: "hover:shadow-amber-200/60",
  },
  blue: {
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    hoverShadow: "hover:shadow-blue-200/60",
  },
  red: {
    iconBg: "bg-gradient-to-br from-red-500 to-red-600",
    hoverShadow: "hover:shadow-red-200/60",
  },
  purple: {
    iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
    hoverShadow: "hover:shadow-purple-200/60",
  },
  slate: {
    iconBg: "bg-gradient-to-br from-slate-500 to-slate-600",
    hoverShadow: "hover:shadow-slate-200/60",
  },
} as const;

type StatColor = keyof typeof colorMap;

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: StatColor;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "indigo",
  className,
}: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      "rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm ring-1 ring-slate-100/50 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:p-6",
      c.hoverShadow,
      className,
    )}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn("rounded-xl p-2.5 shadow-sm sm:p-3", c.iconBg)}>
          <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        </div>
      </div>
    </div>
  );
}
