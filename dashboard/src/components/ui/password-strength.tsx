import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Password Strength — inline color-coded progress bar
// Used in registration, password reset, and forgot password flows.
// ---------------------------------------------------------------------------

type PasswordChecks = Array<{ label: string; met: boolean }>;

export function getPasswordStrength(password: string): {
  score: number;
  checks: PasswordChecks;
  level: "none" | "weak" | "fair" | "good" | "strong";
} {
  const checks: PasswordChecks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "1 lowercase letter", met: /[a-z]/.test(password) },
    { label: "1 number", met: /\d/.test(password) },
    { label: "1 special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  const level =
    score === 0
      ? "none"
      : score <= 2
        ? "weak"
        : score <= 3
          ? "fair"
          : score <= 4
            ? "good"
            : "strong";
  return { score, checks, level };
}

export function isPasswordStrong(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

interface PasswordStrengthInlineProps {
  password: string;
}

export function PasswordStrengthInline({
  password,
}: PasswordStrengthInlineProps) {
  const { score, checks, level } = getPasswordStrength(password);

  if (!password) return null;

  const levelColors: Record<string, string> = {
    none: "bg-slate-200",
    weak: "bg-red-500",
    fair: "bg-amber-500",
    good: "bg-yellow-500",
    strong: "bg-emerald-500",
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            levelColors[level],
            `w-[${(score / 5) * 100}%]`,
          )}
        />
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3">
        {checks.map((c) => (
          <div
            key={c.label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              c.met ? "text-emerald-600" : "text-slate-400",
            )}
          >
            {c.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span className="truncate">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
