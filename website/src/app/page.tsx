import { CalculatorProvider } from "@/lib/calculator-context";
import { HeroCalculator } from "@/components/hero-calculator";
import { LifecycleCards } from "@/components/lifecycle-cards";
import { PricingSection } from "@/components/pricing-section";
import { FinalCta } from "@/components/final-cta";

/**
 * FeatureSignals Homepage — The Complete Feature Flag Lifecycle Platform
 *
 * Flow:
 *   1. Hero — live cost calculator (value before signup)
 *   2. Lifecycle Cards — Create → Target → Rollout → Clean Up → Migrate
 *   3. Pricing — transparent pricing, no lock-in
 *   4. Final CTA — ready to ship faster
 */
export default function HomePage() {
  return (
    <CalculatorProvider>
      {/* 1. Hero: Stop overpaying for feature flags */}
      <HeroCalculator />

      {/* 2. Lifecycle Cards: The complete feature flag lifecycle */}
      <LifecycleCards />

      {/* 3. Pricing: Transparent pricing */}
      <PricingSection />

      {/* 4. Final CTA: Ready to ship faster? */}
      <FinalCta />
    </CalculatorProvider>
  );
}
