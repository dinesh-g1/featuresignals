import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using FeatureSignals, operated by Vivekananda Technology Labs. By using our service, you agree to these terms governing your use of our feature flag management platform.",
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
        {/* ──────────────────────────────────────────────
            1. Acceptance of Terms
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          1. Acceptance of Terms
        </h2>
        <p>
          This website,{" "}
          <a
            href="https://featuresignals.com"
            className="text-accent hover:underline"
          >
            https://featuresignals.com
          </a>{" "}
          (the &ldquo;Website&rdquo;), and the FeatureSignals feature flag
          management platform (the &ldquo;Service&rdquo;) are operated by{" "}
          <strong>Vivekananda Technology Labs</strong>, a proprietorship firm
          with its registered office at Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad,
          Telangana &mdash; 500104, India (&ldquo;FeatureSignals,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
        <p>
          By accessing or using the Website or the Service, including any
          application programming interfaces (&ldquo;APIs&rdquo;), software
          development kits (&ldquo;SDKs&rdquo;), documentation, or related
          materials (collectively, the &ldquo;Platform&rdquo;), you
          (&ldquo;you,&rdquo; &ldquo;your,&rdquo; or &ldquo;User&rdquo;) agree
          to be bound by these Terms &amp; Conditions (the &ldquo;Terms&rdquo;).
          If you are entering into these Terms on behalf of an organization, you
          represent and warrant that you have the authority to bind that
          organization. If you do not agree to these Terms in their entirety,
          you must not access or use the Platform.
        </p>

        {/* ──────────────────────────────────────────────
            2. Definitions
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">2. Definitions</h2>
        <p>For the purposes of these Terms, the following definitions apply:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>&ldquo;Service&rdquo;</strong> means the FeatureSignals
            cloud-hosted feature flag management platform, including all
            associated APIs, SDKs, dashboard interfaces, and documentation.
          </li>
          <li>
            <strong>&ldquo;User&rdquo;</strong> means any individual who creates
            an account, accesses, or uses the Platform, including account
            owners, administrators, team members, and API consumers.
          </li>
          <li>
            <strong>&ldquo;Organization&rdquo;</strong> means a legal entity
            (company, partnership, sole proprietorship, or other) on whose
            behalf a User has created an account. An Organization may have
            multiple Users associated with it.
          </li>
          <li>
            <strong>&ldquo;Content&rdquo;</strong> means all data, information,
            text, code, configurations, feature flag definitions, targeting
            rules, segment definitions, environment settings, and any other
            material that you or your Users upload, create, transmit, or store
            on the Platform.
          </li>
          <li>
            <strong>&ldquo;API&rdquo;</strong> means the FeatureSignals REST
            Application Programming Interface, through which the Service may be
            accessed programmatically.
          </li>
          <li>
            <strong>&ldquo;SDK&rdquo;</strong> means the FeatureSignals Software
            Development Kits, available in multiple programming languages, that
            integrate with customer applications for feature flag evaluation.
          </li>
          <li>
            <strong>&ldquo;Self-Hosted&rdquo;</strong> means the deployment of
            the FeatureSignals server software on infrastructure owned or
            controlled by you, as licensed separately under an Enterprise or
            Community Edition license.
          </li>
          <li>
            <strong>&ldquo;Subscription Plan&rdquo;</strong> means a paid tier
            of the Service (Pro or Enterprise) with defined features, limits,
            and service levels, billed on a monthly or annual basis.
          </li>
          <li>
            <strong>&ldquo;Free Tier&rdquo;</strong> means the free,
            limited-feature version of the Service available under the Community
            Edition license (Apache 2.0) for self-hosted deployments and the
            Free cloud plan.
          </li>
        </ul>

        {/* ──────────────────────────────────────────────
            3. Account Registration & Security
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          3. Account Registration &amp; Security
        </h2>
        <p>
          <strong>3.1 Eligibility.</strong> You must be at least 18 years of age
          and capable of entering into a legally binding contract to use the
          Platform. By creating an account, you represent and warrant that you
          meet these eligibility requirements.
        </p>
        <p>
          <strong>3.2 Registration.</strong> You must provide accurate, current,
          and complete information during the registration process
          (&ldquo;Registration Data&rdquo;) and keep your Registration Data
          updated. You may not use a false identity or impersonate any person or
          entity. We reserve the right to suspend or terminate accounts
          containing inaccurate or fraudulent information.
        </p>
        <p>
          <strong>3.3 Account Security.</strong> You are solely responsible for
          maintaining the confidentiality of your account credentials (including
          passwords, API keys, and access tokens) and for all activities that
          occur under your account. You agree to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Notify us immediately at{" "}
            <a
              href="mailto:security@featuresignals.com"
              className="text-accent hover:underline"
            >
              security@featuresignals.com
            </a>{" "}
            of any unauthorized use of your account or any other breach of
            security.
          </li>
          <li>
            Ensure that all Users under your Organization exit from their
            accounts at the end of each session when using shared devices.
          </li>
          <li>
            Use strong, unique passwords and enable multi-factor authentication
            (MFA) where available.
          </li>
        </ul>
        <p>
          <strong>3.4 Organization Accounts.</strong> If you create an account
          on behalf of an Organization, you represent that you are authorized to
          bind that Organization to these Terms. The Organization is jointly and
          severally liable for all actions of its Users. You are responsible for
          managing User roles, permissions, and access within your Organization
          account.
        </p>

        {/* ──────────────────────────────────────────────
            4. Subscription Plans, Pricing & Payment Terms
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          4. Subscription Plans, Pricing &amp; Payment Terms
        </h2>
        <p>
          <strong>4.1 Plans.</strong> FeatureSignals offers the following plans,
          as described on our pricing page: Free, Pro, and Enterprise. The
          features, limits, support levels, and service levels applicable to
          each plan are set forth on our Website and are incorporated into these
          Terms by reference.
        </p>
        <p>
          <strong>4.2 Fees &amp; Billing.</strong> Paid Subscription Plans are
          billed in advance on a monthly or annual basis, as selected during
          signup. All fees are denominated in United States Dollars (USD) for
          international customers and Indian Rupees (INR) for customers located
          in India, unless otherwise agreed in a separately executed order form.
        </p>
        <p>
          <strong>4.3 Payment Processing.</strong> All payments are processed
          through third-party payment gateways:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>PayU:</strong> For customers in India. PayU Software
            Private Limited processes payments in accordance with its terms and
            applicable Reserve Bank of India (RBI) guidelines. Payment
            information is transmitted directly to PayU via their PCI
            DSS-compliant checkout interface.
          </li>
          <li>
            <strong>Stripe:</strong> For customers in the United States,
            European Union, the United Kingdom, and other supported
            international regions. Stripe Payments Europe Limited or Stripe,
            Inc. processes payments in accordance with their respective terms.
            Payment information is transmitted directly to Stripe via their PCI
            DSS Level 1 compliant API.
          </li>
        </ul>
        <p>
          We do not store full credit card numbers, CVV codes, or sensitive
          payment instrument details on our servers. You agree to comply with
          the terms of service of the applicable payment gateway when providing
          payment information.
        </p>
        <p>
          <strong>4.4 Auto-Renewal.</strong> Unless you cancel your Subscription
          Plan before the end of the current billing period, your subscription
          will automatically renew for a period of equal length (monthly or
          annually). You authorize us (through our payment gateways) to charge
          the applicable subscription fees to your designated payment method
          upon each renewal, unless you cancel in accordance with Section 4.5.
        </p>
        <p>
          <strong>4.5 Cancellation.</strong> You may cancel your Subscription
          Plan at any time through your account settings. Cancellation takes
          effect at the end of your current billing period. You will retain
          access to paid features until the end of that period. No pro-rata
          refunds are issued for cancellations made mid-cycle unless otherwise
          required by applicable law.
        </p>
        <p>
          <strong>4.6 Price Changes.</strong> We reserve the right to modify our
          pricing. For existing subscribers, we will provide at least thirty
          (30) days&apos; advance notice via email before any price increase
          takes effect. If you do not agree with the price change, you may
          cancel your subscription before the change becomes effective.
          Continued use of the Service after the effective date constitutes
          acceptance of the new pricing.
        </p>
        <p>
          <strong>4.7 Taxes.</strong> All fees are exclusive of applicable
          taxes, levies, and duties, including but not limited to Goods and
          Services Tax (GST) in India, Value Added Tax (VAT) in the EU, and any
          other similar taxes. You are responsible for payment of all such
          taxes. We will add applicable taxes to your invoice where required by
          law.
        </p>
        <p>
          <strong>4.8 Non-Payment.</strong> If payment is not received within
          seven (7) days of the due date, we reserve the right to suspend your
          access to the Service. We will provide notice before any suspension.
          Access will be restored upon receipt of full payment of all
          outstanding amounts.
        </p>

        {/* ──────────────────────────────────────────────
            5. Free Trial Terms
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          5. Free Trial Terms
        </h2>
        <p>
          <strong>5.1 Trial Period.</strong> We may offer a fourteen (14) day
          free trial of the Pro plan (&ldquo;Free Trial&rdquo;). No credit card
          or payment method is required to start a Free Trial. The Free Trial
          begins on the date you create your account and select the Pro trial
          plan.
        </p>
        <p>
          <strong>5.2 Trial Scope.</strong> During the Free Trial, you will have
          access to all features included in the Pro plan, subject to the usage
          limits described on our pricing page. The Free Trial is provided
          &ldquo;as is&rdquo; and without any service level guarantees.
        </p>
        <p>
          <strong>5.3 Automatic Downgrade.</strong> If you do not subscribe to a
          paid plan before the end of the fourteen (14) day trial period, your
          account will automatically be downgraded to the Free plan. Features
          and data exclusive to the Pro plan will no longer be accessible. We
          will provide notice via email before the downgrade occurs.
        </p>
        <p>
          <strong>5.4 Trial Abuse.</strong> We reserve the right to limit the
          number of Free Trials available to any individual or Organization, and
          to terminate a Free Trial if we determine, in our sole discretion,
          that the Free Trial is being used in bad faith or in violation of
          these Terms.
        </p>

        {/* ──────────────────────────────────────────────
            6. Acceptable Use Policy
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          6. Acceptable Use Policy
        </h2>
        <p>
          You agree that you will not, and will not permit any third party to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Use the Platform for any unlawful purpose or in violation of any
            applicable local, state, national, or international law, including
            but not limited to data protection laws, export control laws, and
            anti-spam legislation.
          </li>
          <li>
            Upload, transmit, or store any Content that is unlawful, harmful,
            defamatory, obscene, invasive of privacy, infringing of intellectual
            property rights, or otherwise objectionable.
          </li>
          <li>
            Reverse engineer, decompile, disassemble, decode, or otherwise
            attempt to derive the source code of any part of the Platform,
            except to the extent expressly permitted by applicable open-source
            licenses (Apache 2.0 for Community Edition components).
          </li>
          <li>
            Conduct or publish any benchmark, performance comparison, or
            competitive analysis of the Platform without our prior written
            consent.
          </li>
          <li>
            Attempt to gain unauthorized access to any part of the Platform,
            including other Users&apos; accounts, computer systems, or networks
            connected to the Platform.
          </li>
          <li>
            Interfere with or disrupt the operation of the Platform, including
            by overloading, flooding, spamming, mail-bombing, or crashing it.
          </li>
          <li>
            Use any automated means (including bots, scrapers, crawlers, or
            spiders) to access, monitor, or copy the Platform, except for API
            requests made within the rate limits specified in Section 8.
          </li>
          <li>
            Use the Platform to store, transmit, or process malicious code,
            malware, viruses, Trojan horses, ransomware, or any other harmful
            software.
          </li>
          <li>
            Use the Platform for any high-risk activities where failure could
            lead to death, personal injury, or severe environmental damage,
            including but not limited to operation of nuclear facilities, air
            traffic control, life support systems, or weaponry systems.
          </li>
          <li>
            Circumvent any security, authentication, or access control
            mechanisms of the Platform.
          </li>
          <li>
            Resell, sublicense, rent, lease, or otherwise commercialize access
            to the Platform without our express written agreement, except as
            expressly permitted by an applicable open-source license.
          </li>
          <li>
            Use the Platform to process, store, or transmit protected health
            information (PHI) in violation of applicable healthcare regulations,
            unless you have entered into a separate Business Associate Agreement
            (BAA) with us.
          </li>
        </ul>
        <p>
          We reserve the right, but undertake no obligation, to monitor
          compliance with this Acceptable Use Policy. Violation may result in
          immediate suspension or termination of your account.
        </p>

        {/* ──────────────────────────────────────────────
            7. Intellectual Property Rights
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          7. Intellectual Property Rights
        </h2>
        <p>
          <strong>7.1 Our IP.</strong> The Platform, including but not limited
          to its source code, object code, algorithms, architecture, design,
          user interface, graphics, trademarks, service marks, trade names,
          logos, domain names, documentation, and all related intellectual
          property rights, is and shall remain the exclusive property of
          Vivekananda Technology Labs. Except as expressly granted in these
          Terms, no license or right is granted to you, whether by implication,
          estoppel, or otherwise.
        </p>
        <p>
          Community Edition components of the Platform are licensed under the
          Apache License, Version 2.0. Your use of such open-source components
          is governed by the Apache 2.0 license terms, which are incorporated
          herein by reference. Pro and Enterprise features are proprietary and
          are provided solely under the commercial license granted through your
          Subscription Plan or a separately executed license agreement.
        </p>
        <p>
          <strong>7.2 Your Content.</strong> You retain all right, title, and
          interest in and to your Content. You grant us a limited,
          non-exclusive, worldwide, royalty-free license to access, use,
          process, copy, store, and transmit your Content solely as necessary to
          provide the Service to you and your Users. This license terminates
          upon deletion of your Content or termination of your account, subject
          to Section 14 (Data Retention).
        </p>
        <p>
          <strong>7.3 Feedback.</strong> Any suggestions, enhancement requests,
          recommendations, corrections, or other feedback you provide to us
          relating to the Platform (&ldquo;Feedback&rdquo;) shall be owned by
          us. You hereby assign all right, title, and interest in such Feedback
          to us. We may use, modify, and incorporate Feedback into the Platform
          without any obligation of compensation or attribution to you.
        </p>

        {/* ──────────────────────────────────────────────
            8. API & SDK Usage Terms
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          8. API &amp; SDK Usage Terms
        </h2>
        <p>
          <strong>8.1 API Access.</strong> Access to our API is provided as part
          of the Service. You must use valid API keys (server-side or
          client-side, as appropriate) for authentication. API keys are
          sensitive credentials; you are responsible for keeping them secure.
          You may not share API keys across Organizations or embed server-side
          keys in client-side code.
        </p>
        <p>
          <strong>8.2 Rate Limits.</strong> API usage is subject to rate limits,
          which vary by Subscription Plan. Current rate limits are published in
          our documentation. Exceeding rate limits may result in throttling or
          temporary suspension of API access. We will make reasonable efforts to
          notify you before enforcement actions are taken. If you require higher
          rate limits, please contact us to discuss an Enterprise plan.
        </p>
        <p>
          <strong>8.3 SDK Usage.</strong> Our SDKs are provided to facilitate
          integration of feature flag evaluation into your applications. You may
          use, modify, and distribute our open-source SDKs in accordance with
          their respective open-source licenses (Apache 2.0). Proprietary SDK
          features available only on paid plans are subject to the applicable
          commercial license.
        </p>
        <p>
          <strong>8.4 Fair Use.</strong> API and SDK usage must be reasonable
          and consistent with the intended purpose of the Platform. We reserve
          the right to throttle or suspend access if your usage negatively
          impacts the Platform&apos;s availability or performance for other
          Users. We will make reasonable efforts to work with you to address
          such issues before taking adverse action.
        </p>
        <p>
          <strong>8.5 Attribution (Self-Hosted).</strong> For self-hosted
          deployments of the Community Edition under Apache 2.0, you must retain
          all copyright, patent, trademark, and attribution notices present in
          the software. Attribution may not be removed or obscured without our
          prior written consent.
        </p>

        {/* ──────────────────────────────────────────────
            9. Service Level & Availability
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          9. Service Level &amp; Availability
        </h2>
        <p>
          <strong>9.1 Enterprise Plan.</strong> Enterprise plan subscribers are
          entitled to a 99.95% uptime Service Level Agreement
          (&ldquo;SLA&rdquo;) for the cloud-hosted Service, as detailed in the
          Enterprise SLA document provided at the time of contracting. SLA
          credits are calculated as a percentage of monthly fees based on actual
          uptime. To receive SLA credits, you must submit a claim within thirty
          (30) days of the incident.
        </p>
        <p>
          <strong>9.2 Pro Plan.</strong> Pro plan subscribers are entitled to a
          99.9% uptime SLA for the cloud-hosted Service. SLA credits are limited
          to the amount specified in our published SLA documentation.
        </p>
        <p>
          <strong>9.3 Free Tier.</strong> The Free cloud plan and Community
          Edition self-hosted deployments are provided &ldquo;as is&rdquo;
          without any uptime guarantee, SLA, or availability commitment. We make
          best efforts to maintain availability but disclaim all liability for
          downtime or unavailability of the Free Tier.
        </p>
        <p>
          <strong>9.4 Scheduled Maintenance.</strong> We may perform scheduled
          maintenance that temporarily impacts availability. We will provide at
          least forty-eight (48) hours&apos; advance notice via email and our
          status page for planned maintenance that may cause service disruption.
          Emergency maintenance may be performed with less notice when
          reasonably necessary to address security vulnerabilities or prevent
          service degradation.
        </p>
        <p>
          <strong>9.5 Exclusions.</strong> SLA commitments do not apply to
          downtime caused by: (a) your equipment, software, or network
          connections; (b) third-party services or integrations not provided by
          us; (c) force majeure events (as described in Section 11.5); (d) your
          misuse or unauthorized use of the Platform; or (e) suspension of your
          account in accordance with these Terms.
        </p>

        {/* ──────────────────────────────────────────────
            10. Third-Party Services & Integrations
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          10. Third-Party Services &amp; Integrations
        </h2>
        <p>
          <strong>10.1 Third-Party Offerings.</strong> The Platform may
          integrate with, or enable you to connect to, third-party services,
          APIs, and products (&ldquo;Third-Party Services&rdquo;), including but
          not limited to version control systems (e.g., GitHub, GitLab,
          Bitbucket), CI/CD platforms, monitoring tools, communication platforms
          (e.g., Slack, Discord), identity providers (e.g., Google, GitHub SSO),
          and payment gateways (PayU, Stripe).
        </p>
        <p>
          <strong>10.2 No Warranty.</strong> We do not warrant, endorse, or
          assume responsibility for any Third-Party Services. Your use of
          Third-Party Services is governed solely by the terms and conditions
          and privacy policies of those third parties. We are not liable for any
          damages arising from your use of Third-Party Services.
        </p>
        <p>
          <strong>10.3 Data Sharing.</strong> When you connect a Third-Party
          Service to the Platform, you authorize us to access and process data
          from that service as necessary to provide the integration
          functionality. You are responsible for ensuring that such data sharing
          complies with the third party&apos;s terms and applicable law.
        </p>

        {/* ──────────────────────────────────────────────
            11. Limitation of Liability
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          11. Limitation of Liability
        </h2>
        <p>
          <strong>11.1 Disclaimer of Warranties.</strong> TO THE MAXIMUM EXTENT
          PERMITTED BY APPLICABLE LAW, THE PLATFORM IS PROVIDED ON AN &ldquo;AS
          IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF
          ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING
          BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
          A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AND ANY WARRANTIES
          ARISING FROM COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT
          THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE
          FROM VIRUSES OR OTHER HARMFUL COMPONENTS.
        </p>
        <p>
          <strong>11.2 Limitation of Damages.</strong> TO THE MAXIMUM EXTENT
          PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL VIVEKANANDA TECHNOLOGY
          LABS, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR
          CONSEQUENTIAL DAMAGES OF ANY KIND, INCLUDING BUT NOT LIMITED TO LOSS
          OF PROFITS, LOSS OF REVENUE, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS
          INTERRUPTION, OR COST OF PROCUREMENT OF SUBSTITUTE SERVICES, ARISING
          OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE PLATFORM,
          WHETHER BASED ON CONTRACT, WARRANTY, TORT (INCLUDING NEGLIGENCE),
          STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF
          SUCH DAMAGES.
        </p>
        <p>
          <strong>11.3 Liability Cap.</strong> NOTWITHSTANDING ANYTHING TO THE
          CONTRARY, OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY AND ALL CLAIMS
          ARISING OUT OF OR IN CONNECTION WITH THESE TERMS SHALL BE LIMITED TO
          THE GREATER OF: (A) THE FEES ACTUALLY PAID BY YOU TO US DURING THE
          TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE
          CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100.00) FOR FREE
          TIER USERS.
        </p>
        <p>
          <strong>11.4 Essential Purpose.</strong> THE LIMITATIONS AND
          EXCLUSIONS SET FORTH IN THIS SECTION 11 SHALL APPLY EVEN IF THE REMEDY
          FAILS OF ITS ESSENTIAL PURPOSE. SOME JURISDICTIONS DO NOT ALLOW THE
          EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO THE ABOVE LIMITATIONS
          MAY NOT APPLY TO YOU TO THE EXTENT PROHIBITED BY LAW.
        </p>
        <p>
          <strong>11.5 Force Majeure.</strong> We shall not be liable for any
          failure or delay in performance due to causes beyond our reasonable
          control, including but not limited to acts of God, natural disasters,
          war, terrorism, civil unrest, labor disputes, internet or utility
          failures, acts of government, epidemics, or pandemics.
        </p>

        {/* ──────────────────────────────────────────────
            12. Indemnification
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          12. Indemnification
        </h2>
        <p>
          <strong>12.1 Your Indemnity.</strong> You agree to defend, indemnify,
          and hold harmless Vivekananda Technology Labs, its officers,
          directors, employees, agents, and affiliates from and against any and
          all claims, demands, actions, suits, proceedings, losses, damages,
          liabilities, costs, and expenses (including reasonable attorneys&apos;
          fees) arising out of or relating to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Your use of the Platform in violation of these Terms or applicable
            law;
          </li>
          <li>
            Your Content, including any claim that your Content infringes the
            intellectual property rights or privacy rights of any third party;
          </li>
          <li>
            Any breach by you of your representations, warranties, or
            obligations under these Terms;
          </li>
          <li>
            The acts or omissions of your Users, employees, contractors, or
            agents;
          </li>
          <li>
            Any dispute between you and a third party arising from your use of
            the Platform.
          </li>
        </ul>
        <p>
          <strong>12.2 Procedure.</strong> We shall provide you with prompt
          written notice of any claim subject to indemnification, provided that
          our failure to do so shall not relieve you of your obligations except
          to the extent you are materially prejudiced by such failure. We
          reserve the right to assume the exclusive defense and control of any
          matter subject to indemnification by you, at our own expense, in which
          case you shall cooperate fully with us in asserting any available
          defenses.
        </p>

        {/* ──────────────────────────────────────────────
            13. Termination
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          13. Termination
        </h2>
        <p>
          <strong>13.1 Termination by You.</strong> You may terminate these
          Terms at any time by closing your account through your account
          settings. If you are a paid subscriber, termination will take effect
          at the end of your current billing period (see Section 4.5 for
          cancellation). If you are a Free Tier user, termination takes effect
          immediately upon account closure.
        </p>
        <p>
          <strong>13.2 Termination by Us.</strong> We may terminate these Terms
          and your access to the Platform:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Upon thirty (30) days&apos; written notice if you materially breach
            these Terms and fail to cure such breach within the notice period;
          </li>
          <li>
            Immediately, without prior notice, if you violate Section 6
            (Acceptable Use Policy) in a manner that poses a security or legal
            risk to us or other Users;
          </li>
          <li>
            Immediately, without prior notice, if required by law enforcement or
            regulatory authority;
          </li>
          <li>
            Upon sixty (60) days&apos; written notice for convenience, in which
            case we will provide a pro-rata refund of any prepaid fees for the
            unused portion of your subscription.
          </li>
        </ul>
        <p>
          <strong>13.3 Effect of Termination.</strong> Upon termination: (a)
          your right to access and use the Platform shall immediately cease; (b)
          we will cease processing your Content; (c) all outstanding fees shall
          become immediately due and payable; and (d) each party shall return or
          destroy all confidential information of the other party.
        </p>
        <p>
          <strong>13.4 Survival.</strong> The following sections shall survive
          termination: 2 (Definitions), 7 (Intellectual Property Rights), 11
          (Limitation of Liability), 12 (Indemnification), 13 (Termination), 14
          (Data Retention), 15 (Governing Law &amp; Jurisdiction), 16 (Dispute
          Resolution), and any other provisions that by their nature should
          survive.
        </p>

        {/* ──────────────────────────────────────────────
            14. Data Retention After Termination
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          14. Data Retention After Termination
        </h2>
        <p>
          <strong>14.1 Post-Termination Window.</strong> Following termination
          of your account, we will retain your Content for a period of thirty
          (30) days (the &ldquo;Retention Window&rdquo;), during which you may
          contact us to request an export of your data in a machine-readable
          format. After the Retention Window expires, we will permanently and
          securely delete all your Content from our systems, except as required
          by applicable law or as retained in routine encrypted backups (which
          shall be deleted in accordance with our backup retention cycle, not to
          exceed an additional sixty (60) days).
        </p>
        <p>
          <strong>14.2 Anonymized Data.</strong> Notwithstanding the above, we
          may retain aggregated, anonymized, and de-identified data derived from
          your use of the Platform for analytics, product improvement, and
          statistical purposes, provided that such data cannot be re-identified
          or attributed to you or your Organization.
        </p>
        <p>
          <strong>14.3 Legal Holds.</strong> If we are required by law, legal
          process, or regulatory authority to retain certain Content beyond the
          Retention Window, we will notify you (where permitted) and retain such
          Content only as long as necessary to comply with the legal obligation.
        </p>

        {/* ──────────────────────────────────────────────
            15. Governing Law & Jurisdiction
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          15. Governing Law &amp; Jurisdiction
        </h2>
        <p>
          These Terms and any dispute arising out of or in connection with them
          shall be governed by and construed in accordance with the laws of the
          Republic of India, without regard to its conflict of law principles.
          The United Nations Convention on Contracts for the International Sale
          of Goods (CISG) shall not apply.
        </p>
        <p>
          Subject to Section 16 (Dispute Resolution), the courts of Hyderabad,
          Telangana, India shall have exclusive jurisdiction over any legal
          proceedings arising out of or in connection with these Terms. You
          hereby irrevocably submit to the jurisdiction of such courts and waive
          any objection to venue or forum non conveniens.
        </p>

        {/* ──────────────────────────────────────────────
            16. Dispute Resolution
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          16. Dispute Resolution
        </h2>
        <p>
          <strong>16.1 Good Faith Negotiation.</strong> In the event of any
          dispute, controversy, or claim arising out of or relating to these
          Terms (a &ldquo;Dispute&rdquo;), the parties shall first attempt to
          resolve the Dispute through good-faith negotiations. The party raising
          the Dispute shall provide written notice to the other party describing
          the nature of the Dispute and the relief sought. The parties shall
          meet (in person or via videoconference) within fifteen (15) days of
          such notice to attempt to resolve the Dispute.
        </p>
        <p>
          <strong>16.2 Mediation.</strong> If the Dispute is not resolved
          through negotiations within thirty (30) days of the initial notice,
          either party may refer the Dispute to mediation. The mediation shall
          be conducted in Hyderabad, Telangana, India, in English, by a mutually
          agreed mediator. Each party shall bear its own costs of mediation, and
          the costs of the mediator shall be shared equally.
        </p>
        <p>
          <strong>16.3 Arbitration.</strong> If the Dispute is not resolved
          through mediation within forty-five (45) days of referral to
          mediation, it shall be finally resolved by binding arbitration in
          accordance with the Arbitration and Conciliation Act, 1996 of India,
          or any statutory modification or re-enactment thereof. The arbitration
          shall be conducted:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>In Hyderabad, Telangana, India;</li>
          <li>In the English language;</li>
          <li>
            By a sole arbitrator mutually agreed upon by the parties, or failing
            agreement, appointed by the Hyderabad Centre for Alternative Dispute
            Resolution;
          </li>
          <li>
            In accordance with the expedited procedure if the amount in dispute
            is less than INR 10,00,000 (Indian Rupees Ten Lakh).
          </li>
        </ul>
        <p>
          The arbitral award shall be final and binding on both parties and may
          be entered and enforced in any court of competent jurisdiction. Each
          party shall bear its own costs of arbitration, and the fees of the
          arbitrator shall be shared equally, unless the arbitrator determines
          otherwise.
        </p>
        <p>
          <strong>16.4 Exception for Injunctive Relief.</strong>
          Notwithstanding the foregoing, either party may seek preliminary
          injunctive relief or other provisional remedies from the courts
          specified in Section 15 to prevent irreparable harm, without first
          complying with the dispute resolution procedures in this Section.
        </p>

        {/* ──────────────────────────────────────────────
            17. Changes to Terms
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          17. Changes to Terms
        </h2>
        <p>
          We reserve the right to modify these Terms at any time to reflect
          changes in our business practices, legal obligations, or the
          Platform&apos;s functionality. For material changes, we will provide
          at least thirty (30) days&apos; notice via email to the address
          associated with your account and/or through a prominent notice on the
          Platform. For non-material changes (such as clarifying language,
          correcting typographical errors, or updating contact information), we
          may update the Terms without prior notice.
        </p>
        <p>
          If you do not agree with the modified Terms, you must discontinue use
          of the Platform before the effective date of the changes. Continued
          use of the Platform after the effective date of the modified Terms
          constitutes your acceptance of the changes. We encourage you to
          periodically review these Terms. The &ldquo;Last updated&rdquo; date
          at the top of this page indicates when these Terms were last revised.
        </p>

        {/* ──────────────────────────────────────────────
            18. Contact Information
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          18. Contact Information
        </h2>
        <p>
          For questions about these Terms, your rights, or any other matter
          relating to the Platform, please contact us:
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:legal@featuresignals.com"
            className="text-accent hover:underline"
          >
            legal@featuresignals.com
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

        {/* ──────────────────────────────────────────────
            19. Grievance Officer
           ────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-stone-800">
          19. Grievance Officer
        </h2>
        <p>
          In accordance with the Information Technology Act, 2000 and the
          Consumer Protection Act, 2019, any grievances, complaints, or concerns
          relating to the Platform may be addressed to our designated Grievance
          Officer:
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
          The Grievance Officer shall acknowledge receipt of your complaint
          within twenty-four (24) hours and shall endeavor to resolve your
          grievance within fifteen (15) days of receipt, in accordance with
          applicable law.
        </p>

        <p className="text-stone-400 text-xs pt-4 border-t border-stone-200">
          &copy; {new Date().getFullYear()} Vivekananda Technology Labs. All
          rights reserved. FeatureSignals is a trade name of Vivekananda
          Technology Labs.
        </p>
      </div>
    </div>
  );
}
