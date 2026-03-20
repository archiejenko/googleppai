import { Link } from 'react-router-dom';

// ─── PLACEHOLDERS — fill these before publishing ──────────────────────────────
// [COMPANY_LEGAL_NAME] — your registered company name (e.g. "EJTECH Ltd")
// [DPO_EMAIL]          — legal/support contact email
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = '19 March 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2
        className="text-xl uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border-default"
        style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600 }}
      >
        {title}
      </h2>
      <div
        className="text-text-secondary space-y-3 leading-relaxed"
        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
      >
        {children}
      </div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-bg-canvas text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-widest text-accent mb-3" style={{ fontFamily: 'Oswald, sans-serif' }}>
            LEGAL
          </p>
          <h1
            className="text-4xl uppercase tracking-tight text-text-primary mb-4"
            style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600 }}
          >
            Terms of Service
          </h1>
          <p className="text-sm text-text-muted" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="mb-8 p-4 border border-border-default bg-bg-surface text-sm text-text-secondary"
             style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Please read these Terms of Service carefully before using OAST. By creating an account
          or using the platform you agree to be bound by these terms. If you do not agree, do not
          use OAST.
        </div>

        <Section title="1. About OAST">
          <p>
            OAST is a revenue operating system for enterprise sales teams, operated by{' '}
            <strong>[COMPANY_LEGAL_NAME]</strong>, a company registered in England and Wales
            ("OAST", "we", "us", "our").
          </p>
          <p>
            These Terms of Service ("Terms") govern your access to and use of the OAST platform,
            including all features, APIs, and services provided by OAST (collectively, the
            "Service").
          </p>
        </Section>

        <Section title="2. Account Eligibility">
          <p>To use OAST, you must:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Be at least 18 years old.</li>
            <li>Be using the Service on behalf of a business entity (not as a private individual consumer).</li>
            <li>Have full authority to bind that business entity to these Terms.</li>
            <li>Be based in the United Kingdom, European Union, or another jurisdiction where the
                Service is available.</li>
          </ul>
          <p>
            By creating an account, you represent and warrant that all of the above are true.
          </p>
        </Section>

        <Section title="3. Acceptable Use">
          <p>You may use OAST only for lawful purposes and in accordance with these Terms. You must not:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
            <li>Resell, sublicence, or otherwise commercialise access to the Service without our
                written consent.</li>
            <li>Use the Service to build a competing product or service.</li>
            <li>Use the Service to process personal data without appropriate consent disclosures to
                third parties, including meeting participants.</li>
            <li>Upload, transmit, or store any content that is illegal, defamatory, or infringes
                third-party rights.</li>
            <li>Attempt to circumvent any access controls, rate limits, or security measures.</li>
            <li>Use automated scripts or bots to access the Service except through our published API.</li>
          </ul>
        </Section>

        <Section title="4. Account Suspension and Termination">
          <p>
            OAST may suspend or terminate your account at any time, with or without notice, if we
            reasonably believe that:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>You have breached these Terms.</li>
            <li>You have failed to pay any fees when due.</li>
            <li>Continued operation of your account would expose OAST to legal liability or
                regulatory risk.</li>
            <li>A relevant regulatory authority has directed us to do so.</li>
          </ul>
          <p>
            Where the suspension or termination is not caused by your breach, we will provide at
            least 30 days' written notice, except where immediate action is required by law or to
            prevent harm.
          </p>
          <p>
            You may cancel your account at any time via the Settings page or by emailing{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>.
          </p>
        </Section>

        <Section title="5. Payment Terms">
          <p>
            OAST subscriptions are billed on a monthly or annual basis as selected at checkout.
            All payments are processed by Stripe. Prices are quoted in GBP and are exclusive of
            VAT unless stated otherwise.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Renewals:</strong> Subscriptions renew automatically unless cancelled at
              least 24 hours before the renewal date.
            </li>
            <li>
              <strong>Refunds:</strong> We do not offer refunds except where required by applicable
              UK consumer or business law, or where we have materially failed to deliver the
              Service.
            </li>
            <li>
              <strong>Price changes:</strong> We may change subscription prices with at least 30
              days' notice. Continued use of the Service after the notice period constitutes
              acceptance of the new price.
            </li>
            <li>
              <strong>Late payment:</strong> We reserve the right to suspend access if payment
              is overdue by more than 14 days.
            </li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            <strong>OAST's IP:</strong> The OAST platform, software, trademarks, design, and all
            content created by OAST remain the exclusive property of{' '}
            <strong>[COMPANY_LEGAL_NAME]</strong>. Nothing in these Terms transfers any intellectual
            property rights to you.
          </p>
          <p>
            <strong>Your data:</strong> You retain all rights to your input data, call recordings,
            and other content you upload to OAST ("Customer Data"). You grant OAST a limited,
            non-exclusive licence to process Customer Data solely to provide the Service.
          </p>
          <p>
            <strong>Feedback:</strong> If you provide suggestions or feedback about the Service,
            OAST may use this feedback without restriction and without any obligation to you.
          </p>
        </Section>

        <Section title="7. Data and Privacy">
          <p>
            Our collection and use of personal data is governed by our{' '}
            <Link to="/privacy-policy" className="text-accent underline underline-offset-2">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link to="/data-handling" className="text-accent underline underline-offset-2">
              Data Handling page
            </Link>
            , which are incorporated into these Terms by reference.
          </p>
          <p>
            By using OAST, you confirm that you have obtained all necessary consents and given
            all required disclosures to third parties (including meeting participants) before
            recording or analysing their communications.
          </p>
        </Section>

        <Section title="8. Warranties and Disclaimers">
          <p>
            The Service is provided "as is" and "as available". To the fullest extent permitted by
            law, OAST disclaims all warranties, express or implied, including warranties of
            merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p>
            OAST does not warrant that: (a) the Service will be uninterrupted or error-free;
            (b) any AI-generated content, scoring, or coaching recommendations are accurate,
            complete, or fit for any specific purpose. AI outputs should be reviewed by a
            qualified human before being acted upon.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              OAST will not be liable for any indirect, incidental, special, consequential, or
              punitive damages, including loss of revenue, loss of data, or loss of goodwill.
            </li>
            <li>
              OAST's total aggregate liability to you for all claims arising out of or relating
              to the Service will not exceed the total fees paid by you to OAST in the 12 months
              immediately preceding the event giving rise to the claim.
            </li>
          </ul>
          <p>
            Nothing in these Terms limits liability for death or personal injury caused by
            negligence, fraud, or any other liability that cannot be excluded by law.
          </p>
        </Section>

        <Section title="10. Indemnification">
          <p>
            You agree to indemnify and hold harmless OAST, its officers, employees, and agents
            from any claims, damages, or expenses (including legal fees) arising from: (a) your
            use of the Service in violation of these Terms; (b) your violation of any applicable
            law; or (c) infringement of any third-party rights by your Customer Data.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of material changes
            via email or a notice within OAST at least 14 days before the changes take effect.
            Your continued use of the Service after the effective date constitutes acceptance of
            the revised Terms.
          </p>
        </Section>

        <Section title="12. Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of England and Wales. Any disputes arising from
            or in connection with these Terms will be subject to the exclusive jurisdiction of
            the courts of England and Wales.
          </p>
          <p>
            Before commencing legal proceedings, you agree to contact us at{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>{' '}
            to attempt to resolve the dispute informally within 30 days.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-border-default flex gap-8 text-sm text-text-muted">
          <Link to="/privacy-policy" className="hover:text-text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/data-handling" className="hover:text-text-primary transition-colors">
            Data Handling
          </Link>
          <Link to="/" className="hover:text-text-primary transition-colors">
            ← Back to OAST
          </Link>
        </div>
      </div>
    </div>
  );
}
