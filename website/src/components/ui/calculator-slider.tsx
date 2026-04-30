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
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[var(--fgColor-default)]"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-[var(--fgColor-accent)] font-mono font-bold text-xl tabular-nums"
          aria-live="polite"
        >
          {formatValue(value)}
        </output>
      </div>

      <div className="relative">
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1.5 rounded-full bg-[var(--borderColor-default)]" />

        {/* Filled track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-full bg-[var(--fgColor-accent)] transition-[width] duration-100"
          style={{ width: `${percentage}%` }}
        />

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="relative w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[var(--fgColor-accent)]
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-[var(--shadow-resting-small)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-shadow
            [&::-webkit-slider-thumb]:duration-150
            [&::-webkit-slider-thumb]:mt-[-6px]
            hover:[&::-webkit-slider-thumb]:shadow-[var(--shadow-floating-small)]
            focus:[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--borderColor-accent-muted)]
            focus:outline-none
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[var(--fgColor-accent)]
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-[var(--shadow-resting-small)]
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-none
            hover:[&::-moz-range-thumb]:shadow-[var(--shadow-floating-small)]
            focus:[&::-moz-range-thumb]:shadow-[0_0_0_3px_var(--borderColor-accent-muted)]
            [&::-moz-range-track]:bg-transparent
            [&::-moz-range-track]:h-1.5
            [&::-moz-range-track]:rounded-full
            aria-disabled:opacity-50
            aria-disabled:cursor-not-allowed"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
        />
      </div>

      <div className="flex justify-between text-xs text-[var(--fgColor-subtle)] mt-2">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
