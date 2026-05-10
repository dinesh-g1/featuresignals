import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "FeatureSignals refund policy for SaaS subscriptions. 30-day refund window for annual plans, 7-day for monthly. Learn about eligibility, proration, trial terms, and how to request a refund.",
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Return &amp; Refund Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        {/* ---- 1. Overview ---- */}
        <h2 className="text-lg font-semibold text-stone-800">1. Overview</h2>
        <p>
          FeatureSignals, operated by{" "}
          <strong>Vivekananda Technology Labs</strong>, is a
          business-to-business (B2B) software-as-a-service (SaaS) platform.
          Because FeatureSignals is a digital service, this Refund Policy is
          designed to be fair, transparent, and aligned with the realities of
          subscription-based software. By subscribing to FeatureSignals, you
          acknowledge that you have read, understood, and agree to be bound by
          this policy.
        </p>
        <p>
          This policy applies to all paid subscriptions purchased directly
          through featuresignals.com. Enterprise customers with separately
          negotiated agreements should refer to the refund terms in their
          executed contract.
        </p>

        {/* ---- 2. Free Trial ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          2. Free Trial Period
        </h2>
        <p>
          All new FeatureSignals accounts begin with a{" "}
          <strong>14-day free trial</strong> of the Pro plan. During the trial
          period, you have full access to all Pro-tier features — including
          unlimited feature flags, unlimited team members, advanced targeting
          rules, and the AI Janitor — at no charge.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            No payment method is required to start the trial, although certain
            features (such as evaluation volume above community limits) may
            require a payment method on file.
          </li>
          <li>
            If you cancel at any point during the 14-day trial, you will not be
            charged. Your account will automatically revert to the Free tier at
            the end of the trial period.
          </li>
          <li>
            If you continue beyond the trial period, your chosen payment method
            will be charged according to the plan you selected (monthly or
            annual Pro) at the time of trial signup.
          </li>
          <li>
            The trial period is one per customer. Creating multiple accounts to
            obtain additional trial periods is a violation of our Terms &amp;
            Conditions and may result in account suspension.
          </li>
        </ul>

        {/* ---- 3. Refund Eligibility ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          3. Refund Eligibility
        </h2>

        <h3 className="text-base font-semibold text-stone-700 mt-4">
          3.1 Monthly Pro Subscriptions (INR 1,999/mo)
        </h3>
        <p>
          For monthly Pro subscriptions, you may request a full refund within{" "}
          <strong>7 calendar days</strong> of your initial payment or any
          renewal payment. After 7 days, no refunds are issued for the current
          billing period. Your subscription will remain active until the end of
          the paid billing period, after which it will downgrade to the Free
          tier unless renewed.
        </p>

        <h3 className="text-base font-semibold text-stone-700 mt-4">
          3.2 Annual Pro Subscriptions (INR 19,999/yr)
        </h3>
        <p>
          For annual Pro subscriptions, you may request a full refund within{" "}
          <strong>30 calendar days</strong> of your initial payment or any
          renewal payment. After 30 days, refunds are not available for annual
          plans.
        </p>
        <p>
          If you cancel an annual subscription after the 30-day refund window
          but before the end of the annual term, your subscription will remain
          active until the end of the pre-paid period. No prorated refund will
          be issued for the remaining months.
        </p>

        <h3 className="text-base font-semibold text-stone-700 mt-4">
          3.3 Proration for Annual Upgrades
        </h3>
        <p>
          If you upgrade from a monthly Pro plan to an annual Pro plan
          mid-cycle, the unused portion of your current monthly billing period
          will be credited pro-rata toward the annual subscription. The credit
          is calculated as:
        </p>
        <p className="pl-4 text-stone-500 italic">
          Credit = (Monthly fee ÷ days in billing period) × remaining days
        </p>
        <p>
          This credit is applied automatically at checkout. No separate refund
          is issued for the unused monthly period.
        </p>

        {/* ---- 4. Non-Refundable Items ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          4. Non-Refundable Items
        </h2>
        <p>No refunds are provided for the following:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Used services:</strong> If you have actively used the
            service during the refund eligibility window (e.g., created flags,
            served evaluations, used the AI Janitor), your use of the service
            constitutes acceptance and the refund eligibility may be reduced to
            account for the consumed value, at our reasonable discretion.
          </li>
          <li>
            <strong>Partial months:</strong> No refunds are issued for unused
            days within a monthly billing period beyond the 7-day window.
          </li>
          <li>
            <strong>Self-hosted licenses after key delivery:</strong> Once a
            self-hosted enterprise license key has been issued and downloaded,
            the license is considered delivered and is non-refundable.
          </li>
          <li>
            <strong>Add-on services and one-time purchases:</strong> Any
            supplementary services or professional services engagements are
            non-refundable once work has commenced.
          </li>
          <li>
            <strong>Accounts terminated for cause:</strong> Accounts suspended
            or terminated for violation of our Terms &amp; Conditions,
            Acceptable Use Policy, or for fraudulent activity are not eligible
            for refunds.
          </li>
          <li>
            <strong>Third-party charges:</strong> Payment gateway processing
            fees (PayU, Stripe) are generally non-recoverable and may be
            deducted from the refund amount where the payment gateway does not
            refund its fee.
          </li>
        </ul>

        {/* ---- 5. How to Request a Refund ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          5. How to Request a Refund
        </h2>
        <p>To request a refund, follow these steps:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Send an email to{" "}
            <a
              href="mailto:billing@featuresignals.com"
              className="text-accent hover:underline"
            >
              billing@featuresignals.com
            </a>{" "}
            from the email address associated with your FeatureSignals account.
          </li>
          <li>
            Include the following information in your request:
            <ul className="list-disc pl-6 mt-1 space-y-0.5">
              <li>Account name or organization name</li>
              <li>Registered email address</li>
              <li>Invoice number or transaction reference</li>
              <li>Date of payment</li>
              <li>
                Reason for the refund request (optional, but helps us improve)
              </li>
            </ul>
          </li>
          <li>
            Our billing team will acknowledge your request within{" "}
            <strong>1 business day</strong>.
          </li>
          <li>
            We will review your eligibility and respond with a determination
            within <strong>3 business days</strong>.
          </li>
        </ol>

        {/* ---- 6. Refund Processing ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          6. Refund Processing
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Processing time:</strong> Approved refunds are processed
            within <strong>7–10 business days</strong> from the date of
            approval.
          </li>
          <li>
            <strong>Payment method:</strong> Refunds are issued to the{" "}
            <strong>original payment method</strong> used at the time of
            purchase. If the original payment method is no longer valid (e.g.,
            expired card, closed account), we will contact you to arrange an
            alternative.
          </li>
          <li>
            <strong>Currency:</strong> Refunds are processed in the same
            currency as the original payment. For Indian customers paying via
            PayU, refunds are issued in INR. For international customers
            paying via Stripe, refunds are issued in the original transaction
            currency (typically USD).
          </li>
          <li>
            <strong>Exchange rate fluctuations:</strong> FeatureSignals is not
            responsible for any difference in the refund amount caused by
            exchange rate fluctuations between the date of purchase and the date
            of refund.
          </li>
          <li>
            <strong>Confirmation:</strong> You will receive an email
            confirmation once the refund has been initiated. The time it takes
            for the refund to appear in your account depends on your payment
            provider and financial institution (typically 5–10 additional
            business days).
          </li>
        </ul>

        {/* ---- 7. Enterprise Agreements ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          7. Enterprise Agreements
        </h2>
        <p>
          Enterprise plan subscriptions are governed by the terms of your
          individually negotiated Enterprise Agreement. Refund provisions, if
          any, are specified in that agreement. In the absence of specific
          refund terms in your Enterprise Agreement, the annual subscription
          refund terms in Section 3.2 of this policy shall apply. Please contact
          your account manager or{" "}
          <a
            href="mailto:sales@featuresignals.com"
            className="text-accent hover:underline"
          >
            sales@featuresignals.com
          </a>{" "}
          for assistance.
        </p>

        {/* ---- 8. Free Tier ---- */}
        <h2 className="text-lg font-semibold text-stone-800">8. Free Tier</h2>
        <p>
          The Free tier has no associated subscription fees, and therefore no
          refunds are applicable. You may cancel your Free tier account at any
          time without restriction.
        </p>

        {/* ---- 9. Service Credits & SLA ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          9. Service Credits &amp; SLA
        </h2>
        <p>
          If FeatureSignals fails to meet the uptime commitments outlined in our
          Service Level Agreement (99.9% for Pro, 99.95% for Enterprise), you
          may be eligible for service credits as specified in your plan&apos;s
          SLA terms. Service credits are issued as a credit toward future
          billing periods, not as cash refunds, unless otherwise required by
          applicable law.
        </p>
        <p>
          To request SLA credits, contact{" "}
          <a
            href="mailto:support@featuresignals.com"
            className="text-accent hover:underline"
          >
            support@featuresignals.com
          </a>{" "}
          with evidence of the downtime incident and the dates and duration of
          the outage.
        </p>

        {/* ---- 10. Force Majeure ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          10. Force Majeure
        </h2>
        <p>
          FeatureSignals shall not be liable for any failure or delay in
          performing its obligations under this policy where such failure or
          delay results from any cause beyond our reasonable control. Such
          causes include, but are not limited to: acts of God, natural
          disasters, fire, flood, earthquake, pandemic, epidemic, war,
          terrorism, civil unrest, government action or regulation, sanctions,
          embargoes, internet or telecommunications outages not within our
          direct control, distributed denial-of-service (DDoS) attacks targeting
          infrastructure shared with other providers, and strikes or labour
          disputes involving third parties.
        </p>
        <p>
          In a force majeure event, FeatureSignals will make reasonable efforts
          to: (a) restore service as soon as practicable; (b) communicate the
          nature and expected duration of the disruption to affected customers;
          and (c) extend subscription periods or issue credits for prolonged
          outages at our reasonable discretion on a case-by-case basis.
        </p>

        {/* ---- 11. Chargebacks ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          11. Chargebacks
        </h2>
        <p>
          If you initiate a chargeback or payment dispute with your bank or
          payment provider without first contacting us to request a refund:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Your FeatureSignals account may be immediately suspended pending
            resolution.
          </li>
          <li>
            We will provide your payment provider with evidence of the valid
            transaction, including the date and time of subscription, IP
            address, and acceptance of our Terms &amp; Conditions and this
            Refund Policy at checkout.
          </li>
          <li>
            If the chargeback is resolved in our favour, your account will be
            reinstated and any applicable fees (including chargeback processing
            fees levied by the payment gateway) may be added to your account.
          </li>
        </ul>
        <p>
          We encourage you to contact us first — we are committed to resolving
          billing concerns fairly and promptly.
        </p>

        {/* ---- 12. Changes to This Policy ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          12. Changes to This Policy
        </h2>
        <p>
          FeatureSignals reserves the right to modify this Refund Policy at any
          time. Changes will be posted on this page with an updated &ldquo;Last
          updated&rdquo; date. Material changes will be communicated to active
          subscribers via email at least 14 days before they take effect. The
          version of the policy in effect at the time of your purchase governs
          that transaction.
        </p>

        {/* ---- 13. Governing Law ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          13. Governing Law
        </h2>
        <p>
          This Refund Policy shall be governed by and construed in accordance
          with the laws of the Republic of India. Any disputes arising out of or
          in connection with this policy shall be subject to the exclusive
          jurisdiction of the courts in Hyderabad, Telangana, India.
        </p>

        {/* ---- 14. Contact ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          14. Contact Information
        </h2>
        <p>
          For all billing inquiries and refund requests, please contact us at:
        </p>
        <div className="not-prose bg-stone-50 border border-stone-200 rounded-lg p-4 mt-2 space-y-1 text-sm">
          <p className="font-medium text-stone-800">
            Vivekananda Technology Labs
          </p>
          <p className="text-stone-600">
            Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad, Telangana – 500104, India
          </p>
          <p className="text-stone-600">
            Email:{" "}
            <a
              href="mailto:billing@featuresignals.com"
              className="text-accent hover:underline"
            >
              billing@featuresignals.com
            </a>
          </p>
          <p className="text-stone-600">
            Support:{" "}
            <a
              href="mailto:support@featuresignals.com"
              className="text-accent hover:underline"
            >
              support@featuresignals.com
            </a>
          </p>
        </div>
        <p>We aim to respond to all billing inquiries within 1 business day.</p>
      </div>
    </div>
  );
}
