"use client";

import { useState } from "react";
import { Activity, Brain, ArrowRight } from "lucide-react";

function calculateRot(size: number): string {
  return (size * 75 * 52 * 1.5).toLocaleString();
}

export function FlagRotCalculator() {
  const [teamSize, setTeamSize] = useState(50);

  return (
    <div className="space-y-8">
      <p className="text-[var(--fgColor-muted)] leading-relaxed text-lg">
        When a feature reaches 100% rollout, our engine automatically issues a
        GitHub Pull Request to delete the dead code. No tickets. No sprint
        planning. Just clean code.
      </p>

      <div
        className="p-8 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
        style={{
          boxShadow: "0 1px 1px 0 #1f23280a, 0 1px 2px 0 #1f232808",
        }}
      >
        <h3 className="text-xl font-bold text-[var(--fgColor-default)] mb-6">
          Calculate Your Flag Rot Liability
        </h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label
                className="text-sm font-semibold text-[var(--fgColor-default)]"
                htmlFor="team-size-slider"
              >
                Engineering Team Size
              </label>
              <span className="text-[var(--fgColor-accent)] font-mono font-bold text-lg">
                {teamSize}
              </span>
            </div>
            <input
              id="team-size-slider"
              type="range"
              min="5"
              max="500"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full"
              aria-label="Team size"
            />
            <div className="flex justify-between text-xs text-[var(--fgColor-subtle)] mt-1">
              <span>5 engineers</span>
              <span>500 engineers</span>
            </div>
          </div>
          <div className="pt-6 border-t border-[var(--borderColor-muted)]">
            <div className="text-sm font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-2">
              Annual Financial Hemorrhage
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-[var(--fgColor-default)] tracking-tight">
              $
              <span className="text-[var(--fgColor-accent)]">
                {calculateRot(teamSize)}
              </span>
            </div>
            <p className="text-xs text-[var(--fgColor-muted)] mt-2">
              Based on $75/hr blended cost × 1.5 hrs/week wasted per engineer on
              stale flags
            </p>
          </div>
        </div>
      </div>

      <a
        href="https://app.featuresignals.com/register"
        className="inline-flex items-center gap-2 text-[var(--fgColor-accent)] font-semibold hover:text-[var(--color-accent-dark)] transition-colors"
      >
        Start recovering that cost today
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
