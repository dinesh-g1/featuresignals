import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description:
    "FeatureSignals is a digital SaaS platform — no physical goods are shipped. Learn how our cloud service, SDKs, and self-hosted licenses are delivered instantly.",
};

export default function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Shipping &amp; Delivery Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        {/* ---- 1. Digital Service ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          1. FeatureSignals Is a Digital Service
        </h2>
        <p>
          FeatureSignals, operated by{" "}
          <strong>Vivekananda Technology Labs</strong>, is a
          business-to-business (B2B) software-as-a-service (SaaS) platform. We
          provide an enterprise-grade feature flag management platform delivered
          entirely over the internet.{" "}
          <strong>No physical goods are shipped.</strong> There are no boxes, no
          physical media, and no hardware associated with a standard
          FeatureSignals subscription.
        </p>
        <p>
          This Shipping &amp; Delivery Policy explains how our digital products
          and services are delivered to you. By purchasing a FeatureSignals
          subscription, you acknowledge that you understand the digital nature
          of our service.
        </p>

        {/* ---- 2. Cloud Service Delivery ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          2. Cloud Service Delivery (SaaS)
        </h2>
        <p>
          For customers using our cloud-hosted SaaS platform
          (app.featuresignals.com), service delivery is{" "}
          <strong>immediate upon payment confirmation</strong>:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Account activation:</strong> Your FeatureSignals account is
            provisioned instantly after successful payment. You receive a
            welcome email with login instructions, your initial API credentials,
            and a link to the onboarding wizard.
          </li>
          <li>
            <strong>API endpoints:</strong> The Management API and Evaluation
            API are available immediately. Your SDK keys are generated at
            account creation and are ready to use in your application code
            without any waiting period.
          </li>
          <li>
            <strong>SDK availability:</strong> All 8 language SDKs (Go, Node.js,
            Python, Java, .NET, Ruby, React, Vue) are available for immediate
            download from{" "}
            <a
              href="https://featuresignals.com/docs"
              className="text-accent hover:underline"
            >
              featuresignals.com/docs
            </a>{" "}
            and via package registries (npm, PyPI, Maven Central, NuGet,
            RubyGems).
          </li>
          <li>
            <strong>Documentation:</strong> Full product documentation, API
            reference, SDK guides, and integration tutorials are available 24/7
            at{" "}
            <a
              href="https://featuresignals.com/docs"
              className="text-accent hover:underline"
            >
              featuresignals.com/docs
            </a>
            . No delivery wait time applies.
          </li>
        </ul>

        {/* ---- 3. Self-Hosted License Delivery ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          3. Self-Hosted License Delivery
        </h2>
        <p>
          For Enterprise customers who purchase a self-hosted deployment
          license, delivery is fully digital and automated:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>License key delivery:</strong> Your license key is delivered
            via email to the registered account owner within{" "}
            <strong>5 minutes</strong> of purchase confirmation. The email
            includes the license key, installation instructions, and links to
            the deployment documentation.
          </li>
          <li>
            <strong>Container images:</strong> Docker images for the
            FeatureSignals server are available from our private container
            registry. Access credentials are included in the license key
            delivery email.
          </li>
          <li>
            <strong>Helm charts:</strong> Kubernetes deployment artifacts (Helm
            charts, configuration templates) are available for download from a
            private GitHub repository. Access is provisioned automatically upon
            license purchase.
          </li>
          <li>
            <strong>Binary downloads:</strong> Compiled Go binaries for Linux
            (amd64, arm64) and macOS (amd64, arm64) are available for direct
            download. The download links are included in your license key
            delivery email and remain active for the duration of your
            subscription.
          </li>
          <li>
            <strong>Delivery timeframe:</strong> All digital artifacts (license
            key, container images, Helm charts, binaries) are available within 5
            minutes. In the rare event of a delay exceeding 30 minutes, please
            contact{" "}
            <a
              href="mailto:support@featuresignals.com"
              className="text-accent hover:underline"
            >
              support@featuresignals.com
            </a>
            .
          </li>
        </ul>

        {/* ---- 4. Community Edition (Open Source) ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          4. Community Edition (Open Source)
        </h2>
        <p>
          The FeatureSignals Community Edition is available as open-source
          software under the Apache 2.0 license, at no cost:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Source code:</strong> Available for immediate download from{" "}
            <a
              href="https://github.com/dinesh-g1/featuresignals"
              className="text-accent hover:underline"
            >
              github.com/dinesh-g1/featuresignals
            </a>
            .
          </li>
          <li>
            <strong>Docker images:</strong> Available from GitHub Container
            Registry (ghcr.io). Pull immediately with a single `docker pull`
            command.
          </li>
          <li>
            <strong>Documentation:</strong> Self-hosting guides, configuration
            reference, and deployment examples are available at{" "}
            <a
              href="https://featuresignals.com/docs"
              className="text-accent hover:underline"
            >
              featuresignals.com/docs
            </a>
            .
          </li>
          <li>
            <strong>No delivery delay:</strong> All Community Edition resources
            are publicly available and require no purchase or registration.
          </li>
        </ul>

        {/* ---- 5. Onboarding & Setup ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          5. Onboarding &amp; Setup
        </h2>
        <p>
          FeatureSignals provides self-serve and assisted onboarding depending
          on your plan:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Free &amp; Pro plans:</strong> Self-serve onboarding via a
            guided in-product wizard. The wizard walks you through creating your
            first feature flag, installing an SDK, and running your first
            evaluation — typically in under 5 minutes. No scheduled call is
            required.
          </li>
          <li>
            <strong>Enterprise plans:</strong> Includes a dedicated onboarding
            session with a solutions engineer. The session is scheduled within 3
            business days of contract signing and covers architecture review,
            SDK integration, deployment planning, and best practices. Follow-up
            support is available throughout your deployment.
          </li>
          <li>
            <strong>Self-hosted Enterprise:</strong> Onboarding includes a
            deployment assistance session to help you configure FeatureSignals
            within your infrastructure. We provide guidance on PostgreSQL setup,
            TLS configuration, monitoring integration, and high-availability
            planning.
          </li>
        </ul>

        {/* ---- 6. No Shipping Charges ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          6. No Shipping Charges
        </h2>
        <p>
          Because FeatureSignals is a 100% digital service,{" "}
          <strong>no shipping charges apply</strong> to any subscription tier.
          The price you see at checkout is the total price you pay. There are no
          delivery fees, handling fees, customs duties, or import taxes
          associated with our digital products.
        </p>
        <p>
          For Indian customers, GST is applied at the prevailing rate and is
          itemized on your invoice. For international customers, applicable
          taxes (such as VAT, GST, or sales tax) are calculated at checkout
          based on your billing location and displayed before you confirm
          payment.
        </p>

        {/* ---- 7. Physical Media (Exceptional Circumstances) ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          7. Physical Media (Exceptional Circumstances)
        </h2>
        <p>
          In rare circumstances, an Enterprise customer may require software
          delivery on physical media — for example, for air-gapped environments
          with no internet connectivity. In such cases:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Physical media (encrypted USB drives or SSDs) will be prepared and
            shipped within 5 business days of request and payment.
          </li>
          <li>
            Shipping costs, including courier charges, insurance, and any
            applicable customs duties, will be quoted separately and must be
            agreed upon in writing before dispatch.
          </li>
          <li>
            Delivery timelines depend on the shipping destination and courier
            service. Estimated delivery times will be communicated at the time
            of order.
          </li>
          <li>
            Shipping costs for physical media are non-refundable once the
            package has been dispatched.
          </li>
          <li>
            Replacement of defective physical media is provided at no additional
            cost for 90 days from the date of receipt. Contact{" "}
            <a
              href="mailto:support@featuresignals.com"
              className="text-accent hover:underline"
            >
              support@featuresignals.com
            </a>{" "}
            to request a replacement.
          </li>
        </ul>
        <p>
          As of the date of this policy, FeatureSignals has not shipped any
          physical media to any customer. This section is included for
          completeness and to cover potential future scenarios.
        </p>

        {/* ---- 8. Delivery Issues ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          8. Delivery Issues &amp; Failed Downloads
        </h2>
        <p>
          If you experience any issue accessing or downloading our digital
          products:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>License key not received:</strong> Check your spam or
            promotions folder. If the email is not found within 15 minutes,
            contact{" "}
            <a
              href="mailto:support@featuresignals.com"
              className="text-accent hover:underline"
            >
              support@featuresignals.com
            </a>{" "}
            and we will re-send the license key and verify delivery.
          </li>
          <li>
            <strong>Corrupted downloads:</strong> If a downloaded binary or
            artifact fails verification (checksum mismatch), we will provide an
            alternative download link within 1 business day at no additional
            cost.
          </li>
          <li>
            <strong>Container registry access issues:</strong> If you cannot
            authenticate to our private container registry, contact support and
            we will resolve access within 1 business day.
          </li>
        </ul>

        {/* ---- 9. International Availability ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          9. International Availability
        </h2>
        <p>
          FeatureSignals&apos; cloud-hosted SaaS platform is available globally
          with no geographic restrictions. Digital delivery is instantaneous
          regardless of your location. Self-hosted deployments can be installed
          in any data center or cloud region worldwide, including regions with
          data residency requirements (such as India, the European Union, and
          others).
        </p>
        <p>
          FeatureSignals complies with applicable export control laws and
          sanctions regulations. We reserve the right to decline service to
          persons or entities in jurisdictions subject to comprehensive
          sanctions, as required by law.
        </p>

        {/* ---- 10. Returns & Exchanges ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          10. Returns &amp; Exchanges
        </h2>
        <p>
          As FeatureSignals is a digital service, it cannot be
          &ldquo;returned&rdquo; in the traditional sense once access has been
          granted. However, you may be eligible for a refund according to the
          terms of our{" "}
          <a href="/refund-policy" className="text-accent hover:underline">
            Return &amp; Refund Policy
          </a>
          .
        </p>
        <p>
          For the exceptional case of physical media (see Section 7), unopened
          packages may be returned within 14 days of receipt. Return shipping
          costs are the responsibility of the customer unless the return is due
          to our error (e.g., wrong item shipped). Opened physical media cannot
          be returned for security reasons.
        </p>

        {/* ---- 11. Changes to This Policy ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          11. Changes to This Policy
        </h2>
        <p>
          FeatureSignals reserves the right to modify this Shipping &amp;
          Delivery Policy at any time. Changes will be posted on this page with
          an updated &ldquo;Last updated&rdquo; date. The version of the policy
          in effect at the time of your purchase governs that transaction.
        </p>

        {/* ---- 12. Governing Law ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          12. Governing Law
        </h2>
        <p>
          This Shipping &amp; Delivery Policy shall be governed by and construed
          in accordance with the laws of the Republic of India. Any disputes
          arising out of or in connection with this policy shall be subject to
          the exclusive jurisdiction of the courts in Hyderabad, Telangana,
          India.
        </p>

        {/* ---- 13. Contact ---- */}
        <h2 className="text-lg font-semibold text-stone-800">
          13. Contact Information
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
            Email:{" "}
            <a
              href="mailto:support@featuresignals.com"
              className="text-accent hover:underline"
            >
              support@featuresignals.com
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
          We aim to respond to all delivery-related inquiries within 1 business
          day.
        </p>
      </div>
    </div>
  );
}
