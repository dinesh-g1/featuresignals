import { CalculatorProvider } from "@/lib/calculator-context";
import { HeroCalculator } from "@/components/hero-calculator";
import { LiveEvalDemo } from "@/components/live-eval-demo";
import { MigrationPreview } from "@/components/migration-preview";
import { AiJanitorSimulator } from "@/components/ai-janitor-simulator";
import { PricingSection } from "@/components/pricing-section";
import { FinalCta } from "@/components/final-cta";

/**
 * FeatureSignals Homepage
 *
 * Architecture: Each section proves a claim through interaction — no static card grids.
 * Phase 1: Hero Calculator + Live Eval Demo + Migration Preview
 * Phase 2: AI Janitor Simulator + Pricing + Final CTA
 *
 * CalculatorProvider lifts the hero calculator state so the pricing section
 * can display personalized savings that reflect the user's selections above.
 *
 * See FINAL_PROMPT.md Section 3 for the complete 60-second website spec.
 */
export default function HomePage() {
  return (
    <CalculatorProvider>
      {/* Section 1: Hero with live cost calculator */}
      <HeroCalculator />

      {/* Section 2: Live flag evaluation demo */}
      <LiveEvalDemo />

      {/* Section 3: Real migration preview */}
      <MigrationPreview />

      {/* Section 4: AI Janitor Simulator — stale flag detection animation */}
      <AiJanitorSimulator />

      {/* Section 5: Pricing — personal savings carried through from calculator */}
      <PricingSection />

      {/* Section 6: Final CTA with dark gradient and footer badges */}
      <FinalCta />
    </CalculatorProvider>
  );
}
