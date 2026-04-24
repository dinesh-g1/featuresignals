import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition-all duration-200",
        "placeholder:text-stone-400",
        "hover:border-stone-300 hover:shadow-md",
        "focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/10 focus:shadow-md",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-stone-50",
        "file:border-0 file:bg-transparent file:font-medium file:text-sm file:text-stone-700",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
