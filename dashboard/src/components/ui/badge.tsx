import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-600 ring-slate-200",
        primary: "bg-indigo-50 text-indigo-700 ring-indigo-100",
        success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        warning: "bg-amber-50 text-amber-700 ring-amber-200",
        danger: "bg-red-50 text-red-700 ring-red-200",
        info: "bg-blue-50 text-blue-700 ring-blue-200",
        purple: "bg-purple-50 text-purple-700 ring-purple-200",
        orange: "bg-orange-50 text-orange-700 ring-orange-200",
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
