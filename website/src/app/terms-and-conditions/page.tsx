import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using FeatureSignals. By using our service, you agree to these terms.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Terms &amp; Conditions
      </h1>
      <p className="text-sm text-stone-400 mb-8">Last updated: January 15, 2026</p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-800">1. Acceptance of Terms</h2>
        <p>
          By accessing or using FeatureSignals (&ldquo;the Service&rdquo;), operated by Vivekananda
          Technology Labs (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be
          bound by these Terms &amp; Conditions. If you do not agree, do not use the Service.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">2. Description of Service</h2>
        <p>
          FeatureSignals provides a feature flag management platform that allows teams to control
          feature rollouts, run experiments, and manage application configuration. The Service is
          available in multiple tiers: Free, Pro, and Enterprise.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activities that occur under your account. You must notify us immediately of any
          unauthorized use. You must be at least 18 years old to use the Service.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
          <li>Use the Service to store or transmit malicious code or malware</li>
          <li>Exceed rate limits or use automated means to access the Service beyond permitted usage</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">5. Intellectual Property</h2>
        <p>
          The Service, including its code, design, and branding, is owned by Vivekananda Technology
          Labs. The Community Edition is licensed under Apache 2.0. Pro and Enterprise features are
          provided under a separate commercial license.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">6. Payment Terms</h2>
        <p>
          Paid plans are billed monthly or annually as selected during signup. Payments are
          non-refundable except as specified in our Refund Policy. We may change pricing with 30
          days&apos; notice. Failure to pay may result in service suspension.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">7. Data Privacy</h2>
        <p>
          We collect and process data as described in our Privacy Policy. You retain ownership of
          all data you store in the Service. We implement appropriate technical and organizational
          measures to protect your data.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">8. Service Level Agreement</h2>
        <p>
          Enterprise plans include a 99.95% uptime SLA. Pro plans include a 99.9% uptime SLA. Free
          plans are provided &ldquo;as is&rdquo; without SLA. SLA credits are calculated based on
          monthly uptime percentage.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Vivekananda Technology Labs shall not be liable
          for any indirect, incidental, special, consequential, or punitive damages arising from
          your use of the Service. Our total liability is limited to the amount paid by you in the
          12 months preceding the claim.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">10. Termination</h2>
        <p>
          Either party may terminate this agreement at any time. Upon termination, your access to
          the Service will be revoked. We will provide a 30-day window to export your data before
          permanent deletion.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">11. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Material changes will be notified
          via email or in-app notification. Continued use after changes constitutes acceptance.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">12. Governing Law</h2>
        <p>
          These terms are governed by the laws of India. Any disputes shall be resolved in the
          courts of Hyderabad, Telangana.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">13. Contact</h2>
        <p>
          For questions about these terms, contact us at{" "}
          <a href="mailto:legal@featuresignals.com" className="text-accent hover:underline">
            legal@featuresignals.com
          </a>.
        </p>
      </div>
    </div>
  );
}
