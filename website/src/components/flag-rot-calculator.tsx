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
      <p className="text-stone-700 leading-relaxed text-lg">
        When a feature reaches 100% rollout, our engine automatically
        issues a GitHub Pull Request to delete the dead code. No
        tickets. No sprint planning. Just clean code.
      </p>

      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
        <h3 className="text-xl font-bold text-stone-900 mb-6">
          Calculate Your Flag Rot Liability
        </h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label
                className="text-sm font-semibold text-stone-700"
                htmlFor="team-size-slider"
              >
                Engineering Team Size
              </label>
              <span className="text-accent font-mono font-bold text-lg">
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
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>5 engineers</span>
              <span>500 engineers</span>
            </div>
          </div>
          <div className="pt-6 border-t border-stone-200">
            <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Annual Financial Hemorrhage
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
              $<span className="text-accent">{calculateRot(teamSize)}</span>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Based on $75/hr blended cost × 1.5 hrs/week wasted per
              engineer on stale flags
            </p>
          </div>
        </div>
      </div>

      <a
        href="https://app.featuresignals.com/register"
        className="inline-flex items-center gap-2 text-accent font-semibold hover:text-accent-dark transition-colors"
      >
        Start recovering that cost today
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
