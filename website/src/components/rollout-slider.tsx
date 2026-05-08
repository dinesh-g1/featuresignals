"use client";

import { useState, useCallback, useMemo, useId } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Users,
  Rocket,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface RingStage {
  label: string;
  percentage: number;
  description: string;
  users: number;
}

const TOTAL_USERS = 10_000;

const RING_STAGES: RingStage[] = [
  {
    label: "Canary",
    percentage: 5,
    description: "Internal team + early adopters",
    users: 500,
  },
  {
    label: "Ring 1",
    percentage: 25,
    description: "Beta users, 25% of production",
    users: 2500,
  },
  {
    label: "Ring 2",
    percentage: 50,
    description: "Half of all users",
    users: 5000,
  },
  {
    label: "Ring 3",
    percentage: 100,
    description: "Full rollout — 100% of users",
    users: 10000,
  },
];

export function RolloutSlider() {
  const [percentage, setPercentage] = useState(0);
  const [isRollingOut, setIsRollingOut] = useState(false);
  const sliderId = useId();

  const currentStage = useMemo(() => {
    const stage = RING_STAGES.find((s) => percentage <= s.percentage);
    return stage ?? RING_STAGES[RING_STAGES.length - 1];
  }, [percentage]);

  const usersReceiving = useMemo(
    () => Math.round((percentage / 100) * TOTAL_USERS),
    [percentage],
  );

  const usersNotReceiving = TOTAL_USERS - usersReceiving;

  const handleStartRollout = useCallback(() => {
    setIsRollingOut(true);
    // If at 0, jump to canary
    if (percentage === 0) {
      setPercentage(5);
    }
  }, [percentage]);

  const quickSets = [0, 5, 25, 50, 75, 100];

  return (
    <div
      className="rounded-2xl border border-[var(--signal-border-default)] bg-white p-6 sm:p-8"
      style={{ boxShadow: "var(--signal-shadow-lg)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)]">
          <Rocket size={16} fill="var(--signal-fg-accent)" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
            Gradual Rollout
          </h3>
          <p className="text-xs text-[var(--signal-fg-secondary)]">
            Flag: new-checkout-flow
          </p>
        </div>
      </div>

      {/* Percentage display */}
      <div className="text-center mb-6">
        <motion.div
          key={percentage}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="text-5xl font-bold text-[var(--signal-fg-primary)] tabular-nums tracking-tight"
        >
          {percentage}%
        </motion.div>
        <div className="text-sm text-[var(--signal-fg-secondary)] mt-1">
          of users receiving this flag
        </div>
      </div>

      {/* Slider */}
      <div className="mb-6">
        <div className="relative mb-3">
          <input
            id={sliderId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={percentage}
            onChange={(e) => {
              setPercentage(Number(e.target.value));
              setIsRollingOut(true);
            }}
            style={{
              background: `linear-gradient(to right, var(--signal-fg-accent) 0%, var(--signal-fg-accent) ${percentage}%, var(--signal-border-default) ${percentage}%, var(--signal-border-default) 100%)`,
            }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-transparent
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[var(--signal-fg-accent)]
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-[var(--signal-shadow-sm)]
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:mt-[-6px]
              focus:outline-none
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-[var(--signal-fg-accent)]
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:border-none
              [&::-moz-range-track]:bg-transparent
              [&::-moz-range-track]:h-2
              [&::-moz-range-track]:rounded-full"
            aria-label="Rollout percentage"
          />
        </div>

        {/* Quick set buttons */}
        <div className="flex justify-between">
          {quickSets.map((pct) => (
            <button
              key={pct}
              onClick={() => {
                setPercentage(pct);
                setIsRollingOut(true);
              }}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors duration-150 ${
                percentage === pct
                  ? "bg-[var(--signal-fg-accent)] text-white"
                  : "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]"
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Ring stages visualization */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-3">
          Deployment Rings
        </div>
        <div className="space-y-1.5">
          {RING_STAGES.map((stage, i) => {
            const isActive = percentage >= stage.percentage;
            const isCurrent =
              percentage <= stage.percentage &&
              (i === 0 || percentage > RING_STAGES[i - 1].percentage);

            return (
              <div
                key={stage.label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors duration-150 ${
                  isCurrent
                    ? "bg-[var(--signal-bg-accent-muted)] border border-[var(--signal-border-accent-muted)]"
                    : isActive
                      ? "text-[var(--signal-fg-secondary)]"
                      : "text-[var(--signal-fg-tertiary)] opacity-60"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-[var(--signal-fg-accent)] text-white"
                      : "border border-[var(--signal-border-default)] text-[var(--signal-fg-tertiary)]"
                  }`}
                >
                  {isActive ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--signal-fg-primary)]">
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-[var(--signal-fg-secondary)]">
                    {stage.description}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-[var(--signal-fg-primary)] tabular-nums">
                    {stage.percentage}%
                  </div>
                  <div className="text-[10px] text-[var(--signal-fg-tertiary)]">
                    {stage.users.toLocaleString()} users
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User distribution bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider">
            User Distribution
          </span>
          <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
            {TOTAL_USERS.toLocaleString()} total users
          </span>
        </div>
        <div className="h-8 rounded-lg overflow-hidden flex bg-[var(--signal-border-subtle)]">
          {percentage > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex items-center justify-center bg-[var(--signal-bg-success-emphasis)] text-white text-[10px] font-bold overflow-hidden"
            >
              {percentage >= 8 && (
                <span>
                  <Users size={12} /> {usersReceiving.toLocaleString()}
                </span>
              )}
            </motion.div>
          )}
          <div className="h-full flex items-center justify-center text-[10px] text-[var(--signal-fg-tertiary)] flex-1">
            {percentage < 92 && (
              <span>{usersNotReceiving.toLocaleString()} excluded</span>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      {isRollingOut && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg p-3 mb-4 flex items-start gap-2 ${
            percentage === 100
              ? "bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]"
              : percentage === 0
                ? "bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]"
                : "bg-[var(--signal-bg-warning-muted)] border border-[var(--signal-border-warning-muted)]"
          }`}
        >
          {percentage === 100 ? (
            <ShieldCheck size={16} fill="var(--signal-fg-success)" />
          ) : percentage === 0 ? (
            <Zap size={16} fill="var(--signal-fg-tertiary)" />
          ) : (
            <Rocket size={16} fill="var(--signal-fg-warning)" />
          )}
          <div>
            <div className="text-xs font-semibold text-[var(--signal-fg-primary)]">
              {percentage === 100
                ? "Fully rolled out — 100% of users"
                : percentage === 0
                  ? "Flag created but not yet rolled out"
                  : `Rolling out to ${currentStage.label} — ${percentage}% of users`}
            </div>
            <div className="text-[10px] text-[var(--signal-fg-secondary)] mt-0.5">
              {percentage === 100
                ? "All users are receiving this flag. Safe to remove targeting."
                : percentage === 0
                  ? "Start with a canary release to test with a small group."
                  : "Monitor error rates and user feedback before increasing."}
            </div>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        {percentage === 0 && !isRollingOut && (
          <button
            onClick={handleStartRollout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139] transition-colors duration-150"
            style={{ boxShadow: "0 1px 0 0 #1f232826" }}
          >
            <Rocket size={16} />
            Start Canary Release
          </button>
        )}
        <a
          href="/cleanup"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-fg-accent)] hover:bg-[#0757ba] transition-colors duration-150"
        >
          Clean up when done
          <ChevronRight size={16} />
        </a>
      </div>
    </div>
  );
}
