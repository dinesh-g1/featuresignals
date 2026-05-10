import { CheckIcon, XIcon } from "@/components/icons/nav-icons";

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

  // Use inline styles for widths to avoid hydration mismatches from
  // dynamic Tailwind arbitrary values (Tailwind JIT can't resolve
  // template literals at build time).
  const widthPercent = (score / 5) * 100;

  const levelColors: Record<string, string> = {
    none: "bg-gray-200",
    weak: "bg-red-400",
    fair: "bg-amber-500",
    good: "bg-yellow-500",
    strong: "bg-emerald-500",
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${levelColors[level]}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              c.met ? "text-emerald-600" : "text-gray-400"
            }`}
          >
            {c.met ? (
              <CheckIcon className="h-3 w-3" />
            ) : (
              <XIcon className="h-3 w-3" />
            )}
            <span className="truncate">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
