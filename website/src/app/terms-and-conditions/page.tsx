import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions governing the use of the FeatureSignals website and hosted services.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalArticle title="Terms & Conditions">
      <SectionReveal>
        <p>
          This website is operated by <strong>FeatureSignals</strong>, a product
          of <strong>Vivekananda Technology Labs</strong>.
        </p>
        <p>
          These Terms and Conditions (&quot;Terms&quot;) govern your access to
          and use of the FeatureSignals website at{" "}
          <a href="https://featuresignals.com">featuresignals.com</a>, the
          hosted service at{" "}
          <a href="https://app.featuresignals.com">app.featuresignals.com</a>,
          and any related APIs, SDKs, documentation, and support (collectively,
          the &quot;Service&quot;). By accessing or using the Service, you agree
          to be bound by these Terms. If you do not agree, please do not use the
          Service.
        </p>

        <h2>1. About us</h2>
        <p>
          <strong>Trade Name:</strong> FeatureSignals
          <br />
          <strong>Legal Name:</strong> Vivekananda Technology Labs
          <br />
          <strong>Registered Address:</strong> Flat no 308, L5-Block, LIG,
          Chitrapuri Colony, Manikonda, Hyderabad, Telangana - 500089, India
          <br />
          <strong>Contact:</strong>{" "}
          <a href="mailto:support@featuresignals.com">
            support@featuresignals.com
          </a>
        </p>

        <h2>2. Service description</h2>
        <p>
          FeatureSignals is a feature management platform that provides feature
          flags, A/B experimentation, targeting rules, real-time flag evaluation
          via SDKs, and related IT services. The Service is offered as a
          cloud-hosted SaaS product with Free, Pro, and Enterprise plans.
          Pricing is displayed on our <Link href="/pricing">Pricing</Link> page
          in Indian Rupees (INR).
        </p>
        <p>
          The FeatureSignals software is also available as open-source under the
          Apache-2.0 license for self-hosting. These Terms primarily govern the
          hosted Service and this website.
        </p>

        <h2>3. Eligibility and account registration</h2>
        <p>
          You must be at least 18 years old (or the age of majority in your
          jurisdiction) to use the Service. When you create an account, you agree
          to provide accurate, current information and to keep it updated. You
          are responsible for maintaining the confidentiality of your login
          credentials and for all activity under your account.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service for any unlawful purpose or in violation of any
            applicable law;
          </li>
          <li>
            Attempt to gain unauthorized access to any part of the Service,
            other accounts, or systems;
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the
            Service;
          </li>
          <li>
            Reverse-engineer, decompile, or disassemble any proprietary
            components of the hosted Service (the open-source codebase is
            governed by its own license);
          </li>
          <li>
            Use the Service to store or transmit malicious code, or to send spam
            or unsolicited communications;
          </li>
          <li>
            Resell or sublicense access to the hosted Service without our prior
            written consent.
          </li>
        </ul>

        <h2>5. Payment and billing</h2>
        <p>
          Paid plans are billed in advance on a recurring basis (monthly or
          annually) as described on the <Link href="/pricing">Pricing</Link>{" "}
          page. All prices are listed in{" "}
          <strong>Indian Rupees (INR)</strong>. Payments are processed through
          our payment partner, <strong>PayU</strong>. By subscribing, you
          authorize us and PayU to charge the applicable fees using your chosen
          payment method.
        </p>
        <p>
          For details on refunds, see our{" "}
          <Link href="/refund-policy">Refund Policy</Link>. For cancellation
          terms, see our{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link>.
        </p>

        <h2>6. Free trial</h2>
        <p>
          We may offer a free trial period. During the trial, you have full
          access to the Service with sample data. No payment is required unless
          you choose to upgrade. If you do not subscribe before the trial
          expires, access to paid features will end automatically.
        </p>

        <h2>7. Intellectual property</h2>
        <p>
          The FeatureSignals name, logo, website design, and proprietary
          hosted-service components are owned by Vivekananda Technology Labs. The
          open-source software is licensed under Apache-2.0 and governed by
          that license&apos;s terms. Your content and data remain yours — we do
          not claim ownership of any data you store in the Service.
        </p>

        <h2>8. Data and privacy</h2>
        <p>
          Your use of the Service is also governed by our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>, which describes
          how we collect, use, and protect your personal information. By using
          the Service, you consent to such processing as described in the
          Privacy Policy.
        </p>

        <h2>9. Service availability and modifications</h2>
        <p>
          We strive to provide reliable access to the Service but do not
          guarantee uninterrupted or error-free operation. We may modify,
          suspend, or discontinue features of the Service from time to time.
          Material changes to paid features will be communicated with reasonable
          notice.
        </p>

        <h2>10. Termination</h2>
        <p>
          You may terminate your account at any time by cancelling your
          subscription and requesting account deletion. We may suspend or
          terminate your access if you violate these Terms, fail to pay
          applicable fees, or if required by law. Upon termination, your right
          to use the Service ceases, subject to any data export rights
          described in our policies.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Vivekananda
          Technology Labs shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages, or any loss of profits or
          revenues, whether incurred directly or indirectly, arising from your
          use of or inability to use the Service. Our total aggregate liability
          for any claims arising under these Terms shall not exceed the amount
          you paid us in the twelve (12) months preceding the claim.
        </p>

        <h2>12. Disclaimer of warranties</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, either express or implied, including
          but not limited to implied warranties of merchantability, fitness for
          a particular purpose, and non-infringement. We do not warrant that the
          Service will be uninterrupted, secure, or error-free.
        </p>

        <h2>13. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Vivekananda
          Technology Labs and its officers, directors, and employees from and
          against any claims, damages, losses, liabilities, costs, and expenses
          arising out of or related to your use of the Service or your violation
          of these Terms.
        </p>

        <h2>14. Governing law and jurisdiction</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of <strong>India</strong>. Any disputes arising out of or in
          connection with these Terms shall be subject to the exclusive
          jurisdiction of the courts in{" "}
          <strong>Hyderabad, Telangana, India</strong>.
        </p>

        <h2>15. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the revised
          version on this page and update the &quot;Last updated&quot; date.
          Continued use of the Service after changes constitutes acceptance of
          the revised Terms. Material changes may be communicated by email or an
          in-product notice.
        </p>

        <h2>16. Shipping and delivery</h2>
        <p>
          FeatureSignals is a digital service. There is no physical shipping.
          Service access is provisioned immediately (typically within minutes)
          upon successful payment. For full details, see our{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>

        <h2>17. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:support@featuresignals.com">support@featuresignals.com</a>
          .
        </p>
        <p>
          <strong>Vivekananda Technology Labs</strong>
          <br />
          Flat no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad,
          Telangana - 500089, India
        </p>
      </SectionReveal>
    </LegalArticle>
  );
}
