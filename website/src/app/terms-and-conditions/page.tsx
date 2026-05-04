import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using FeatureSignals. By using our service, you agree to these terms.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Terms &amp; Conditions
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-800">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing or using FeatureSignals (&ldquo;the Service&rdquo;),
          operated by Vivekananda Technology Labs (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by
          these Terms &amp; Conditions. If you do not agree, do not use the
          Service.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          2. Description of Service &amp; Line of Business
        </h2>
        <p>
          FeatureSignals is a feature flag management and software delivery
          platform operated by Vivekananda Technology Labs. Our line of business
          is providing cloud-based and self-hosted feature flag infrastructure,
          including flag evaluation engines, A/B experimentation, progressive
          delivery tools, AI-powered stale flag cleanup, and related software
          development tooling. The Service is available in multiple tiers: Free
          (Community Edition under Apache 2.0), Pro, and Enterprise.
        </p>
        <p>
          Our customers are software engineering teams and organizations that
          use FeatureSignals to manage feature rollouts, run experiments,
          control application behavior, and automate technical debt cleanup. The
          Service is delivered as both a cloud-hosted SaaS platform and a
          self-hosted deployment option for enterprise customers.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          3. User Accounts
        </h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activities that occur under your
          account. You must notify us immediately of any unauthorized use. You
          must be at least 18 years old to use the Service.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          4. Acceptable Use
        </h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Use the Service for any unlawful purpose or in violation of any
            applicable laws
          </li>
          <li>
            Attempt to gain unauthorized access to any part of the Service
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the
            Service
          </li>
          <li>
            Reverse engineer, decompile, or disassemble any part of the Service
          </li>
          <li>
            Use the Service to store or transmit malicious code or malware
          </li>
          <li>
            Exceed rate limits or use automated means to access the Service
            beyond permitted usage
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">
          5. Intellectual Property
        </h2>
        <p>
          The Service, including its code, design, and branding, is owned by
          Vivekananda Technology Labs. The Community Edition is licensed under
          Apache 2.0. Pro and Enterprise features are provided under a separate
          commercial license.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          6. Payment Terms &amp; Payment Gateway Processing
        </h2>
        <p>
          Paid plans are billed monthly or annually as selected during signup.
          All payments are processed through third-party payment gateways.
          Depending on your region and selected payment method, transactions are
          processed by:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Stripe:</strong> For customers in the United States,
            European Union, and other supported regions. Stripe Payments Europe
            Limited or Stripe, Inc. processes payments in accordance with their
            terms. We transmit your payment information (including card details,
            billing address, and subscription metadata) directly to Stripe via
            their PCI DSS-compliant API. We do not store full credit card
            numbers or CVV codes on our servers.
          </li>
          <li>
            <strong>PayU:</strong> For customers in India. PayU Payments Private
            Limited processes payments in accordance with their terms and
            applicable RBI guidelines. Payment information is transmitted
            directly to PayU via their secure checkout interface. Recurring
            payments are handled through PayU's subscription engine with your
            explicit authorization.
          </li>
        </ul>
        <p>
          Payments are non-refundable except as specified in our Refund Policy.
          We may change pricing with 30 days&apos; notice. Failure to pay may
          result in service suspension after a 7-day grace period. All
          transactions are processed in Indian Rupees (INR) for PayU
          transactions and US Dollars (USD) for Stripe transactions, unless
          otherwise agreed in writing.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          7. Data Privacy
        </h2>
        <p>
          We collect and process data as described in our Privacy Policy. You
          retain ownership of all data you store in the Service. We implement
          appropriate technical and organizational measures to protect your
          data.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          8. Service Level Agreement
        </h2>
        <p>
          Enterprise plans include a 99.95% uptime SLA. Pro plans include a
          99.9% uptime SLA. Free plans are provided &ldquo;as is&rdquo; without
          SLA. SLA credits are calculated based on monthly uptime percentage.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          9. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, Vivekananda Technology Labs
          shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages arising from your use of the
          Service. Our total liability is limited to the amount paid by you in
          the 12 months preceding the claim.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          10. Termination
        </h2>
        <p>
          Either party may terminate this agreement at any time. Upon
          termination, your access to the Service will be revoked. We will
          provide a 30-day window to export your data before permanent deletion.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          11. Changes to Terms
        </h2>
        <p>
          We reserve the right to modify these terms at any time. Material
          changes will be notified via email or in-app notification. Continued
          use after changes constitutes acceptance.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          12. Governing Law
        </h2>
        <p>
          These terms are governed by the laws of India. Any disputes shall be
          resolved in the courts of Hyderabad, Telangana.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">13. Contact</h2>
        <p>
          For questions about these terms, contact us at{" "}
          <a
            href="/contact?reason=support"
            className="text-accent hover:underline"
          >
            legal@featuresignals.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
