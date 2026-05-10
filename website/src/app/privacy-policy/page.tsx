import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FeatureSignals collects, uses, stores, and protects your personal data. GDPR, Indian IT Act, and DPDP Act 2023 compliant. Your data rights, our commitments.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Last updated: January 15, 2026
      </p>

      <div className="prose prose-stone max-w-none space-y-6 text-sm text-stone-600 leading-relaxed">
        {/* ──────────────────────────────────────────────
            1. Introduction & Scope
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          1. Introduction &amp; Scope
        </h2>
        <p>
          This Privacy Policy describes how{" "}
          <strong>Vivekananda Technology Labs</strong>, a proprietorship firm
          with its registered office at Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad,
          Telangana &mdash; 500104, India, operating under the trade name
          &ldquo;FeatureSignals&rdquo; (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;), collects, uses, stores, discloses, and protects
          personal data when you access our website at{" "}
          <a
            href="https://featuresignals.com"
            className="text-accent hover:underline"
          >
            https://featuresignals.com
          </a>{" "}
          (the &ldquo;Website&rdquo;) or use our feature flag management
          platform, including APIs, SDKs, dashboard, documentation, and related
          services (collectively, the &ldquo;Platform&rdquo;).
        </p>
        <p>
          This policy applies to all Users of the Platform, including account
          holders, team members, API consumers, SDK integrators, website
          visitors, and end-users whose data may be processed through the
          Platform&apos;s feature flag evaluation engine (&ldquo;End
          Users&rdquo;). It describes your privacy rights under applicable data
          protection laws, including:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            The <strong>Digital Personal Data Protection Act, 2023</strong>{" "}
            (DPDP Act) of India;
          </li>
          <li>
            The <strong>Information Technology Act, 2000</strong> and the
            Information Technology (Reasonable Security Practices and Procedures
            and Sensitive Personal Data or Information) Rules, 2011;
          </li>
          <li>
            The <strong>General Data Protection Regulation</strong> (GDPR)
            &mdash; Regulation (EU) 2016/679, for Users and End Users in the
            European Economic Area (EEA) and the United Kingdom;
          </li>
          <li>
            The <strong>California Consumer Privacy Act</strong> (CCPA), as
            amended by the CPRA, for Users in California, United States; and
          </li>
          <li>
            Other applicable data protection laws in jurisdictions where we
            operate or where our Users or End Users are located.
          </li>
        </ul>
        <p>
          By using the Platform, you acknowledge that you have read and
          understood this Privacy Policy. If you do not agree with any part of
          this policy, please discontinue use of the Platform immediately.
        </p>

        {/* ──────────────────────────────────────────────
            2. Data Controller Identity
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          2. Data Controller Identity
        </h2>
        <p>
          For the purposes of the GDPR, DPDP Act, and other applicable data
          protection laws, the data controller responsible for your personal
          data is:
        </p>
        <p>
          <strong>Vivekananda Technology Labs</strong>
          <br />
          (Trading as: FeatureSignals)
          <br />
          Registered Office: Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad, Telangana
          &mdash; 500104, India
          <br />
          Email:{" "}
          <a
            href="mailto:privacy@featuresignals.com"
            className="text-accent hover:underline"
          >
            privacy@featuresignals.com
          </a>
          <br />
          Website:{" "}
          <a
            href="https://featuresignals.com"
            className="text-accent hover:underline"
          >
            https://featuresignals.com
          </a>
        </p>
        <p>
          Where you are an End User of a FeatureSignals customer (an
          &ldquo;Organization&rdquo;), that Organization acts as the data
          controller, and we act as a data processor on their behalf. This
          policy primarily addresses our role as a data controller. If you are
          an End User, please refer to the privacy policy of the Organization
          that uses FeatureSignals for information about how they process your
          data.
        </p>

        {/* ──────────────────────────────────────────────
            3. Information We Collect
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          3. Information We Collect
        </h2>
        <p>
          <strong>3.1 Account &amp; Registration Data.</strong> When you create
          an account, subscribe to a plan, or interact with our sales or support
          teams, we collect:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Full name and display name;</li>
          <li>Email address (used as primary account identifier);</li>
          <li>Organization name and industry;</li>
          <li>
            Password (hashed with bcrypt &mdash; we never store plaintext
            passwords);
          </li>
          <li>Profile picture (optional, if provided via third-party SSO);</li>
          <li>Job title or role (optional);</li>
          <li>Phone number (optional, for Enterprise sales and support);</li>
          <li>
            Billing address, GSTIN/VAT ID (if applicable), and tax
            identification information;
          </li>
          <li>Preferred language and timezone for dashboard customization.</li>
        </ul>
        <p>
          <strong>3.2 Feature Flag Configuration Data.</strong> When you use the
          Platform, we store the configuration data you create, including:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Feature flag keys, names, descriptions, and tags;</li>
          <li>Flag targeting rules and variations;</li>
          <li>
            Environment configurations (development, staging, production);
          </li>
          <li>Segment definitions and user targeting attributes;</li>
          <li>Rollout percentages and scheduling rules;</li>
          <li>Webhook and integration configurations;</li>
          <li>API key metadata and permission scopes.</li>
        </ul>
        <p>
          <strong>3.3 Evaluation Data.</strong> When your applications make flag
          evaluation requests through our APIs or SDKs, we may process:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Evaluation context attributes (user IDs, email addresses, custom
            properties, device identifiers) that you send for flag targeting
            purposes;
          </li>
          <li>
            The flag key being evaluated and the resulting variation served;
          </li>
          <li>Timestamp of evaluation;</li>
          <li>
            Evaluation reason (e.g., &ldquo;targeting match,&rdquo;
            &ldquo;default rule&rdquo;);
          </li>
          <li>
            SDK version and platform identifier for compatibility analytics.
          </li>
        </ul>
        <p>
          Evaluation context data is processed in memory during the flag
          evaluation request and is not persistently stored by default. When
          evaluation impression tracking is explicitly enabled by you,
          evaluation data is stored for analytics and debugging purposes
          according to the retention periods described in Section 8.
        </p>
        <p>
          <strong>3.4 SDK Telemetry Data.</strong> Our SDKs may collect minimal,
          anonymized telemetry data to help us improve the Platform:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>SDK version and programming language;</li>
          <li>Aggregated evaluation latency metrics;</li>
          <li>Error rates and connectivity status;</li>
          <li>Cache hit/miss ratios for local evaluation optimization.</li>
        </ul>
        <p>
          SDK telemetry does not include your flag keys, targeting rules, or End
          User data. This collection can be disabled through SDK configuration
          options. Telemetry is opt-in for self-hosted Community Edition
          deployments and opt-out for cloud deployments.
        </p>
        <p>
          <strong>3.5 Payment Information.</strong> When you subscribe to a paid
          plan, your payment information (credit/debit card number, UPI ID, net
          banking credentials, billing address) is collected and processed
          directly by our third-party payment gateways:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>PayU Software Private Limited</strong> (for India-based
            customers); and
          </li>
          <li>
            <strong>Stripe, Inc. / Stripe Payments Europe Limited</strong> (for
            international customers).
          </li>
        </ul>
        <p>
          We do not receive, store, or have access to your full payment
          instrument details. We receive only a payment token, the last four
          digits of your card number (where applicable), card network, expiry
          date, and transaction metadata necessary to manage your subscription.
        </p>
        <p>
          <strong>3.6 Support &amp; Communication Data.</strong> When you
          contact our support team, sales team, or interact with us through any
          communication channel (email, in-app chat, contact forms, social
          media), we collect:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Your name, email address, and any other contact information you
            provide;
          </li>
          <li>The content of your message, inquiry, or support request;</li>
          <li>Any attachments, screenshots, or logs you share with us;</li>
          <li>Communication metadata (timestamp, channel, agent assigned);</li>
          <li>Chat transcripts (for in-app support).</li>
        </ul>
        <p>
          <strong>3.7 Website &amp; Dashboard Analytics.</strong> When you visit
          our Website or use the FeatureSignals dashboard, we automatically
          collect:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>IP address (truncated/anonymized before storage);</li>
          <li>Browser type, version, and operating system;</li>
          <li>Device type (desktop, mobile, tablet) and screen resolution;</li>
          <li>Referring URL and exit pages;</li>
          <li>Pages visited, time spent, and interaction events;</li>
          <li>Language preferences derived from browser settings.</li>
        </ul>
        <p>
          We use first-party analytics only. We do not use third-party tracking
          cookies, advertising pixels, social media trackers, or cross-site
          tracking technologies on our Website or dashboard.
        </p>

        {/* ──────────────────────────────────────────────
            4. How We Collect Information
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          4. How We Collect Information
        </h2>
        <p>We collect information through the following methods:</p>
        <p>
          <strong>4.1 Directly from You.</strong> Information you voluntarily
          provide when you create an account, fill out a form, subscribe to a
          plan, configure flags, send a support request, respond to a survey, or
          otherwise communicate with us.
        </p>
        <p>
          <strong>4.2 Automatically via the Platform.</strong> Information
          collected automatically when you interact with the Website, the
          dashboard, or our APIs, including through server logs, SDK telemetry,
          and essential session cookies (see Section 13 &mdash; Cookie Policy).
        </p>
        <p>
          <strong>4.3 From Third-Party Authentication Providers.</strong> If you
          choose to sign in using a third-party single sign-on (SSO) provider
          such as Google or GitHub, we receive your name, email address, and
          profile picture (if available) from that provider, in accordance with
          their respective privacy policies and your privacy settings with them.
        </p>
        <p>
          <strong>4.4 From Your Applications (SDK/API).</strong> When your
          application code sends evaluation requests to our APIs or evaluates
          flags using our SDKs, we receive the data described in Section 3.3
          (Evaluation Data).
        </p>
        <p>
          <strong>4.5 From Third-Party Integrations.</strong> When you connect
          third-party services to the Platform (e.g., GitHub for AI Janitor,
          Slack for notifications), we access data from those services as
          authorized by you, described in Section 3 of our Terms &amp;
          Conditions.
        </p>

        {/* ──────────────────────────────────────────────
            5. How We Use Your Information
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          5. How We Use Your Information
        </h2>
        <p>We use the information we collect for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Service Delivery &amp; Operation.</strong> To create and
            manage your account, authenticate you, process flag evaluation
            requests, deliver the dashboard, and provide the core functionality
            of the Platform.
          </li>
          <li>
            <strong>Billing &amp; Subscription Management.</strong> To process
            payments, manage subscriptions, send invoices, handle plan changes,
            and communicate about billing matters.
          </li>
          <li>
            <strong>Customer Support.</strong> To respond to your inquiries,
            troubleshoot technical issues, investigate bugs, and provide
            technical assistance.
          </li>
          <li>
            <strong>Security &amp; Abuse Prevention.</strong> To detect,
            prevent, investigate, and respond to security incidents, fraud,
            abuse, and violations of our Terms &amp; Conditions. This includes
            monitoring for unauthorized access, rate limit violations, and
            malicious activity.
          </li>
          <li>
            <strong>Product Improvement (Opt-In Only).</strong> To analyze
            aggregated, anonymized usage patterns to improve the Platform&apos;s
            performance, reliability, and user experience. We will only use your
            individually identifiable Content or evaluation data for product
            improvement with your explicit opt-in consent.
          </li>
          <li>
            <strong>Communication.</strong> To send you service-related
            communications (account notifications, security alerts, billing
            reminders, maintenance notices) and, with your consent, marketing
            communications (product updates, newsletters, event invitations).
            You may opt out of marketing communications at any time.
          </li>
          <li>
            <strong>Legal Compliance.</strong> To comply with applicable laws,
            regulations, legal processes, and governmental requests; to enforce
            our Terms &amp; Conditions; and to protect our rights, property, and
            safety.
          </li>
        </ul>
        <p>
          We do not use your personal data for automated decision-making
          (including profiling) that produces legal effects or similarly
          significant effects concerning you.
        </p>

        {/* ──────────────────────────────────────────────
            6. Legal Basis for Processing
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          6. Legal Basis for Processing
        </h2>
        <p>
          Our legal basis for collecting and using your personal data depends on
          the specific context and applicable law. We rely on the following
          legal bases:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Contractual Necessity.</strong> Processing is necessary for
            the performance of our contract with you (the Terms &amp;
            Conditions), including creating your account, delivering the
            Service, processing payments, and providing support.
          </li>
          <li>
            <strong>Legitimate Interests.</strong> Processing is necessary for
            our legitimate interests, including: securing and improving the
            Platform; detecting and preventing fraud, abuse, and security
            incidents; analyzing aggregated usage trends; and communicating with
            you about service-related matters. We balance our legitimate
            interests against your data protection rights.
          </li>
          <li>
            <strong>Consent.</strong> Where required by law, we obtain your
            consent before processing your personal data for specific purposes,
            including: sending marketing communications; using your data for
            product improvement beyond aggregated analytics; collecting SDK
            telemetry (where opt-in is required); and placing non-essential
            cookies. You may withdraw consent at any time without affecting the
            lawfulness of processing based on consent before its withdrawal.
          </li>
          <li>
            <strong>Legal Obligation.</strong> Processing is necessary to comply
            with applicable laws, regulations, court orders, or governmental
            requests.
          </li>
        </ul>

        {/* ──────────────────────────────────────────────
            7. Data Storage & Region Selection
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          7. Data Storage &amp; Region Selection
        </h2>
        <p>
          <strong>7.1 Data Regions.</strong> We offer data storage in the
          following regions to help you comply with data residency requirements:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>India:</strong> Data centers located in Mumbai and
            Hyderabad, India. This is the default region for accounts created
            from India.
          </li>
          <li>
            <strong>European Union:</strong> Data centers located in Frankfurt,
            Germany (EU-west). Available for Pro and Enterprise plans.
          </li>
          <li>
            <strong>United States:</strong> Data centers located in Northern
            Virginia (US-east). Available for Pro and Enterprise plans.
          </li>
        </ul>
        <p>
          Free Tier accounts are hosted in the India region by default.
          Enterprise plan customers may select their preferred data region
          during onboarding. Once a data region is selected and data has been
          written, region migration requires a support-assisted process.
        </p>
        <p>
          <strong>7.2 Infrastructure Providers.</strong> Our cloud
          infrastructure is hosted on industry-standard platforms, including
          Amazon Web Services (AWS), Google Cloud Platform (GCP), and
          Cloudflare. We select data center facilities that maintain ISO 27001,
          SOC 1/2/3, and PCI DSS certifications. A current list of
          sub-processors is available in Section 9.
        </p>

        {/* ──────────────────────────────────────────────
            8. Data Retention
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          8. Data Retention
        </h2>
        <p>
          We retain personal data only for as long as necessary to fulfill the
          purposes for which it was collected, or as required by applicable law.
          Our retention periods are as follows:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Account &amp; Registration Data:</strong> Retained for the
            duration of your account plus thirty (30) days after account
            termination, after which it is permanently deleted. Billing records
            and invoices are retained for seven (7) years as required by Indian
            tax law (Income Tax Act, 1961).
          </li>
          <li>
            <strong>Feature Flag Configuration Data:</strong> Retained for the
            duration of your account plus thirty (30) days after termination.
            You may delete individual flags, environments, or segments at any
            time, and they will be permanently removed from our systems within
            thirty (30) days.
          </li>
          <li>
            <strong>Evaluation Data (with Impression Tracking Enabled):</strong>
            Retained as follows based on your plan: Free Tier &mdash; 7 days;
            Pro Plan &mdash; 90 days; Enterprise Plan &mdash; custom retention
            period as defined in your order form (up to 2 years maximum).
          </li>
          <li>
            <strong>Evaluation Data (in-memory processing only):</strong> When
            impression tracking is disabled, evaluation context data is
            processed ephemerally in memory during the request lifecycle and is
            not written to persistent storage. Memory is cleared after the
            evaluation completes.
          </li>
          <li>
            <strong>Audit Logs:</strong> Retained based on your plan: Free Tier
            &mdash; 7 days; Pro Plan &mdash; 90 days; Enterprise Plan &mdash; up
            to 1 year.
          </li>
          <li>
            <strong>Support Communications:</strong> Retained for three (3)
            years after the last interaction to maintain continuity of support.
          </li>
          <li>
            <strong>Website Analytics Data:</strong> IP addresses are anonymized
            within 24 hours. Aggregated, anonymized analytics data is retained
            indefinitely.
          </li>
          <li>
            <strong>Backups:</strong> Routine encrypted backups are retained for
            up to sixty (60) days as part of our disaster recovery procedures.
          </li>
        </ul>
        <p>
          After the applicable retention period, personal data is securely
          deleted using methods such as cryptographic erasure, secure
          overwriting, or physical destruction, as appropriate.
        </p>

        {/* ──────────────────────────────────────────────
            9. Data Sharing & Third-Party Processors
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          9. Data Sharing &amp; Third-Party Processors
        </h2>
        <p>
          <strong>9.1 We Do Not Sell Your Data.</strong> We do not sell, rent,
          trade, or otherwise disclose your personal data to third parties for
          monetary consideration. We do not share personal data with advertising
          networks, data brokers, or any other third party for their own
          marketing purposes.
        </p>
        <p>
          <strong>9.2 Service Providers &amp; Sub-Processors.</strong> We engage
          the following categories of third-party service providers who process
          personal data on our behalf and under our instructions:
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse border border-stone-200">
            <thead>
              <tr className="bg-stone-50">
                <th className="border border-stone-200 px-3 py-2 text-left font-semibold text-stone-800">
                  Sub-Processor
                </th>
                <th className="border border-stone-200 px-3 py-2 text-left font-semibold text-stone-800">
                  Purpose
                </th>
                <th className="border border-stone-200 px-3 py-2 text-left font-semibold text-stone-800">
                  Data Location
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Amazon Web Services (AWS)
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Cloud infrastructure, compute, storage, and networking
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  India, EU, US (per data region)
                </td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Google Cloud Platform (GCP)
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Cloud infrastructure, object storage
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  India, EU, US
                </td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Cloudflare, Inc.
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Content delivery network (CDN), DDoS protection, DNS
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Global edge network
                </td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  PayU Software Pvt Ltd
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Payment processing (Indian customers)
                </td>
                <td className="border border-stone-200 px-3 py-2">India</td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Stripe, Inc.
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Payment processing (International customers)
                </td>
                <td className="border border-stone-200 px-3 py-2">US, EU</td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Resend, Inc.
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Transactional email delivery (notifications, password resets,
                  invoices)
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  US (AWS us-east-1)
                </td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Intercom, Inc.
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  In-app customer support and engagement platform (optional;
                  used for support chat)
                </td>
                <td className="border border-stone-200 px-3 py-2">US, EU</td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-3 py-2">
                  Sentry (Functional Software, Inc.)
                </td>
                <td className="border border-stone-200 px-3 py-2">
                  Error tracking and application performance monitoring
                </td>
                <td className="border border-stone-200 px-3 py-2">US</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          All sub-processors are contractually bound to: (a) process personal
          data only on our documented instructions; (b) implement appropriate
          technical and organizational security measures; (c) assist us in
          responding to data subject requests; (d) notify us of security
          breaches without undue delay; and (e) delete or return all personal
          data upon termination of services.
        </p>
        <p>
          <strong>9.3 Legal Disclosure.</strong> We may disclose your personal
          data if required to do so by law, regulation, court order, or a valid
          governmental request. We will notify you of such disclosure unless
          prohibited by law.
        </p>
        <p>
          <strong>9.4 Business Transfers.</strong> In the event of a merger,
          acquisition, reorganization, or sale of all or a portion of our
          assets, your personal data may be transferred as part of that
          transaction. We will notify you via email and/or a prominent notice on
          our Platform before your data is transferred and becomes subject to a
          different privacy policy.
        </p>

        {/* ──────────────────────────────────────────────
            10. International Data Transfers
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          10. International Data Transfers
        </h2>
        <p>
          FeatureSignals is headquartered in India and operates data centers
          globally. Your personal data may be transferred to, stored, and
          processed in countries other than your country of residence, including
          India, the United States, and the European Union.
        </p>
        <p>
          When we transfer personal data across borders, we ensure that
          appropriate safeguards are in place in accordance with applicable data
          protection laws, including:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>For EEA/UK to Third Countries:</strong> European Commission
            Standard Contractual Clauses (SCCs) and the UK International Data
            Transfer Addendum, as applicable;
          </li>
          <li>
            <strong>For India:</strong> Compliance with data localization
            requirements under the DPDP Act 2023, RBI guidelines for payment
            data, and other sectoral regulations;
          </li>
          <li>
            <strong>Adequacy Decisions:</strong> Where the European Commission
            has recognized a country as providing an adequate level of data
            protection, we rely on such adequacy decisions;
          </li>
          <li>
            <strong>Data Processing Agreements (DPAs):</strong> All
            sub-processors are bound by DPAs incorporating the applicable SCCs
            and security obligations.
          </li>
        </ul>
        <p>
          Enterprise customers requiring customized data transfer mechanisms may
          request a tailored DPA during contracting.
        </p>

        {/* ──────────────────────────────────────────────
            11. Data Security Measures
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          11. Data Security Measures
        </h2>
        <p>
          We implement and maintain appropriate technical, administrative, and
          organizational measures designed to protect your personal data against
          accidental or unlawful destruction, loss, alteration, unauthorized
          disclosure, or access. These measures include:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Encryption in Transit:</strong> All data transmitted between
            your systems and our Platform is encrypted using TLS 1.3 (minimum
            TLS 1.2). We enforce HTTPS Strict Transport Security (HSTS) with a
            minimum max-age of one year and include the includeSubDomains and
            preload directives.
          </li>
          <li>
            <strong>Encryption at Rest:</strong> All stored data is encrypted
            using AES-256. Database volumes, backups, and object storage are
            encrypted using cloud provider key management services (AWS KMS, GCP
            Cloud KMS) with automatic key rotation.
          </li>
          <li>
            <strong>Password Security:</strong> Account passwords are hashed
            using bcrypt with a high work factor. We never store plaintext
            passwords. All password reset flows use time-limited, single-use
            tokens transmitted over TLS.
          </li>
          <li>
            <strong>API Key Security:</strong> Server-side API keys are hashed
            using SHA-256 before storage. Raw keys are displayed only once at
            creation and cannot be retrieved thereafter. Client-side (public)
            API keys are stored with restricted access scopes.
          </li>
          <li>
            <strong>Access Controls:</strong> We enforce the principle of least
            privilege. Infrastructure access requires multi-factor
            authentication (MFA), is logged, and is audited regularly. Access to
            production data is restricted to authorized personnel on a
            need-to-know basis.
          </li>
          <li>
            <strong>Network Security:</strong> We use Web Application Firewalls
            (WAF), DDoS protection (Cloudflare), VPC isolation, security groups,
            and network segmentation to protect our infrastructure.
          </li>
          <li>
            <strong>Security Testing:</strong> We conduct regular penetration
            testing by independent third-party security firms, vulnerability
            scanning, and code security reviews. Identified vulnerabilities are
            remediated in accordance with our vulnerability management policy.
          </li>
          <li>
            <strong>Compliance (Planned / In Progress):</strong> We are working
            toward SOC 2 Type II certification. Our security controls are
            modeled on ISO 27001 and NIST Cybersecurity Framework standards.
          </li>
          <li>
            <strong>Employee Training:</strong> All employees and contractors
            with access to personal data receive mandatory data protection and
            security awareness training upon onboarding and annually thereafter.
          </li>
          <li>
            <strong>Incident Response:</strong> We maintain a documented
            incident response plan that is tested annually through tabletop
            exercises.
          </li>
        </ul>

        {/* ──────────────────────────────────────────────
            12. Data Subject Rights
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          12. Data Subject Rights
        </h2>
        <p>
          Depending on your jurisdiction, you may have the following rights
          regarding your personal data. We will respond to all valid requests
          within the timeframes required by applicable law (typically thirty
          days, extendable by up to sixty days for complex requests under GDPR).
        </p>
        <p>
          <strong>12.1 Right of Access.</strong> You have the right to request
          confirmation of whether we process your personal data and, if so, to
          obtain a copy of that data along with information about how it is
          being processed.
        </p>
        <p>
          <strong>12.2 Right of Rectification.</strong> You have the right to
          request correction of inaccurate or incomplete personal data. You may
          also update your account information directly through your account
          settings.
        </p>
        <p>
          <strong>
            12.3 Right of Erasure (&ldquo;Right to be Forgotten&rdquo;).
          </strong>{" "}
          You have the right to request deletion of your personal data, subject
          to certain exceptions (e.g., where retention is required for legal
          compliance, exercise of legal claims, or public interest purposes).
          Upon verified request, we will delete your data in accordance with
          Section 8 of this policy.
        </p>
        <p>
          <strong>12.4 Right to Data Portability.</strong> You have the right to
          receive your personal data in a structured, commonly used, and
          machine-readable format (e.g., JSON or CSV), and to transmit it to
          another data controller without hindrance, where processing is based
          on consent or contract and is carried out by automated means.
        </p>
        <p>
          <strong>12.5 Right to Restriction of Processing.</strong> You have the
          right to request restriction of processing of your personal data in
          certain circumstances, such as where you contest the accuracy of the
          data or object to processing.
        </p>
        <p>
          <strong>12.6 Right to Object.</strong> You have the right to object to
          processing of your personal data based on legitimate interests or for
          direct marketing purposes. We will cease processing unless we
          demonstrate compelling legitimate grounds that override your
          interests, rights, and freedoms.
        </p>
        <p>
          <strong>12.7 Right to Withdraw Consent.</strong> Where processing is
          based on your consent, you have the right to withdraw consent at any
          time. Withdrawal does not affect the lawfulness of processing prior to
          withdrawal.
        </p>
        <p>
          <strong>12.8 Rights Under the DPDP Act 2023.</strong> Users in India
          have the right to: (a) access a summary of personal data processed;
          (b) request erasure of personal data (subject to legal retention
          requirements); (c) nominate another individual to exercise rights on
          your behalf in the event of death or incapacity; and (d) grievance
          redressal as provided in Section 16.
        </p>
        <p>
          <strong>12.9 Non-Discrimination.</strong> We will not discriminate
          against you for exercising any of your data subject rights, including
          by denying services, charging different prices, or providing a
          different quality of service.
        </p>
        <p>
          To exercise any of these rights, please email{" "}
          <a
            href="mailto:privacy@featuresignals.com"
            className="text-accent hover:underline"
          >
            privacy@featuresignals.com
          </a>
          . We may need to verify your identity before processing your request.
          If you are an End User of one of our customers, please direct your
          request to that Organization; we will assist them in fulfilling your
          request as their data processor.
        </p>

        {/* ──────────────────────────────────────────────
            13. Cookie Policy
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          13. Cookie Policy
        </h2>
        <p>
          <strong>13.1 Essential Cookies Only.</strong> We use a minimal set of
          essential (strictly necessary) cookies that are required for the
          Platform to function:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Session Cookies:</strong> Temporary cookies that
            authenticate your session and maintain your logged-in state. These
            cookies are deleted when you close your browser. They are set by our
            authentication system and are HttpOnly and Secure.
          </li>
          <li>
            <strong>CSRF Protection Cookies:</strong> Cookies used to prevent
            Cross-Site Request Forgery attacks. These are essential for security
            and cannot be disabled.
          </li>
          <li>
            <strong>Preference Cookies:</strong> Cookies that remember your
            preferences, such as dashboard theme (light/dark mode), language,
            and timezone settings. These are functional cookies set only upon
            your interaction with preference controls.
          </li>
        </ul>
        <p>
          <strong>13.2 No Tracking or Advertising Cookies.</strong> We do not
          use tracking cookies, advertising cookies, analytics cookies from
          third-party networks, social media pixels, or any cookies for
          behavioral advertising purposes. We do not deploy any cookies that
          track you across different websites or build interest profiles.
        </p>
        <p>
          <strong>13.3 No Third-Party Cookies.</strong> We do not allow
          third-party cookies to be set through our Website or dashboard. All
          cookies set by our domain are first-party, served directly by us.
        </p>
        <p>
          <strong>13.4 Managing Cookies.</strong> You can control cookie
          settings through your browser preferences. Please note that disabling
          essential cookies may prevent you from logging into or using the
          Platform. For information on managing cookies, visit{" "}
          <a
            href="https://www.allaboutcookies.org"
            className="text-accent hover:underline"
          >
            www.allaboutcookies.org
          </a>
          .
        </p>

        {/* ──────────────────────────────────────────────
            14. Children's Privacy
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          14. Children&apos;s Privacy
        </h2>
        <p>
          The Platform is a B2B SaaS product intended for use by software
          engineering professionals and organizations. It is not directed to or
          intended for individuals under the age of eighteen (18). We do not
          knowingly collect personal data from children under 18. If we become
          aware that a child under 18 has provided us with personal data, we
          will take prompt steps to delete such information from our systems. If
          you are a parent or guardian and believe that your child has provided
          us with personal data, please contact us immediately at{" "}
          <a
            href="mailto:privacy@featuresignals.com"
            className="text-accent hover:underline"
          >
            privacy@featuresignals.com
          </a>
          .
        </p>

        {/* ──────────────────────────────────────────────
            15. Data Breach Notification
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          15. Data Breach Notification
        </h2>
        <p>
          <strong>15.1 Notification to Authorities.</strong> In the event of a
          personal data breach, we will notify the relevant supervisory
          authority within seventy-two (72) hours of becoming aware of the
          breach, where required by applicable law (including under GDPR and
          DPDP Act 2023). The notification will include: the nature of the
          breach; categories and approximate number of data subjects and records
          affected; likely consequences of the breach; measures taken or
          proposed to address the breach and mitigate adverse effects; and
          contact details of our Data Protection Officer / Grievance Officer.
        </p>
        <p>
          <strong>15.2 Notification to Affected Users.</strong> Where the breach
          is likely to result in a high risk to your rights and freedoms, we
          will notify you without undue delay and provide recommendations on
          steps you can take to protect yourself. We will also notify affected
          Organizations so they can fulfill their own notification obligations
          to End Users.
        </p>
        <p>
          <strong>15.3 Breach Record.</strong> We maintain an internal record of
          all personal data breaches, including the facts, effects, and remedial
          actions taken, regardless of whether notification was required.
        </p>

        {/* ──────────────────────────────────────────────
            16. Grievance Officer & DPO
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          16. Grievance Officer &amp; Data Protection Contact
        </h2>
        <p>
          In accordance with the Information Technology Act, 2000 and the
          Digital Personal Data Protection Act, 2023, we have designated a
          Grievance Officer who is also the primary contact for data protection
          matters:
        </p>
        <p>
          <strong>Name:</strong> Grievance Officer
          <br />
          <strong>Email:</strong>{" "}
          <a
            href="mailto:grievance@featuresignals.com"
            className="text-accent hover:underline"
          >
            grievance@featuresignals.com
          </a>
          <br />
          <strong>Address:</strong> Vivekananda Technology Labs, #42, 3rd Cross,
          Viveknagar, Hyderabad, Telangana &mdash; 500104, India
          <br />
          <strong>Phone:</strong> Available upon request via email.
        </p>
        <p>
          For GDPR purposes, our Grievance Officer serves as the primary contact
          for data protection inquiries, including requests from EEA and UK
          supervisory authorities. EEA residents may also lodge a complaint with
          their local data protection supervisory authority. A list of EU Data
          Protection Authorities is available at{" "}
          <a
            href="https://edpb.europa.eu/about-edpb/board/members_en"
            className="text-accent hover:underline"
          >
            https://edpb.europa.eu
          </a>
          .
        </p>
        <p>
          The Grievance Officer shall acknowledge your complaint within
          twenty-four (24) hours and endeavor to resolve it within fifteen (15)
          days, or within the period prescribed by applicable law.
        </p>

        {/* ──────────────────────────────────────────────
            17. Changes to This Privacy Policy
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          17. Changes to This Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes
          in our data practices, legal obligations, or the Platform&apos;s
          functionality. For material changes, we will provide at least thirty
          (30) days&apos; notice via email to the address associated with your
          account and/or through a prominent notice on the Platform and Website.
          For non-material changes (such as clarifying language, updating
          sub-processor lists, or correcting typographical errors), we may
          update the policy without prior notice.
        </p>
        <p>
          The &ldquo;Last updated&rdquo; date at the top of this page indicates
          when this Privacy Policy was last revised. We encourage you to review
          this policy periodically. Your continued use of the Platform after the
          effective date of an updated policy constitutes your acceptance of the
          changes. If you do not agree with the revised policy, you must
          discontinue use of the Platform.
        </p>

        {/* ──────────────────────────────────────────────
            18. Contact Us
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">18. Contact Us</h2>
        <p>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy or our data protection practices, please contact us:
        </p>
        <p>
          <strong>Email (Privacy):</strong>{" "}
          <a
            href="mailto:privacy@featuresignals.com"
            className="text-accent hover:underline"
          >
            privacy@featuresignals.com
          </a>
          <br />
          <strong>Email (Legal):</strong>{" "}
          <a
            href="mailto:legal@featuresignals.com"
            className="text-accent hover:underline"
          >
            legal@featuresignals.com
          </a>
          <br />
          <strong>Email (Security):</strong>{" "}
          <a
            href="mailto:security@featuresignals.com"
            className="text-accent hover:underline"
          >
            security@featuresignals.com
          </a>
          <br />
          <strong>Registered Address:</strong> Vivekananda Technology Labs, #42,
          3rd Cross, Viveknagar, Hyderabad, Telangana &mdash; 500104, India
          <br />
          <strong>Website:</strong>{" "}
          <a
            href="https://featuresignals.com"
            className="text-accent hover:underline"
          >
            https://featuresignals.com
          </a>
        </p>

        <p className="text-stone-400 text-xs pt-4 border-t border-stone-200">
          &copy; {new Date().getFullYear()} Vivekananda Technology Labs. All
          rights reserved. FeatureSignals is a trade name of Vivekananda
          Technology Labs. This Privacy Policy is governed by the laws of the
          Republic of India.
        </p>
      </div>
    </div>
  );
}
