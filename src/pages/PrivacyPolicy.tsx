import { Link } from 'react-router-dom';

// ─── PLACEHOLDERS — fill these before publishing ──────────────────────────────
// [COMPANY_LEGAL_NAME]      — your registered company name (e.g. "EJTECH Ltd")
// [ICO_REGISTRATION_NUMBER] — your ICO registration number (register at ico.org.uk)
// [DPO_EMAIL]               — data subject requests email (e.g. "dpo@oast.app")
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

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border border-border-default">
        <thead>
          <tr className="bg-bg-raised">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2 text-text-primary border-b border-border-default text-xs tracking-widest"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600 }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-default last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-text-secondary align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-text-muted" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            OAST is operated by <strong>[COMPANY_LEGAL_NAME]</strong>, a company registered in England
            and Wales. We are registered with the Information Commissioner's Office (ICO) under
            registration number <strong>[ICO_REGISTRATION_NUMBER]</strong>.
          </p>
          <p>
            We are the data controller for the personal data described in this policy. If you have
            questions about how we handle your data, contact us at{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>.
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p>We collect personal data in the following contexts:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account registration:</strong> email address, name, company name, job role,
              and team size when you create an account or submit a demo request.
            </li>
            <li>
              <strong>Usage data:</strong> pages visited, features used, session duration, and
              events within the platform, collected via PostHog analytics.
            </li>
            <li>
              <strong>Call recordings:</strong> audio and video of sales calls processed through
              OAST's meeting intelligence features, via Deepgram (speech-to-text) and Recall.ai
              (meeting bot). These recordings are processed only where your organisation has
              configured consent disclosure to meeting participants.
            </li>
            <li>
              <strong>Payment information:</strong> billing address, payment method details processed
              by Stripe. We do not store raw card data.
            </li>
            <li>
              <strong>Communications:</strong> content of demo enquiry messages you send to us.
            </li>
          </ul>
        </Section>

        <Section title="3. Lawful Basis for Processing">
          <Table
            headers={['Purpose', 'Data', 'Lawful Basis']}
            rows={[
              ['Account creation and authentication', 'Email, name, role', 'Contract performance (Art. 6(1)(b))'],
              ['Platform analytics and product improvement', 'Usage events, page views', 'Legitimate interests (Art. 6(1)(f))'],
              ['Demo enquiry handling', 'Name, email, company, message', 'Legitimate interests (Art. 6(1)(f))'],
              ['Call recording and analysis', 'Audio, video, transcripts', 'Legitimate interests + in-meeting consent disclosure'],
              ['Payment processing and billing', 'Billing details', 'Contract performance (Art. 6(1)(b))'],
              ['Legal obligations', 'As required', 'Legal obligation (Art. 6(1)(c))'],
            ]}
          />
          <p>
            Where we rely on legitimate interests, you have the right to object to that processing.
            See Section 7 for how to exercise your rights.
          </p>
        </Section>

        <Section title="4. Data Retention">
          <Table
            headers={['Data Type', 'Retention Period']}
            rows={[
              ['Account and profile data', 'Held while your account is active, then deleted within 30 days of account closure'],
              ['Usage analytics (PostHog)', '12 months rolling'],
              ['Call recordings and transcripts', 'Per your organisation\'s contract terms; default 90 days'],
              ['Demo enquiry messages', '24 months from submission'],
              ['Payment records', '7 years (UK HMRC requirement)'],
            ]}
          />
        </Section>

        <Section title="5. Sub-Processors">
          <p>
            We share your data with the following third-party processors. Full details, including
            transfer safeguards and certifications, are available on our{' '}
            <Link to="/data-handling" className="text-accent underline underline-offset-2">
              Data Handling page
            </Link>.
          </p>
          <Table
            headers={['Processor', 'Purpose', 'Location']}
            rows={[
              ['Supabase (AWS eu-west-1)', 'Database, authentication, file storage', 'EU (Ireland)'],
              ['OpenAI', 'AI analysis of call transcripts and coaching content', 'US (SCCs in place)'],
              ['Stripe', 'Payment processing', 'US/EU (PCI DSS Level 1)'],
              ['Deepgram', 'Speech-to-text transcription of call recordings', 'US (SCCs in place)'],
              ['Recall.ai', 'Meeting bot for call capture', 'US (SCCs in place)'],
              ['PostHog', 'Product analytics', 'EU (eu.i.posthog.com)'],
            ]}
          />
          <p>
            We do not sell your personal data to third parties. Sub-processors are bound by data
            processing agreements and are only permitted to process data on our instruction.
          </p>
        </Section>

        <Section title="6. Data Transfers Outside the UK/EEA">
          <p>
            Some of our sub-processors operate in the United States. Where data is transferred
            outside the UK or EEA, we rely on Standard Contractual Clauses (SCCs) approved by the
            UK Information Commissioner to ensure an adequate level of protection.
          </p>
          <p>
            PostHog analytics data is processed exclusively on PostHog's EU endpoint
            (eu.i.posthog.com) and does not leave the EEA.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>Under UK GDPR you have the right to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Access:</strong> request a copy of personal data we hold about you.</li>
            <li><strong>Rectification:</strong> ask us to correct inaccurate or incomplete data.</li>
            <li>
              <strong>Erasure ("right to be forgotten"):</strong> request deletion of your personal
              data where there is no compelling reason for us to continue processing it.
            </li>
            <li>
              <strong>Restriction:</strong> ask us to restrict processing of your data in certain
              circumstances.
            </li>
            <li>
              <strong>Portability:</strong> receive your data in a structured, machine-readable
              format where processing is based on consent or contract.
            </li>
            <li>
              <strong>Objection:</strong> object to processing based on legitimate interests. We
              will stop processing unless we can demonstrate compelling legitimate grounds.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>. We will respond within 30 days.
          </p>
        </Section>

        <Section title="8. Cookies and Analytics">
          <p>
            We use PostHog for product analytics. PostHog cookies are only set after you accept our
            cookie notice. You may decline analytics cookies without affecting your ability to use
            OAST. Your cookie preference is stored in your browser's localStorage and can be changed
            at any time by clearing your site data.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            We implement appropriate technical and organisational measures to protect your personal
            data, including encryption in transit (TLS), encryption at rest (Supabase/AWS), access
            controls, and regular security reviews.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes via email or a prominent notice within OAST. The "Last updated" date at the top
            of this page indicates when the policy was last revised.
          </p>
        </Section>

        <Section title="11. Contact and Complaints">
          <p>
            For privacy-related queries, contact us at{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>.
          </p>
          <p>
            If you are not satisfied with our response, you have the right to lodge a complaint with
            the UK Information Commissioner's Office (ICO):{' '}
            <a
              href="https://ico.org.uk/make-a-complaint"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              ico.org.uk/make-a-complaint
            </a>{' '}
            · 0303 123 1113.
          </p>
          <p>
            <strong>Governing law:</strong> This policy is governed by the laws of England and
            Wales. Disputes are subject to the exclusive jurisdiction of the courts of England.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-border-default flex gap-8 text-sm text-text-muted">
          <Link to="/terms-of-service" className="hover:text-text-primary transition-colors">
            Terms of Service
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
