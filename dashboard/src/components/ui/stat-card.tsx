import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const colorMap = {
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
  red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-100" },
  slate: { bg: "bg-slate-50", text: "text-slate-600", ring: "ring-slate-100" },
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
      "rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300/80 sm:p-6",
      className,
    )}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn("rounded-xl p-2.5 ring-1 sm:p-3", c.bg, c.ring)}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", c.text)} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        </div>
      </div>
    </div>
  );
}
