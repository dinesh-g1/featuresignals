import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "FeatureSignals shipping policy for digital software delivery, on-premise deployments, and enterprise self-hosted installations.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Shipping Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        <h2 className="text-lg font-semibold text-stone-800">
          1. Digital Delivery
        </h2>
        <p>
          FeatureSignals is a cloud-based software-as-a-service (SaaS) platform
          and an open-source software product. As a digital service, there are
          no physical goods to ship. Upon registration and payment confirmation,
          access to the Service is provisioned immediately.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          2. Enterprise On-Premise Delivery
        </h2>
        <p>For Enterprise customers who purchase a self-hosted deployment:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Delivery Method:</strong> Software is delivered via secure
            download link to a private container registry or package repository,
            typically within 1 business day of contract signing and payment.
          </li>
          <li>
            <strong>Artifacts:</strong> Enterprise customers receive Docker
            images, Helm charts, configuration templates, and deployment
            documentation.
          </li>
          <li>
            <strong>Access:</strong> A private GitHub repository or artifact
            registry is provisioned with the Enterprise Edition source code and
            compiled binaries.
          </li>
          <li>
            <strong>Setup Assistance:</strong> Enterprise plans include remote
            setup assistance with a dedicated solutions engineer to ensure
            successful deployment within your infrastructure.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">3. SaaS Access</h2>
        <p>For our cloud-hosted SaaS offering:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Access is provisioned immediately after successful account creation
            and payment verification.
          </li>
          <li>No physical media, devices, or hardware are shipped.</li>
          <li>
            All service delivery occurs over the internet through our secure
            platform.
          </li>
          <li>
            Customers receive a confirmation email with login instructions, API
            credentials, and onboarding resources.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">
          4. Community Edition (Open Source)
        </h2>
        <p>
          The Community Edition of FeatureSignals is available as open-source
          software under the Apache 2.0 license:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Source code is available for download from GitHub at
            https://github.com/dinesh-g1/featuresignals
          </li>
          <li>
            Docker images are available from GitHub Container Registry (ghcr.io)
          </li>
          <li>No shipping costs apply as all distribution is digital</li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">
          5. Shipping Costs
        </h2>
        <p>As FeatureSignals is a digital software product:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            No shipping costs are incurred for digital delivery via the cloud
            platform or download links.
          </li>
          <li>
            For Enterprise customers requiring physical media (e.g., air-gapped
            environments with no internet connectivity), any shipping costs for
            physical media (USB drives, SSDs) will be quoted and agreed upon
            separately in the Enterprise Agreement.
          </li>
          <li>
            Shipping costs for physical media are non-refundable once shipped.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">
          6. Delivery Timelines
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>SaaS:</strong> Instant access upon registration/payment.
          </li>
          <li>
            <strong>Enterprise Self-Hosted:</strong> Delivery of artifacts
            within 1 business day after contract execution. Full deployment
            within agreed timeline (typically 1-2 weeks depending on
            infrastructure readiness).
          </li>
          <li>
            <strong>Community Edition:</strong> Immediate download from GitHub.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-stone-800">
          7. International Delivery
        </h2>
        <p>
          Digital delivery is available globally with no restrictions. The
          Service is available in all countries where we do business, subject to
          applicable export control laws and sanctions regulations. Enterprise
          on-premise deployments may require local data residency compliance
          which we support through regional cloud providers and customer-managed
          infrastructure.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          8. Damaged or Lost Downloads
        </h2>
        <p>
          If you experience issues downloading your software or encounter a
          corrupted download, contact us at{" "}
          <a
            href="mailto:support@featuresignals.com"
            className="text-accent hover:underline"
          >
            support@featuresignals.com
          </a>{" "}
          and we will provide alternative download links or media. We guarantee
          replacement of defective downloads at no additional cost.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">
          9. Returns &amp; Exchanges
        </h2>
        <p>
          As a digital software product, FeatureSignals cannot be returned or
          exchanged once access has been granted. However, subscription refunds
          may be available as outlined in our{" "}
          <a href="/refund-policy" className="text-accent hover:underline">
            Refund Policy
          </a>
          . For Enterprise customers with physical media, returns are accepted
          within 14 days of receipt for unopened packages only.
        </p>

        <h2 className="text-lg font-semibold text-stone-800">10. Contact</h2>
        <p>
          For questions about this shipping policy, contact us at{" "}
          <a
            href="mailto:support@featuresignals.com"
            className="text-accent hover:underline"
          >
            support@featuresignals.com
          </a>
        </p>
      </div>
    </div>
  );
}
