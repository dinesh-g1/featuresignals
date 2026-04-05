import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-indigo-600 border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  },
);

interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({
  size,
  className,
  fullPage = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn(spinnerVariants({ size }), className)} />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center py-24">{spinner}</div>
    );
  }

  return spinner;
}
