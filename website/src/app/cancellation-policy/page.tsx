import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "FeatureSignals cancellation policy. Cancel your SaaS subscription anytime — no long-term contracts. Learn about auto-renewal, data retention, reactivation, and self-hosted license revocation.",
};

export default function CancellationPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Cancellation Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        {/* ---- 1. Overview ---- */}
        <h2 className="text-lg font-semibold text-stone-800">1. Overview</h2>
        <p>
          FeatureSignals, operated by{" "}
          <strong>Vivekananda Technology Labs</strong>, believes that you should
          have full control over your subscription. We do not require long-term
          contracts for any plan tier. You may cancel your subscription at any
          time, for any reason, without penalty. This policy explains how
          cancellation works, what happens to your data, and your options for
          reactivation.
        </p>
        <p>
          This policy applies to subscriptions purchased directly through
          featuresignals.com. Enterprise customers with separately negotiated
          agreements should also refer to the cancellation terms in their
          executed contract.
        </p>

        {/* ---- 2. No Long-Term Contracts ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          2. No Long-Term Contracts — Cancel Anytime
        </h2>
        <p>
          All FeatureSignals plans operate on a subscription basis with no
          long-term commitment:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Monthly Pro:</strong> Billed every month. You can cancel at
            any time. Your cancellation takes effect at the end of the current
            billing period, and you retain full access to Pro features until
            that date.
          </li>
          <li>
            <strong>Annual Pro:</strong> Billed once per year. You can cancel at
            any time. If cancelled within the first 30 days, you may be eligible
            for a refund per our{" "}
            <a href="/refund-policy" className="text-accent hover:underline">
              Refund Policy
            </a>
            . If cancelled after 30 days, your subscription remains active until
            the end of the pre-paid annual term and no refund is issued.
          </li>
          <li>
            <strong>Enterprise:</strong> Enterprise plans are governed by
            individually negotiated agreements. Unless otherwise specified in
            your agreement, Enterprise plans require{" "}
            <strong>30 days&apos; written notice</strong> before the renewal
            date to cancel without penalty. Cancellation requests must be
            submitted by an authorized signatory on the account.
          </li>
          <li>
            <strong>Free tier:</strong> No payment required. You may stop using
            FeatureSignals at any time.
          </li>
        </ul>

        {/* ---- 3. How to Cancel ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          3. How to Cancel
        </h2>
        <p>
          We offer multiple ways to cancel your subscription. Choose the method
          most convenient for you:
        </p>

        <h3 className="text-base font-semibold text-stone-700 mt-4">
          3.1 Self-Service Cancellation (Recommended)
        </h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Log in to your FeatureSignals dashboard at app.featuresignals.com.
          </li>
          <li>
            Navigate to{" "}
            <strong>Settings → Billing → Cancel Subscription</strong>.
          </li>
          <li>Follow the on-screen prompts to confirm cancellation.</li>
          <li>
            You will receive an immediate on-screen confirmation and a{" "}
            <strong>cancellation confirmation email</strong> sent to the account
            owner&apos;s registered email address. Keep this email for your
            records.
          </li>
        </ol>

        <h3 className="text-base font-semibold text-stone-700 mt-4">
          3.2 Email Cancellation
        </h3>
        <p>
          If you are unable to access your dashboard, you may cancel by sending
          an email to{" "}
          <a
            href="mailto:billing@featuresignals.com"
            className="text-accent hover:underline"
          >
            billing@featuresignals.com
          </a>{" "}
          from the email address registered to your account. Please include:
        </p>
        <ul className="list-disc pl-6 space-y-0.5">
          <li>Account name or organization name</li>
          <li>Registered email address</li>
          <li>A clear statement that you wish to cancel your subscription</li>
        </ul>
        <p>
          We will process email cancellation requests within 1 business day and
          send a confirmation email once complete.
        </p>

        <h3 className="text-base font-semibold text-stone-700 mt-4">
          3.3 Enterprise Cancellation
        </h3>
        <p>
          Enterprise customers should contact their designated account manager
          or email{" "}
          <a
            href="mailto:sales@featuresignals.com"
            className="text-accent hover:underline"
          >
            sales@featuresignals.com
          </a>{" "}
          to initiate cancellation. Per Section 2, Enterprise cancellations
          require 30 days&apos; written notice before the renewal date.
        </p>

        {/* ---- 4. Effective Date of Cancellation ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          4. Effective Date of Cancellation
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Monthly Pro subscriptions:</strong> Cancellation takes
            effect at the <strong>end of the current billing period</strong>.
            You retain full access to Pro features until that date. No further
            charges will be made.
          </li>
          <li>
            <strong>Annual Pro subscriptions:</strong> If cancelled within the
            30-day refund window, cancellation is effective immediately upon
            processing and a refund will be issued per our Refund Policy. If
            cancelled after the refund window, your subscription remains active
            until the end of the pre-paid annual term.
          </li>
          <li>
            <strong>Enterprise subscriptions:</strong> Cancellation is effective
            at the end of the notice period specified in your Enterprise
            Agreement (minimum 30 days).
          </li>
        </ul>

        {/* ---- 5. Auto-Renewal ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          5. Auto-Renewal
        </h2>
        <p>
          All paid subscriptions renew automatically at the end of each billing
          period unless cancelled before the renewal date. By subscribing, you
          authorize FeatureSignals to charge your payment method on file at each
          renewal.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Clear disclosure:</strong> The auto-renewal terms are
            clearly stated on the checkout page before you confirm your
            subscription. Your subscription confirmation email also includes the
            renewal date and amount.
          </li>
          <li>
            <strong>Reminder email:</strong> FeatureSignals sends a{" "}
            <strong>renewal reminder email 7 calendar days</strong> before each
            renewal. For annual subscriptions, an additional reminder is sent 30
            days before renewal. Each reminder includes the upcoming charge
            amount, date, and a direct link to manage or cancel your
            subscription.
          </li>
          <li>
            <strong>Failed renewals:</strong> If your payment method fails at
            renewal, we will retry the charge over a 7-day grace period. During
            the grace period, your service remains active. If payment is not
            resolved within 7 days, your subscription will be downgraded to the
            Free tier.
          </li>
          <li>
            <strong>Price changes:</strong> If your subscription price changes,
            we will notify you at least 30 days in advance. Your continued use
            after the price change takes effect constitutes acceptance of the
            new price.
          </li>
        </ul>

        {/* ---- 6. What Happens After Cancellation ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          6. What Happens After Cancellation
        </h2>
        <p>
          Upon the effective date of cancellation, the following changes apply
          to your account:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Plan downgrade:</strong> Your account is automatically
            downgraded to the Free tier. You retain access to the FeatureSignals
            platform with Free-tier limits: up to 100 feature flags, 3 team
            members, 2 environments, basic targeting rules, and 7-day evaluation
            history.
          </li>
          <li>
            <strong>Excess resources:</strong> Feature flags, environments, and
            team members that exceed Free-tier limits are{" "}
            <strong>disabled</strong> — not deleted. They are preserved and can
            be re-enabled if you upgrade back to a paid plan.
          </li>
          <li>
            <strong>API keys:</strong> Your existing API keys and SDK keys
            continue to function. Evaluation will continue within Free-tier rate
            limits.
          </li>
          <li>
            <strong>Self-hosted license keys:</strong> For self-hosted
            Enterprise deployments, your license key will be{" "}
            <strong>revoked</strong> at the end of the notice period. The
            revocation process:
            <ul className="list-disc pl-6 mt-1 space-y-0.5">
              <li>
                You will receive a 14-day, 7-day, and 1-day notice before the
                license key is revoked.
              </li>
              <li>
                Upon revocation, the FeatureSignals server instance will
                continue to evaluate flags in a degraded mode (existing flag
                states cached for 24 hours, no configuration changes accepted)
                before stopping evaluation entirely.
              </li>
              <li>
                You are responsible for removing the FeatureSignals dependency
                from your application code before the revocation date.
              </li>
            </ul>
          </li>
        </ul>

        {/* ---- 7. Data Retention After Cancellation ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          7. Data Retention After Cancellation
        </h2>
        <p>
          We understand that your data is important. Our data retention policy
          after cancellation is designed to give you time to export or
          reactivate:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>30-day retention window:</strong> All your data — feature
            flags, segments, targeting rules, audit logs, analytics, and
            configuration — is preserved in full for{" "}
            <strong>30 calendar days</strong> after the effective date of
            cancellation. During this window, you can:
            <ul className="list-disc pl-6 mt-1 space-y-0.5">
              <li>
                Reactivate your subscription with all data intact (see Section
                8).
              </li>
              <li>
                Export your data via the dashboard or API (see Section 9).
              </li>
              <li>Access your account in read-only mode on the Free tier.</li>
            </ul>
          </li>
          <li>
            <strong>Permanent deletion:</strong> After the 30-day retention
            window, your data is{" "}
            <strong>permanently and irreversibly deleted</strong> from our
            production systems. Backups containing your data are cycled out
            according to our backup retention schedule (30 days). Once deleted,
            data cannot be recovered.
          </li>
          <li>
            <strong>Data export before cancellation:</strong> We strongly
            recommend exporting all desired data before cancelling. See Section
            9 for export options.
          </li>
        </ul>

        {/* ---- 8. Reactivation ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          8. Reactivation
        </h2>
        <p>
          You can reactivate a cancelled subscription at any time within the
          30-day data retention window:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Within 30 days:</strong> Log in to your dashboard, navigate
            to Settings → Billing, and select &ldquo;Reactivate
            Subscription.&rdquo; All your data, flags, segments, targeting
            rules, and configuration are restored to their pre-cancellation
            state. Billing resumes on your previous plan at the then-current
            rate.
          </li>
          <li>
            <strong>After 30 days:</strong> Your data has been permanently
            deleted. You may create a new account and subscription, but your
            previous data cannot be recovered.
          </li>
          <li>
            <strong>Reactivation billing:</strong> Upon reactivation, you are
            charged for the selected plan immediately. The new billing cycle
            starts from the reactivation date.
          </li>
        </ul>

        {/* ---- 9. Data Export ---- */}
        <h2 className="text-lg font-semibold text-stone-800">9. Data Export</h2>
        <p>
          We recommend exporting your data before cancellation. FeatureSignals
          supports the following export methods:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Flag configurations:</strong> Export all feature flags as
            JSON or CSV via the dashboard (Settings → Export) or via the
            Management API.
          </li>
          <li>
            <strong>Audit logs:</strong> Download audit logs from the dashboard
            (available on Pro and Enterprise plans).
          </li>
          <li>
            <strong>Analytics data:</strong> Export evaluation metrics and
            analytics data via the dashboard or API.
          </li>
          <li>
            <strong>Infrastructure-as-Code:</strong> Export flag configurations
            in Terraform, Pulumi, or Ansible-compatible formats for use in your
            IaC pipelines.
          </li>
          <li>
            <strong>API access:</strong> All exports are also available
            programmatically via our Management API. See{" "}
            <a
              href="https://featuresignals.com/docs"
              className="text-accent hover:underline"
            >
              featuresignals.com/docs
            </a>{" "}
            for API documentation.
          </li>
        </ul>

        {/* ---- 10. Downgrade to Free Tier ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          10. Downgrade to Free Tier
        </h2>
        <p>
          When a paid subscription is cancelled (or expires), your account
          automatically downgrades to the Free tier. The Free tier includes:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Up to 100 feature flags</li>
          <li>Up to 3 team members</li>
          <li>Up to 2 environments</li>
          <li>Basic targeting rules (boolean, string, number, JSON)</li>
          <li>7-day evaluation history</li>
          <li>Community support (GitHub Discussions, Discord)</li>
          <li>Community Edition SDKs (8 languages)</li>
        </ul>
        <p>
          If your account exceeds any Free-tier limit at the time of downgrade,
          excess resources are disabled (not deleted) and can be re-enabled by
          upgrading back to a paid plan.
        </p>

        {/* ---- 11. Involuntary Termination ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          11. Involuntary Termination
        </h2>
        <p>
          FeatureSignals reserves the right to suspend or terminate accounts
          under the following circumstances:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Terms of Service violation:</strong> Breach of our Terms
            &amp; Conditions, Acceptable Use Policy, or any applicable law.
          </li>
          <li>
            <strong>Non-payment:</strong> Failure to resolve a failed payment
            within the 7-day grace period.
          </li>
          <li>
            <strong>Fraudulent activity:</strong> Use of FeatureSignals for
            illegal, fraudulent, or malicious purposes.
          </li>
        </ul>
        <p>In the event of involuntary termination:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            We will provide notice via email to the registered account owner,
            where feasible and legally permissible.
          </li>
          <li>
            You will have <strong>14 calendar days</strong> from the date of
            notice to appeal the termination or export your data by contacting{" "}
            <a
              href="mailto:legal@featuresignals.com"
              className="text-accent hover:underline"
            >
              legal@featuresignals.com
            </a>
            .
          </li>
          <li>
            If the termination is upheld, your data will be permanently deleted
            at the end of the 14-day window.
          </li>
          <li>Accounts terminated for cause are not eligible for refunds.</li>
        </ul>

        {/* ---- 12. Cancellation Confirmation ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          12. Cancellation Confirmation
        </h2>
        <p>
          For every cancellation, FeatureSignals sends a confirmation email to
          the account owner&apos;s registered email address. The confirmation
          includes:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Date and time of cancellation.</li>
          <li>Effective date of cancellation (last day of paid access).</li>
          <li>Summary of what happens to your data and when.</li>
          <li>Link to export your data.</li>
          <li>Instructions for reactivation.</li>
          <li>Contact information for billing support.</li>
        </ul>
        <p>
          If you do not receive a cancellation confirmation email within 24
          hours of your cancellation request, please contact{" "}
          <a
            href="mailto:billing@featuresignals.com"
            className="text-accent hover:underline"
          >
            billing@featuresignals.com
          </a>{" "}
          to verify that your cancellation was processed.
        </p>

        {/* ---- 13. Changes to This Policy ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          13. Changes to This Policy
        </h2>
        <p>
          FeatureSignals reserves the right to modify this Cancellation Policy
          at any time. Changes will be posted on this page with an updated
          &ldquo;Last updated&rdquo; date. Material changes will be communicated
          to active subscribers via email at least 14 days before they take
          effect. The version of the policy in effect at the time of your
          cancellation governs that cancellation.
        </p>

        {/* ---- 14. Governing Law ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          14. Governing Law
        </h2>
        <p>
          This Cancellation Policy shall be governed by and construed in
          accordance with the laws of the Republic of India. Any disputes
          arising out of or in connection with this policy shall be subject to
          the exclusive jurisdiction of the courts in Hyderabad, Telangana,
          India.
        </p>

        {/* ---- 15. Contact ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          15. Contact Information
        </h2>
        <div className="not-prose bg-stone-50 border border-stone-200 rounded-lg p-4 mt-2 space-y-1 text-sm">
          <p className="font-medium text-stone-800">
            Vivekananda Technology Labs
          </p>
          <p className="text-stone-600">
            Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad,
            Telangana – 500104, India
          </p>
          <p className="text-stone-600">
            Billing:{" "}
            <a
              href="mailto:billing@featuresignals.com"
              className="text-accent hover:underline"
            >
              billing@featuresignals.com
            </a>
          </p>
          <p className="text-stone-600">
            Legal:{" "}
            <a
              href="mailto:legal@featuresignals.com"
              className="text-accent hover:underline"
            >
              legal@featuresignals.com
            </a>
          </p>
        </div>
        <p>
          We aim to process all cancellation requests within 1 business day.
        </p>
      </div>
    </div>
  );
}
