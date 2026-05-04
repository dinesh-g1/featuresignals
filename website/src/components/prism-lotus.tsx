import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  FeatureSignals Logo — The Signal Ring                             */
/*                                                                     */
/*  A solid blue circle with a white ring and dot at centre.          */
/*  The wordmark shares the exact same blue. One coherent entity.     */
/* ------------------------------------------------------------------ */

export interface PrismLotusProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  variant?: "full" | "icon";
  className?: string;
  showWordmark?: boolean;
  colorScheme?: "default" | "monochrome" | "white";
}

const SIZE_MAP: Record<string, number> = {
  sm: 32,
  md: 44,
  lg: 60,
  xl: 88,
};

function resolveSize(size: PrismLotusProps["size"]): number {
  if (typeof size === "number") return size;
  return SIZE_MAP[size ?? "md"] ?? 44;
}

const TEXT_SIZE_MAP: Record<string, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

/* ================================================================== */
/*  Signal Ring                                                       */
/* ================================================================== */

function SignalRing({
  size,
  colorScheme,
  className,
}: {
  size: number;
  colorScheme: PrismLotusProps["colorScheme"];
  className?: string;
}) {
  const schemeClass = `ring-${colorScheme ?? "default"}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", schemeClass, className)}
      aria-hidden="true"
    >
      <style>{`
        .ring-default .ring-bg   { fill: #0969da; }
        .ring-default .ring-ring { stroke: white; }
        .ring-default .ring-dot  { fill: white; }

        .ring-monochrome .ring-bg   { fill: var(--fgColor-default); }
        .ring-monochrome .ring-ring { stroke: white; }
        .ring-monochrome .ring-dot  { fill: white; }

        .ring-white .ring-bg   { fill: white; }
        .ring-white .ring-ring { stroke: #0969da; }
        .ring-white .ring-dot  { fill: #0969da; }
      `}</style>

      <circle cx="70" cy="70" r="48" className="ring-bg" />
      <circle
        cx="70"
        cy="70"
        r="26"
        className="ring-ring"
        strokeWidth="7"
        fill="none"
      />
      <circle cx="70" cy="70" r="8" className="ring-dot" />
    </svg>
  );
}

/* ================================================================== */
/*  Wordmark — shares the logo's blue, treated as one entity          */
/* ================================================================== */

function Wordmark({
  sizeKey,
  colorScheme,
}: {
  sizeKey: string;
  colorScheme: PrismLotusProps["colorScheme"];
}) {
  const textSize = TEXT_SIZE_MAP[sizeKey] ?? "text-base";

  const accentColor =
    colorScheme === "white"
      ? "text-white"
      : colorScheme === "monochrome"
        ? "text-[var(--fgColor-default)]"
        : "text-[#0969da]";

  const mainColor =
    colorScheme === "white" ? "text-white/90" : "text-[var(--fgColor-default)]";

  return (
    <div className="flex flex-col leading-none">
      <span className={cn("font-bold tracking-tight", textSize, mainColor)}>
        Feature
        <span className={accentColor}>Signals</span>
      </span>
      {sizeKey === "xl" && (
        <span className="text-[10px] font-medium tracking-[0.2em] text-[var(--fgColor-subtle)] uppercase mt-0.5">
          Enterprise Control Plane
        </span>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Public API                                                        */
/* ================================================================== */

export function PrismLotus({
  size = "md",
  variant = "full",
  className,
  showWordmark = true,
  colorScheme = "default",
}: PrismLotusProps) {
  const px = resolveSize(size);
  const sizeKey = typeof size === "number" ? "md" : (size ?? "md");

  if (variant === "icon") {
    return (
      <SignalRing size={px} colorScheme={colorScheme} className={className} />
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SignalRing size={px} colorScheme={colorScheme} />
      {showWordmark && <Wordmark sizeKey={sizeKey} colorScheme={colorScheme} />}
    </div>
  );
}
