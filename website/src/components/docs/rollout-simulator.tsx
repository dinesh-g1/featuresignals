"use client";

import React, { useState, useMemo, useCallback } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Hashing (MurmurHash3-inspired 32-bit)
// In production FeatureSignals uses MurmurHash3-128 for deterministic bucket
// assignment. This simple but effective hash is for demo purposes only.
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i) | 0;
  }
  return h >>> 0; // unsigned 32-bit
}

function getBucket(flagKey: string, userKey: string): number {
  const input = `${flagKey}.${userKey}`;
  const hash = hashString(input);
  return hash % 10000; // 0–9999 basis points
}

// ---------------------------------------------------------------------------
// Preset Users
// ---------------------------------------------------------------------------

interface PresetUser {
  name: string;
  key: string;
}

const PRESET_USERS: PresetUser[] = [
  { name: "Alice (US)", key: "alice@acme.com" },
  { name: "Bob (EU)", key: "bob@example.de" },
  { name: "Carol (Startup)", key: "carol@startup.io" },
  { name: "Dave (Enterprise)", key: "dave@bigco.com" },
  { name: "Eve (Freelancer)", key: "eve@freelance.dev" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RolloutSimulator(): React.ReactElement {
  const [percentage, setPercentage] = useState(50);
  const [flagKey, setFlagKey] = useState("new-checkout");
  const [userKey, setUserKey] = useState("alice@acme.com");
  const [step, setStep] = useState(0);

  const bucket = useMemo(
    () => getBucket(flagKey, userKey),
    [flagKey, userKey],
  );
  const hashInput = `${flagKey}.${userKey}`;
  const hashVal = useMemo(
    () => hashString(hashInput),
    [flagKey, userKey],
  );
  const threshold = percentage * 100; // basis points
  const isIncluded = bucket < threshold;

  const handlePercentageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPercentage(Number(e.target.value));
    },
    [],
  );

  const selectUser = useCallback((key: string) => {
    setUserKey(key);
  }, []);

  const userResults = useMemo(
    () =>
      PRESET_USERS.map((u) => ({
        ...u,
        bucket: getBucket(flagKey, u.key),
        included: getBucket(flagKey, u.key) < threshold,
      })),
    [flagKey, threshold],
  );

  return (
    <div
      className={cn(
        "my-6 overflow-hidden",
        "rounded-[var(--signal-radius-lg)]",
        "border border-[var(--signal-border-default)]",
        "bg-[var(--signal-bg-primary)]",
        "shadow-[var(--signal-shadow-sm)]",
      )}
      data-demo="rollout"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className={cn(
          "px-5 py-5 sm:px-6",
          "border-b border-[var(--signal-border-subtle)]",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center",
            "text-[11px] font-semibold uppercase tracking-[0.06em]",
            "text-[var(--signal-fg-accent)]",
            "bg-[var(--signal-bg-accent-muted)]",
            "px-2.5 py-0.5",
            "rounded-[var(--signal-radius-sm)]",
          )}
        >
          Interactive Demo
        </span>
        <h3 className="mt-1.5 mb-1 text-lg font-semibold text-[var(--signal-fg-primary)]">
          Percentage Rollout Simulator
        </h3>
        <p className="m-0 text-[13px] leading-relaxed text-[var(--signal-fg-secondary)]">
          See how consistent hashing deterministically assigns users to rollout
          buckets. The same user + flag combination always maps to the same
          bucket.
        </p>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-[1fr_1.5fr]",
          "divide-y lg:divide-y-0 lg:divide-x divide-[var(--signal-border-subtle)]",
        )}
      >
        {/* ── Left: Controls ────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--signal-fg-secondary)]">
            Configuration
          </h4>

          {/* Flag Key */}
          <div className="mb-5">
            <label
              className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]"
              htmlFor="rs-flagKey"
            >
              Flag Key
            </label>
            <input
              id="rs-flagKey"
              className={cn(
                "w-full px-2.5 py-2",
                "border border-[var(--signal-border-default)]",
                "rounded-[var(--signal-radius-sm)]",
                "text-sm font-[var(--signal-font-mono)]",
                "bg-[var(--signal-bg-primary)]",
                "text-[var(--signal-fg-primary)]",
                "transition-colors duration-[var(--signal-duration-fast)]",
                "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
                "focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]",
              )}
              type="text"
              value={flagKey}
              onChange={(e) => setFlagKey(e.target.value)}
            />
          </div>

          {/* User Key */}
          <div className="mb-5">
            <label
              className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]"
              htmlFor="rs-userKey"
            >
              User Key
            </label>
            <input
              id="rs-userKey"
              className={cn(
                "w-full px-2.5 py-2",
                "border border-[var(--signal-border-default)]",
                "rounded-[var(--signal-radius-sm)]",
                "text-sm font-[var(--signal-font-mono)]",
                "bg-[var(--signal-bg-primary)]",
                "text-[var(--signal-fg-primary)]",
                "transition-colors duration-[var(--signal-duration-fast)]",
                "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
                "focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]",
              )}
              type="text"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.key}
                  className={cn(
                    "px-2 py-0.5",
                    "text-[11px] font-medium",
                    "border rounded-full",
                    "cursor-pointer transition-all duration-[var(--signal-duration-fast)]",
                    userKey === u.key
                      ? [
                          "bg-[var(--signal-bg-accent-emphasis)]",
                          "border-[var(--signal-bg-accent-emphasis)]",
                          "text-[var(--signal-fg-on-emphasis)]",
                        ]
                      : [
                          "bg-[var(--signal-bg-primary)]",
                          "border-[var(--signal-border-default)]",
                          "text-[var(--signal-fg-secondary)]",
                          "hover:border-[var(--signal-border-accent-emphasis)]",
                          "hover:text-[var(--signal-fg-accent)]",
                        ],
                  )}
                  onClick={() => selectUser(u.key)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Percentage Slider */}
          <div className="mb-5">
            <label
              className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]"
              htmlFor="rs-percentage"
            >
              Rollout Percentage: <strong>{percentage}%</strong>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--signal-fg-tertiary)] min-w-[2em]">
                0%
              </span>
              <input
                id="rs-percentage"
                className="flex-1"
                type="range"
                min={0}
                max={100}
                value={percentage}
                onChange={handlePercentageChange}
              />
              <span className="text-xs font-semibold text-[var(--signal-fg-tertiary)] min-w-[2em]">
                100%
              </span>
            </div>
          </div>

          {/* Visual Rollout Bar */}
          <div className="mb-5">
            <label className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]">
              Rollout Visualization
            </label>
            <div
              className={cn(
                "w-full h-6 rounded-[var(--signal-radius-sm)]",
                "bg-[var(--signal-bg-secondary)] overflow-hidden",
                "border border-[var(--signal-border-subtle)]",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-l-[var(--signal-radius-sm)]",
                  "transition-[width] duration-[var(--signal-duration-normal)]",
                )}
                style={{
                  width: `${percentage}%`,
                  background:
                    "linear-gradient(90deg, var(--signal-bg-success-emphasis), #2da44e)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-[var(--signal-fg-secondary)]">
              <span className="flex items-center gap-1">
                <CircleCheck
                  size={14}
                  className="text-[var(--signal-fg-success)]"
                />
                <strong>{percentage}%</strong> get the flag
              </span>
              <span className="flex items-center gap-1">
                <CircleX
                  size={14}
                  className="text-[var(--signal-fg-tertiary)]"
                />
                <strong>{100 - percentage}%</strong> don&apos;t
              </span>
            </div>
          </div>

          {/* User Overview */}
          <div className="mb-5">
            <label className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]">
              All Users at {percentage}% Rollout
            </label>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 mt-2">
              {userResults.map((u) => (
                <div
                  key={u.key}
                  className={cn(
                    "p-2.5 rounded-[var(--signal-radius-sm)]",
                    "border cursor-pointer transition-all duration-[var(--signal-duration-fast)]",
                    "bg-[var(--signal-bg-primary)]",
                    "hover:shadow-[var(--signal-shadow-sm)]",
                    u.included
                      ? [
                          "border-l-[3px] border-l-[var(--signal-border-success-emphasis)]",
                          "border-[var(--signal-border-subtle)]",
                          "hover:border-[var(--signal-border-accent-emphasis)]",
                        ]
                      : [
                          "border-l-[3px] border-l-[var(--signal-border-default)]",
                          "border-[var(--signal-border-subtle)]",
                          "hover:border-[var(--signal-border-accent-emphasis)]",
                        ],
                  )}
                  onClick={() => selectUser(u.key)}
                >
                  <div className="text-xs font-semibold text-[var(--signal-fg-primary)] mb-0.5">
                    {u.name}
                  </div>
                  <div className="text-[10px] font-[var(--signal-font-mono)] text-[var(--signal-fg-tertiary)]">
                    Bucket {u.bucket}
                  </div>
                  <div
                    className={cn(
                      "text-[11px] mt-1 flex items-center gap-1",
                      u.included
                        ? "text-[var(--signal-fg-success)]"
                        : "text-[var(--signal-fg-tertiary)]",
                    )}
                  >
                    {u.included ? (
                      <CircleCheck size={12} />
                    ) : (
                      <CircleX size={12} />
                    )}
                    {u.included ? "Gets flag" : "No flag"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Step-by-step Walkthrough ────────────────── */}
        <div className="p-5 sm:p-6">
          <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--signal-fg-secondary)]">
            Step-by-Step Walkthrough
          </h4>
          <p className="text-[13px] leading-relaxed text-[var(--signal-fg-secondary)] mb-4">
            Click each step to see how FeatureSignals determines whether{" "}
            <strong>{userKey}</strong> gets the{" "}
            <code className="text-[var(--signal-fg-accent)]">{flagKey}</code>{" "}
            flag at <strong>{percentage}%</strong> rollout.
          </p>

          <div className="flex flex-col gap-0">
            {/* ── Step 1 ── */}
            <StepButton
              num={1}
              title="Build the hash input"
              active={step === 0}
              onClick={() => setStep(0)}
            />
            {step === 0 && (
              <StepDetail>
                <p>
                  The engine concatenates the <strong>flag key</strong> and{" "}
                  <strong>user key</strong> with a dot separator to create a
                  unique input for hashing:
                </p>
                <CodeBlock>
                  &quot;{flagKey}&quot; + &quot;.&quot; + &quot;{userKey}&quot;
                </CodeBlock>
                <ResultText>
                  → <code>&quot;{hashInput}&quot;</code>
                </ResultText>
              </StepDetail>
            )}

            {/* ── Step 2 ── */}
            <StepButton
              num={2}
              title="Hash with MurmurHash3"
              active={step === 1}
              onClick={() => setStep(1)}
            />
            {step === 1 && (
              <StepDetail>
                <p>
                  The combined string is hashed using{" "}
                  <strong>MurmurHash3</strong>, producing a 32-bit unsigned
                  integer. MurmurHash3 is fast, non-cryptographic, and provides
                  excellent uniform distribution.
                </p>
                <CodeBlock>
                  MurmurHash3(&quot;{hashInput}&quot;)
                </CodeBlock>
                <ResultText>
                  → <code>{hashVal}</code> (0x
                  {hashVal.toString(16).padStart(8, "0")})
                </ResultText>
              </StepDetail>
            )}

            {/* ── Step 3 ── */}
            <StepButton
              num={3}
              title="Map to basis points (0–9999)"
              active={step === 2}
              onClick={() => setStep(2)}
            />
            {step === 2 && (
              <StepDetail>
                <p>
                  The hash is reduced modulo <strong>10,000</strong> to map it
                  into the basis point range. This gives 0.01% granularity.
                </p>
                <CodeBlock>{hashVal} % 10000</CodeBlock>
                <ResultText>
                  → Bucket <code>{bucket}</code> ({(bucket / 100).toFixed(2)}%)
                </ResultText>
              </StepDetail>
            )}

            {/* ── Step 4 ── */}
            <StepButton
              num={4}
              title="Compare against rollout threshold"
              active={step === 3}
              onClick={() => setStep(3)}
            />
            {step === 3 && (
              <StepDetail>
                <p>
                  The user&apos;s bucket (<code>{bucket}</code>) is compared to
                  the rollout threshold (<code>{threshold}</code> basis points ={" "}
                  {percentage}%). If the bucket is <strong>less than</strong>{" "}
                  the threshold, the user gets the flag.
                </p>
                <CodeBlock>if bucket &lt; threshold {"{"}</CodeBlock>
                <CodeBlock>{"  "}return ROLLOUT (flag value)</CodeBlock>
                <CodeBlock>{"}"} else {"{"}</CodeBlock>
                <CodeBlock>
                  {"  "}return FALLTHROUGH (default value)
                </CodeBlock>
                <CodeBlock>{"}"}</CodeBlock>
                <ResultText>
                  → <code>{bucket}</code> {"<"} <code>{threshold}</code> →{" "}
                  <strong>
                    {bucket < threshold
                      ? "ROLLOUT — gets the flag!"
                      : "FALLTHROUGH — uses default value"}
                  </strong>
                </ResultText>
              </StepDetail>
            )}

            {/* ── Step 5 ── */}
            <StepButton
              num={5}
              title="Deterministic guarantee"
              active={step === 4}
              onClick={() => setStep(4)}
            />
            {step === 4 && (
              <StepDetail>
                <p>
                  Because the hash is <strong>deterministic</strong>, the same{" "}
                  <code>{userKey}</code> + <code>{flagKey}</code> will{" "}
                  <em>always</em> map to bucket <code>{bucket}</code>.
                </p>
                <ul className="my-2 pl-5 text-[13px] space-y-1.5">
                  <li>
                    <strong>Consistency:</strong> {userKey} always gets the same
                    result for <code>{flagKey}</code>
                  </li>
                  <li>
                    <strong>Uniform distribution:</strong> Users are evenly
                    spread across all 10,000 buckets
                  </li>
                  <li>
                    <strong>Cross-flag independence:</strong> Each flag uses its
                    own key, so <code>{userKey}</code> is at different
                    percentiles for different flags
                  </li>
                  <li>
                    <strong>Stickiness:</strong> Increasing the percentage only
                    adds new users —{" "}
                    {isIncluded
                      ? `${userKey} won't lose the flag if you increase the percentage further`
                      : `${userKey} will only get the flag if you increase to above ${((bucket + 1) / 100).toFixed(2)}%`}
                  </li>
                </ul>
              </StepDetail>
            )}
          </div>

          {/* Final Verdict */}
          <div
            className={cn(
              "mt-5 p-4 rounded-[var(--signal-radius-md)]",
              "border-2 text-center",
              isIncluded
                ? [
                    "bg-[var(--signal-bg-success-muted)]",
                    "border-[var(--signal-border-success-emphasis)]",
                  ]
                : [
                    "bg-[var(--signal-bg-danger-muted)]",
                    "border-[var(--signal-border-danger-emphasis)]",
                  ],
            )}
          >
            <div
              className={cn(
                "text-base font-bold mb-1.5 flex items-center justify-center gap-1.5",
                isIncluded
                  ? "text-[var(--signal-fg-success)]"
                  : "text-[var(--signal-fg-danger)]",
              )}
            >
              {isIncluded ? (
                <>
                  <CircleCheck size={18} />
                  GETS THE FEATURE
                </>
              ) : (
                <>
                  <CircleX size={18} />
                  DOES NOT GET THE FEATURE
                </>
              )}
            </div>
            <div className="text-[13px] text-[var(--signal-fg-secondary)] leading-relaxed">
              User <code>{userKey}</code> → hash{" "}
              <code>0.{String(bucket).padStart(4, "0")}</code> → falls in the{" "}
              <strong>
                {isIncluded ? `${percentage}%` : `${100 - percentage}%`}
              </strong>{" "}
              bucket →{" "}
              {isIncluded ? " gets the new feature" : " uses the default"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function StepButton({
  num,
  title,
  active,
  onClick,
}: {
  num: number;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-2.5 w-full",
        "px-3 py-2.5 mb-1",
        "rounded-[var(--signal-radius-sm)]",
        "text-sm font-medium text-left",
        "cursor-pointer transition-all duration-[var(--signal-duration-fast)]",
        active
          ? [
              "bg-[var(--signal-bg-accent-emphasis)]",
              "text-[var(--signal-fg-on-emphasis)]",
              "hover:bg-[var(--signal-bg-accent-hover)]",
            ]
          : [
              "bg-[var(--signal-bg-secondary)]",
              "text-[var(--signal-fg-primary)]",
              "hover:bg-[var(--signal-bg-accent-muted)]",
            ],
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex items-center justify-center",
          "w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0",
          active ? "bg-white/25" : "bg-[var(--signal-border-default)]",
        )}
      >
        {num}
      </span>
      <span className="flex-1">{title}</span>
    </button>
  );
}

function StepDetail({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "px-4 py-3 mb-2 ml-9",
        "bg-[var(--signal-bg-secondary)]",
        "rounded-[var(--signal-radius-sm)]",
        "border-l-[3px] border-l-[var(--signal-border-accent-emphasis)]",
        "text-[13px] text-[var(--signal-fg-secondary)]",
        "leading-relaxed",
        "[&_p]:mt-0 [&_p]:mb-1.5",
      )}
    >
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className={cn(
        "my-1.5 px-3 py-2",
        "bg-[var(--signal-bg-primary)]",
        "border border-[var(--signal-border-subtle)]",
        "rounded-[var(--signal-radius-sm)]",
        "text-xs font-[var(--signal-font-mono)]",
        "overflow-x-auto",
      )}
    >
      <code>{children}</code>
    </pre>
  );
}

function ResultText({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-semibold text-[var(--signal-fg-primary)] mt-1.5 mb-0">
      {children}
    </p>
  );
}
