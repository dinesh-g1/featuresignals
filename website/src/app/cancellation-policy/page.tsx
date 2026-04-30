import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "FeatureSignals cancellation policy. How to cancel your subscription and what happens after cancellation.",
};

export default function CancellationPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Cancellation Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">Last updated: January 15, 2026</p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-800">1. Cancellation Rights</h2>
        <p>
          You may cancel your FeatureSignals subscription at any time. No long-term contracts
          are required for monthly or annual plans. Enterprise plans are subject to the terms
          of your Enterprise Agreement.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">2. How to Cancel</h2>
        <p>To cancel your subscription:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Self-Service (Pro):</strong> Go to Settings → Billing → Cancel Subscription
            in the dashboard. Cancellation takes effect immediately.
          </li>
          <li>
            <strong>Enterprise:</strong> Contact your account manager or email us at{" "}
            <a href="mailto:sales@featuresignals.com" className="text-accent hover:underline">
              sales@featuresignals.com
            </a>{" "}
            with your cancellation request.
          </li>
          <li>
            <strong>Email:</strong> Send a cancellation request to{" "}
            <a href="mailto:billing@featuresignals.com" className="text-accent hover:underline">
              billing@featuresignals.com
            </a>{" "}
            from your registered email address.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">3. What Happens After Cancellation</h2>
        <p>Upon cancellation:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your subscription remains active until the end of the current billing period</li>
          <li>No further charges will be made</li>
          <li>You will be downgraded to the Free tier at the end of the billing period</li>
          <li>Flags that exceed Free tier limits will be disabled but not deleted</li>
          <li>You retain read-only access to your data for 30 days after the billing period ends</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">4. Data Export</h2>
        <p>
          We strongly recommend exporting your data before cancellation. You can export:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Flag configurations via the dashboard or API</li>
          <li>Audit logs (available on Pro and Enterprise plans)</li>
          <li>Analytics and metrics data</li>
          <li>IaC configurations (Terraform, Pulumi, Ansible formats)</li>
        </ul>
        <p>
          After 30 days following the end of your billing period, your data may be permanently
          deleted. We provide a grace period for data recovery — contact support if you need
          assistance.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">5. Reactivation</h2>
        <p>
          You can reactivate your subscription at any time within 90 days of cancellation. Your
          flags, segments, and configurations will be restored to their pre-cancellation state.
          After 90 days, data may no longer be available for recovery.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">6. Downgrade to Free</h2>
        <p>
          If you cancel a paid plan, your account automatically downgrades to the Free tier. The
          following limits apply:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Up to 100 feature flags (excess flags are disabled)</li>
          <li>Up to 3 team members (excess members are removed)</li>
          <li>Up to 2 environments (excess environments are disabled)</li>
          <li>Basic targeting rules only</li>
          <li>7-day evaluation history</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">7. Involuntary Cancellation</h2>
        <p>
          We reserve the right to suspend or terminate accounts for:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Violation of our Terms &amp; Conditions</li>
          <li>Non-payment of fees after a 7-day grace period</li>
          <li>Fraudulent or illegal activity associated with the account</li>
        </ul>
        <p>
          In such cases, we will provide notice where possible and a 14-day window to appeal or
          export data before permanent deletion.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">8. Contact</h2>
        <p>
          For cancellation assistance, contact us at{" "}
          <a href="mailto:billing@featuresignals.com" className="text-accent hover:underline">
            billing@featuresignals.com
          </a>
        </p>
      </div>
    </div>
  );
}
