"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light" | "minimal";
  showWordmark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 20, text: "text-sm", gap: 2 },
  md: { icon: 24, text: "text-base", gap: 2.5 },
  lg: { icon: 28, text: "text-lg", gap: 3 },
  xl: { icon: 32, text: "text-xl", gap: 3 },
};

export function Logo({
  size = "md",
  variant = "default",
  showWordmark = true,
  className,
}: LogoProps) {
  const s = sizeMap[size];

  const iconFill = variant === "light" ? "#0d9488" : "#0d9488";
  const iconBg = variant === "light" ? "white" : "#0d9488";
  const iconWhite = variant === "light" ? "#0d9488" : "white";
  const textColor =
    variant === "light"
      ? "text-white"
      : variant === "minimal"
        ? "text-stone-700"
        : "text-stone-800";

  const accentGradient =
    variant === "light"
      ? "from-teal-300 to-teal-400"
      : "from-teal-600 to-teal-500";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Signal Dhvaja Icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Background */}
        <rect width="32" height="32" rx="7" fill={iconFill} />

        {/* Single flowing stroke: flag → signal — one continuous line, like calligraphy */}
        <path
          d="M7 3
             C7 3, 7 18, 7 29
             C7 18, 23 8, 17 14
             C13 18, 25 22, 25 29"
          stroke={iconWhite}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Single signal dot — the moment of transmission */}
        <circle cx="24.5" cy="26" r="1.8" fill={iconWhite} opacity="0.85" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight", s.text, textColor)}>
            Feature
            <span
              className={cn(
                "bg-gradient-to-r bg-clip-text text-transparent",
                accentGradient,
              )}
            >
              Signals
            </span>
          </span>
          {size === "xl" && (
            <span className="text-[10px] font-medium tracking-[0.2em] text-stone-400 uppercase">
              Enterprise Control Plane
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal icon-only version — useful for favicon-sized spaces, mobile headers, etc.
 */
export function LogoIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#0d9488" />

      {/* Single flowing stroke: flag → signal */}
      <path
        d="M7 3
           C7 3, 7 18, 7 29
           C7 18, 23 8, 17 14
           C13 18, 25 22, 25 29"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Signal dot */}
      <circle cx="24.5" cy="26" r="1.8" fill="white" opacity="0.85" />
    </svg>
  );
}
