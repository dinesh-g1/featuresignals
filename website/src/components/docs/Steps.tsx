"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StepsProps {
  children: React.ReactNode;
}

export interface StepProps {
  children: React.ReactNode;
  /** Optional bold title rendered above the step content. */
  title?: string;
}

/** Internal props injected by the Steps container. */
interface StepInternal {
  _stepNumber?: number;
  _isLast?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Steps Container                                                    */
/* ------------------------------------------------------------------ */

/**
 * Shared MDX container for numbered step-by-step instructions.
 *
 * Wrap `<Step>` elements inside `<Steps>` to render a vertically-connected
 * sequence of numbered steps. Each step displays a circled accent-colored
 * number, an optional bold title, and freeform content. A subtle vertical
 * line connects consecutive steps.
 *
 * All colors are drawn exclusively from Signal UI CSS custom properties;
 * zero hardcoded hex values.
 *
 * @example
 * ```mdx
 * <Steps>
 *   <Step title="Install the SDK">
 *     Run this command to install the FeatureSignals SDK...
 *   </Step>
 *   <Step title="Initialize the client">
 *     Create a client instance with your environment key...
 *   </Step>
 * </Steps>
 * ```
 */
function Steps({ children }: StepsProps) {
  const steps = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<StepProps & StepInternal> =>
      React.isValidElement(child),
  );

  if (steps.length === 0) return null;

  return (
    <ol
      className={cn(
        "relative my-8 list-none space-y-0 pl-0",
        /* Ensure the list does not inherit default padding or markers */
      )}
      role="list"
    >
      {steps.map((step, i) =>
        React.cloneElement<StepProps & StepInternal>(step, {
          key: i,
          _stepNumber: i + 1,
          _isLast: i === steps.length - 1,
        }),
      )}
    </ol>
  );
}

Steps.displayName = "Steps";

/* ------------------------------------------------------------------ */
/*  Step                                                               */
/* ------------------------------------------------------------------ */

function Step({
  children,
  title,
  _stepNumber = 1,
  _isLast = false,
}: StepProps & StepInternal) {
  return (
    <li
      className={cn(
        "relative flex gap-4 pb-8",
        "last:pb-0",
      )}
      role="listitem"
    >
      {/* Vertical connecting line — hidden on the last step */}
      {!_isLast && (
        <div
          className="absolute left-5 top-10 bottom-0 w-px"
          style={{ backgroundColor: "var(--signal-border-subtle)" }}
          aria-hidden="true"
        />
      )}

      {/* Circled step number */}
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center",
          "rounded-full",
          "text-sm font-bold select-none",
        )}
        style={{
          backgroundColor: "var(--signal-bg-accent-emphasis)",
          color: "var(--signal-fg-on-emphasis)",
        }}
        aria-hidden="true"
      >
        {_stepNumber}
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1 pt-2">
        {title && (
          <p
            className="text-base font-semibold leading-snug"
            style={{ color: "var(--signal-fg-primary)" }}
          >
            {title}
          </p>
        )}

        <div
          className={cn(
            "text-sm leading-relaxed",
            "text-[var(--signal-fg-secondary)]",
            title && "mt-1",
          )}
        >
          {children}
        </div>
      </div>
    </li>
  );
}

Step.displayName = "Step";

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Step };
export default Steps;
