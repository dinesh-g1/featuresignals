import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "Cancellation terms for FeatureSignals subscriptions — how to cancel, when it takes effect, and what happens next.",
};

export default function CancellationPolicyPage() {
  return (
    <LegalArticle title="Cancellation Policy">
      <SectionReveal>
        <p>
          This Cancellation Policy applies to paid subscriptions for{" "}
          <strong>FeatureSignals</strong>, a product of{" "}
          <strong>Vivekananda Technology Labs</strong>. It explains how and when
          you can cancel your subscription, and what happens after cancellation.
        </p>

        <h2>1. How to cancel</h2>
        <p>
          You may cancel your subscription at any time using either of these
          methods:
        </p>
        <ul>
          <li>
            Through the <strong>billing settings</strong> in your FeatureSignals
            dashboard at{" "}
            <a href="https://app.featuresignals.com">app.featuresignals.com</a>{" "}(or regional equivalent).
          </li>
          <li>
            By emailing{" "}
            <a href="mailto:support@featuresignals.com">support@featuresignals.com</a>{" "}
            from the email address associated with your account.
          </li>
        </ul>

        <h2>2. When cancellation takes effect</h2>
        <p>
          Once you cancel, your subscription will remain active until the{" "}
          <strong>end of your current billing period</strong> (monthly or
          annual, as applicable). You will continue to have full access to paid
          features until that date. After the billing period ends, your account
          will be downgraded to the Free plan.
        </p>

        <h2>3. Cancellation duration</h2>
        <p>
          Cancellation requests are processed within <strong>24 hours</strong> of
          receipt. Once confirmed, no further charges will be made. There is no
          minimum commitment period — you can cancel at any time, even during
          the first billing cycle.
        </p>

        <h2>4. Data after cancellation</h2>
        <p>
          When your subscription ends, your projects, flags, and configuration
          data are retained on the Free plan (subject to Free plan limits). If
          you exceed Free plan limits, you may need to reduce usage or export
          your data. We do not immediately delete your data upon cancellation —
          you will have a reasonable window to export or re-subscribe.
        </p>

        <h2>5. Refunds on cancellation</h2>
        <p>
          Cancellation stops future renewals but does not entitle you to a
          refund of the current billing period&apos;s fees, as the service
          continues to be available until the period ends. For billing errors
          or duplicate charges, please refer to our{" "}
          <Link href="/refund-policy">Refund Policy</Link>, which allows refund
          requests within <strong>14 days</strong> of the charge to the{" "}
          <strong>original payment method</strong>.
        </p>

        <h2>6. Re-subscribing</h2>
        <p>
          You can upgrade back to a paid plan at any time through your
          dashboard. Your existing data and configuration (within retention
          limits) will be available when you re-subscribe.
        </p>

        <h2>7. Account deletion</h2>
        <p>
          If you wish to permanently delete your account and all associated data
          (instead of just cancelling the subscription), email{" "}
          <a href="mailto:support@featuresignals.com">support@featuresignals.com</a>
          . Account deletion is irreversible and will be processed within{" "}
          <strong>7 business days</strong>.
        </p>

        <h2>8. Contact</h2>
        <p>
          For cancellation questions, email{" "}
          <a href="mailto:support@featuresignals.com">support@featuresignals.com</a>{" "}
          with your account email.
        </p>
      </SectionReveal>
    </LegalArticle>
  );
}
