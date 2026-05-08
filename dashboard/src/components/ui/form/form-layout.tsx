import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FormLayout — a max-width, single-column container for all forms.
 *
 * Per NNGroup Eyetracking findings (pp. 176-193):
 * - All forms must use single-column, left-aligned, stacked-label layout.
 * - Max-width 560px keeps line lengths readable for labels and inputs.
 * - No multi-column forms anywhere.
 */
interface FormLayoutProps {
  children: ReactNode;
  className?: string;
}

export function FormLayout({ children, className }: FormLayoutProps) {
  return (
    <div className={cn("w-full max-w-[560px] space-y-5", className)}>
      {children}
    </div>
  );
}
