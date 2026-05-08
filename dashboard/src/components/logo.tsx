import {
  PrismLotus,
  PrismLotusIcon,
  type PrismLotusProps,
} from "@/components/prism-lotus";

/* ------------------------------------------------------------------ */
/*  Logo — backward-compatible wrapper around PrismLotus.             */
/*                                                                     */
/*  Existing callers use:                                              */
/*    <Logo size="md" variant="default" showWordmark />                */
/*    <LogoIcon size={24} />                                           */
/*                                                                     */
/*  Both work identically; the visual mark is now the Prism Lotus.    */
/* ------------------------------------------------------------------ */

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  /** default = purple on light bg, light = white on dark bg, minimal = monochrome */
  variant?: "default" | "light" | "minimal";
  showWordmark?: boolean;
  className?: string;
}

/** Maps legacy Logo variant to PrismLotus colorScheme. */
function variantToScheme(
  variant: LogoProps["variant"],
): PrismLotusProps["colorScheme"] {
  switch (variant) {
    case "light":
      return "white";
    case "minimal":
      return "monochrome";
    default:
      return "default";
  }
}

export function Logo({
  size = "md",
  variant = "default",
  showWordmark = true,
  className,
}: LogoProps) {
  return (
    <PrismLotus
      size={size}
      variant="full"
      showWordmark={showWordmark}
      colorScheme={variantToScheme(variant)}
      className={className}
    />
  );
}

/**
 * Minimal icon-only version — useful for favicon-sized spaces, mobile headers, etc.
 * Preserved for backward compatibility.
 */
export function LogoIcon({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <PrismLotusIcon size={size} className={className} colorScheme="default" />
  );
}
