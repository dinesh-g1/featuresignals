"use client";

import { useId } from "react";

interface CalculatorSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  minLabel: string;
  maxLabel: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

export function CalculatorSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  minLabel,
  maxLabel,
  formatValue = (v) => String(v),
  disabled = false,
}: CalculatorSliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[var(--signal-fg-primary)]"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-[var(--signal-fg-accent)] font-mono font-bold text-xl tabular-nums"
          aria-live="polite"
        >
          {formatValue(value)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          background: `linear-gradient(to right, var(--signal-fg-accent) 0%, var(--signal-fg-accent) ${pct}%, var(--signal-border-default) ${pct}%, var(--signal-border-default) 100%)`,
        }}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-[var(--signal-fg-accent)]
          [&::-webkit-slider-thumb]:shadow-[var(--signal-shadow-sm)]
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-1.5
          hover:[&::-webkit-slider-thumb]:shadow-[var(--signal-shadow-md)]
          focus:[&::-webkit-slider-thumb]:ring-2 focus:[&::-webkit-slider-thumb]:ring-[var(--signal-border-accent-muted)]
          focus:outline-none
          [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--signal-fg-accent)]
          [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
          [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-1.5
          disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
      />

      <div className="flex justify-between text-xs text-[var(--signal-fg-tertiary)] mt-2">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
