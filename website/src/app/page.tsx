import { CalculatorProvider } from "@/lib/calculator-context";
import { HeroCalculator } from "@/components/hero-calculator";
import { LiveEvalDemo } from "@/components/live-eval-demo";
import { MigrationPreview } from "@/components/migration-preview";
import { AiJanitorSimulator } from "@/components/ai-janitor-simulator";
import { PricingSection } from "@/components/pricing-section";
import { FinalCta } from "@/components/final-cta";

/**
 * FeatureSignals Homepage — The Only Page That Matters
 *
 * Architecture: One scrollable experience. No separate pages.
 * Each section proves a claim through interaction — no static card grids.
 *
 * Flow:
 *   1. Hero — live cost calculator (value before signup)
 *   2. Live Demo — sub-millisecond eval in your browser
 *   3. Migration Preview — connect your provider, see real savings
 *   4. AI Janitor — stale flag detection simulator
 *   5. Pricing — personalized savings from calculator state
 *   6. Final CTA — ready to ship faster
 *
 * CalculatorProvider lifts hero calculator state so the pricing section
 * can display personalized savings reflecting user selections above.
 */
export default function HomePage() {
  return (
    <CalculatorProvider>
      {/* 1. Hero: Stop overpaying for feature flags */}
      <HeroCalculator />

      {/* 2. Live Demo: See sub-millisecond evaluation */}
      <LiveEvalDemo />

      {/* 3. Migration Preview: Migrate from LaunchDarkly in minutes */}
      <MigrationPreview />

      {/* 4. AI Janitor: The AI Janitor */}
      <AiJanitorSimulator />

      {/* 5. Pricing: Pay for infrastructure, not per seat */}
      <PricingSection />

      {/* 6. Final CTA: Ready to ship faster? */}
      <FinalCta />
    </CalculatorProvider>
  );
}
