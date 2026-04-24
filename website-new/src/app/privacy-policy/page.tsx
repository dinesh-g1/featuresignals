import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FeatureSignals collects, uses, and protects your personal data. Our commitment to your privacy and data protection rights.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">Last updated: January 15, 2026</p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-800">1. Introduction</h2>
        <p>
          Vivekananda Technology Labs (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
          operates FeatureSignals. This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you use our service. By using FeatureSignals, you consent
          to the practices described in this policy.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">2. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Account Information:</strong> Name, email address, company name, and billing
            information when you create an account or make a purchase.
          </li>
          <li>
            <strong>Usage Data:</strong> Information about how you use the Service, including flag
            evaluation metrics, page views, API requests, and feature interactions.
          </li>
          <li>
            <strong>Flag Configuration Data:</strong> The feature flag definitions, targeting rules,
            environment configurations, and segment definitions you create within the Service.
          </li>
          <li>
            <strong>Git Repository Data:</strong> When you connect a Git provider for the AI Janitor
            feature, we access repository metadata and file contents solely for the purpose of
            scanning stale flag references.
          </li>
          <li>
            <strong>Device Information:</strong> IP address, browser type, operating system, and
            device identifiers for security and analytics purposes.
          </li>
          <li>
            <strong>Cookies:</strong> We use essential cookies for authentication and session
            management, and optional analytics cookies for product improvement.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">3. How We Use Your Information</h2>
        <p>We use collected information for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Providing, maintaining, and improving the FeatureSignals service</li>
          <li>Processing transactions and managing subscriptions</li>
          <li>Detecting, preventing, and addressing security incidents and abuse</li>
          <li>Communicating with you about service updates, support requests, and promotional offers (with opt-out)</li>
          <li>Complying with legal obligations and enforcement of our Terms of Service</li>
          <li>Generating aggregated, anonymized analytics about platform usage</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">4. Data Processing for Feature Flags</h2>
        <p>
          FeatureSignals processes evaluation context data (user IDs, attributes, custom properties)
          solely for the purpose of evaluating flag targeting rules. This data is:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Processed in memory during flag evaluation and not persistently stored by default</li>
          <li>Used only for flag targeting decisions and impression tracking when explicitly enabled</li>
          <li>Never sold, rented, or shared with third parties for marketing purposes</li>
          <li>Isolated per organization with strict tenant boundaries</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">5. Data Sharing &amp; Disclosure</h2>
        <p>We may share your information in the following circumstances:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Service Providers:</strong> With third-party vendors who assist in operating the
            Service (cloud infrastructure, payment processing, email delivery). These providers are
            contractually bound to protect your data.
          </li>
          <li>
            <strong>Legal Requirements:</strong> If required by law, regulation, or legal process,
            or to protect our rights, property, or safety.
          </li>
          <li>
            <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale
            of assets, with notice to users.
          </li>
          <li>
            <strong>With Consent:</strong> With your explicit consent for specific purposes.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">6. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Encryption at rest using AES-256 and in transit using TLS 1.3</li>
          <li>SOC 2 Type II compliant infrastructure and processes</li>
          <li>Regular security audits, penetration testing, and vulnerability assessments</li>
          <li>Strict access controls with multi-factor authentication for infrastructure access</li>
          <li>Automated threat detection and incident response procedures</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">7. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed to provide the
          Service. Upon account termination, we provide a 30-day grace period for data export before
          permanent deletion. Aggregated, anonymized data may be retained for analytics purposes.
          Evaluation logs are retained according to your plan tier (7 days Free, 90 days Pro,
          custom for Enterprise).
        </p>

        <h2 className="text-lg font-semibold text-stone-800">8. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have the following rights:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
          <li><strong>Portability:</strong> Request a machine-readable export of your data</li>
          <li><strong>Objection:</strong> Object to processing of your data for certain purposes</li>
          <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:privacy@featuresignals.com" className="text-accent hover:underline">
            privacy@featuresignals.com
          </a>.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">9. International Data Transfers</h2>
        <p>
          Your data may be processed in data centers located in multiple regions. We ensure
          appropriate safeguards are in place for international data transfers, including Standard
          Contractual Clauses where required. Enterprise customers can choose their preferred data
          region during onboarding.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">10. Cookies &amp; Tracking</h2>
        <p>
          We use essential cookies for authentication, session management, and security. These
          cannot be disabled. We also use optional analytics cookies to understand how the Service
          is used. You can manage cookie preferences through your browser settings. We do not use
          third-party tracking cookies for advertising purposes.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">11. Children&apos;s Privacy</h2>
        <p>
          The Service is not intended for individuals under 18 years of age. We do not knowingly
          collect personal information from children. If we become aware that a child has provided
          us with personal data, we will take steps to delete such information.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Material changes will be notified via
          email or in-app notification. We encourage you to review this policy regularly. Your
          continued use of the Service after changes constitutes acceptance.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">13. Contact Information</h2>
        <p>
          For questions, concerns, or data subject requests, please contact us:
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:privacy@featuresignals.com" className="text-accent hover:underline">
            privacy@featuresignals.com
          </a>
          <br />
          <strong>Address:</strong> Flat no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda,
          Hyderabad, Telangana - 500089, India
        </p>
      </div>
    </div>
  );
}
