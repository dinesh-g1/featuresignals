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

function CheckIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="var(--fgColor-accent)"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm4.28 7.78a.75.75 0 00-1.06-1.06l-4.97 4.97-1.97-1.97a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l5.5-5.5z"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  variant = "default",
  showWordmark = true,
  className,
}: LogoProps) {
  const s = sizeMap[size];

  const textColor =
    variant === "light"
      ? "text-white"
      : variant === "minimal"
        ? "text-[var(--fgColor-default)]"
        : "text-[var(--fgColor-default)]";

  const accentGradient =
    variant === "light"
      ? "from-[#54aeff] to-[#80ccff]"
      : "from-[#0969da] to-[#54aeff]";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CheckIcon size={s.icon} />

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
            <span className="text-[10px] font-medium tracking-[0.2em] text-[var(--fgColor-subtle)] uppercase">
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
  return <CheckIcon size={size} />;
}
