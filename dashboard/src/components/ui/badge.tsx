import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset shadow-sm transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-slate-50 to-slate-100/80 text-slate-600 ring-slate-200/80",
        primary: "bg-gradient-to-r from-indigo-50 to-indigo-100/50 text-indigo-700 ring-indigo-200/60",
        success: "bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 ring-emerald-200/60",
        warning: "bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-700 ring-amber-200/60",
        danger: "bg-gradient-to-r from-red-50 to-red-100/50 text-red-700 ring-red-200/60",
        info: "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 ring-blue-200/60",
        purple: "bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 ring-purple-200/60",
        orange: "bg-gradient-to-r from-orange-50 to-orange-100/50 text-orange-700 ring-orange-200/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

const categoryVariantMap: Record<string, BadgeProps["variant"]> = {
  release: "info",
  experiment: "purple",
  ops: "orange",
  permission: "success",
};

const statusVariantMap: Record<string, BadgeProps["variant"]> = {
  active: "success",
  rolled_out: "info",
  deprecated: "warning",
  archived: "default",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant={categoryVariantMap[category] || "default"}>
      {category}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariantMap[status] || "default"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export { Badge, badgeVariants, CategoryBadge, StatusBadge };
