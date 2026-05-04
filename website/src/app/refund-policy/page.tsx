import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "FeatureSignals refund policy. Details on eligibility, processing time, and exceptions for subscription refunds.",
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Refund Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-800">
          1. Subscription Refunds
        </h2>
        <p>
          For monthly Pro subscriptions, you may request a full refund within 14
          days of your initial payment. After 14 days, no refunds are issued for
          the current billing period, but your subscription will remain active
          until the end of the paid period.
        </p>
        <p>
          For annual Pro subscriptions, you may request a prorated refund for
          the unused portion of your subscription term within the first 30 days.
          After 30 days, refunds are not available for annual plans.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          2. Enterprise Plans
        </h2>
        <p>
          Enterprise plan refunds are governed by the terms of your signed
          Enterprise Agreement. Please refer to your contract for specific
          refund provisions. Contact your account manager for assistance.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">3. Free Tier</h2>
        <p>
          The Free tier has no associated fees and therefore no refunds are
          applicable. You may cancel your account at any time.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          4. Service Downtime Credits
        </h2>
        <p>
          If the Service fails to meet our SLA commitments (99.9% for Pro,
          99.95% for Enterprise), you may be eligible for service credits as
          outlined in your plan agreement. SLA credits are calculated as a
          percentage of your monthly fee based on the actual uptime achieved.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          5. How to Request a Refund
        </h2>
        <p>
          To request a refund, contact us at{" "}
          <a
            href="/contact?reason=sales"
            className="text-accent hover:underline"
          >
            billing@featuresignals.com
          </a>{" "}
          with your account email and reason for the request. We will process
          your request within 5-7 business days. Refunds are issued to the
          original payment method.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">6. Exceptions</h2>
        <p>No refunds are provided for:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Add-on services or one-time purchases</li>
          <li>Accounts terminated for Terms of Service violations</li>
          <li>Periods where the service was used and then discontinued</li>
          <li>
            Third-party integrations or services purchased through our platform
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">7. Chargebacks</h2>
        <p>
          If you initiate a chargeback without first requesting a refund, your
          account may be suspended. We encourage you to contact us first so we
          can resolve any billing issues directly.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">8. Contact</h2>
        <p>
          For billing inquiries and refund requests, contact us at{" "}
          <a
            href="/contact?reason=sales"
            className="text-accent hover:underline"
          >
            billing@featuresignals.com
          </a>
        </p>
      </div>
    </div>
  );
}
