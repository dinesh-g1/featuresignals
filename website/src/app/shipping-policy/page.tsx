import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Delivery of FeatureSignals as a digital SaaS product — service provisioning timelines and access details.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalArticle title="Shipping Policy">
      <SectionReveal>
        <p>
          FeatureSignals is a <strong>software-as-a-service (SaaS)</strong> and{" "}
          <strong>IT services</strong> offering by{" "}
          <strong>Vivekananda Technology Labs</strong>. We deliver access to our
          platform electronically over the Internet. This page explains what
          that means for &quot;shipping&quot; and delivery in the sense often
          required by payment providers and marketplaces.
        </p>

        <h2>1. No physical shipping</h2>
        <p>
          We <strong>do not ship physical products</strong>. There are no
          parcels, delivery timelines for merchandise, or freight charges. Service
          delivery consists of enabling your account, providing access to the
          dashboard and APIs, and maintaining the hosted environment according to
          our service descriptions and status communications.
        </p>

        <h2>2. Service delivery duration</h2>
        <p>
          After you complete registration and, for paid plans, successful
          payment authorization, we provision access{" "}
          <strong>immediately — typically within minutes</strong> of a successful
          transaction. In most cases, you can start using the FeatureSignals
          dashboard and APIs right away.
        </p>
        <p>
          If onboarding is delayed by verification, technical maintenance, or
          factors outside our control, we will use commercially reasonable efforts
          to restore or complete access within <strong>24 hours</strong>. You
          will be notified by email if any delay occurs.
        </p>

        <h2>3. &quot;Returns&quot; for digital services</h2>
        <p>
          Because our product is intangible and consumed on an ongoing basis,{" "}
          <strong>returns in the retail sense do not apply</strong>. Instead:
        </p>
        <ul>
          <li>
            You may <strong>cancel your subscription</strong> to stop future
            renewals, as described in our{" "}
            <Link href="/cancellation-policy">Cancellation Policy</Link> and
            account billing settings.
          </li>
          <li>
            Eligibility for refunds for fees already charged is governed by the{" "}
            <Link href="/refund-policy">Refund Policy</Link> (refund requests
            within <strong>14 days</strong>, credited to the{" "}
            <strong>original payment method</strong>).
          </li>
          <li>
            Self-hosted deployments using our open-source software are governed
            by the Apache-2.0 license and your own infrastructure choices — not
            by this shipping policy.
          </li>
        </ul>

        <h2>4. Service availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted
          operation. Planned maintenance, security updates, or upstream provider
          outages may affect access. We publish status information when
          appropriate and prioritize security and data integrity.
        </p>

        <h2>5. Address and contact</h2>
        <p>
          <strong>Vivekananda Technology Labs</strong>
          <br />
          Flat no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad,
          Telangana - 500089, India.
        </p>
        <p>
          Official correspondence for orders, billing, and support is handled
          electronically. Contact{" "}
          <a href="mailto:support@featuresignals.com">support@featuresignals.com</a>
          .
        </p>

        <h2>6. Related policies</h2>
        <p>
          Please also read our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>,{" "}
          <Link href="/refund-policy">Refund Policy</Link>,{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link>, and{" "}
          <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>.
        </p>
      </SectionReveal>
    </LegalArticle>
  );
}
