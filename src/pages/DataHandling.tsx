import { Link } from 'react-router-dom';

// ─── PLACEHOLDERS — fill these before publishing ──────────────────────────────
// [DPO_EMAIL] — data subject requests / DPA contact email
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

export default function DataHandling() {
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
            Data Handling
          </h1>
          <p className="text-sm text-text-muted" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Last updated: {LAST_UPDATED}
          </p>
          <p className="text-sm text-text-secondary mt-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            This page provides technical detail on how OAST processes, stores, and transfers your
            data. It supplements our{' '}
            <Link to="/privacy-policy" className="text-accent underline underline-offset-2">
              Privacy Policy
            </Link>.
          </p>
        </div>

        <Section title="1. Sub-Processors">
          <p>
            OAST uses the following third-party sub-processors to deliver the Service. All
            sub-processors are bound by data processing agreements and may only process data on
            our documented instructions.
          </p>
          <Table
            headers={['Sub-Processor', 'Purpose', 'Location', 'Certifications / Safeguards']}
            rows={[
              [
                'Supabase (AWS eu-west-1)',
                'Primary database, user authentication, and file storage',
                'EU — Ireland (AWS eu-west-1)',
                'SOC 2 Type II, ISO 27001 (AWS). Data does not leave the EU.',
              ],
              [
                'OpenAI',
                'AI analysis of call transcripts, coaching recommendations, and deal intelligence',
                'US',
                'UK/EU SCCs in place. OpenAI API data is not used to train models by default under the API terms of service.',
              ],
              [
                'Stripe',
                'Payment processing, subscription management, invoicing',
                'US / EU',
                'PCI DSS Level 1. UK/EU SCCs in place.',
              ],
              [
                'Deepgram',
                'Speech-to-text transcription of call recordings',
                'US',
                'SOC 2 Type II. UK/EU SCCs in place.',
              ],
              [
                'Recall.ai',
                'Meeting bot for automated call capture across Zoom, Meet, and Teams',
                'US',
                'UK/EU SCCs in place.',
              ],
              [
                'PostHog',
                'Product analytics — page views, feature usage, session events',
                'EU (eu.i.posthog.com)',
                'Data is processed exclusively on the EU endpoint. No US transfer.',
              ],
            ]}
          />
          <p>
            We review our sub-processor list regularly. Enterprise customers on a DPA will be
            notified of material changes to sub-processors with at least 30 days' notice.
          </p>
        </Section>

        <Section title="2. Data Residency">
          <p>
            Our primary data residency is the European Union (AWS eu-west-1, Dublin). We prefer
            EU-based processing wherever operationally feasible.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Database and auth:</strong> Supabase on AWS eu-west-1 — data stays in
              the EU/EEA.
            </li>
            <li>
              <strong>Analytics:</strong> PostHog EU endpoint only — data stays in the EU/EEA.
            </li>
            <li>
              <strong>AI processing:</strong> OpenAI operates from the US. Call transcript data
              is transferred under Standard Contractual Clauses (SCCs). We use OpenAI's Zero
              Data Retention option where available for sensitive content.
            </li>
            <li>
              <strong>Call transcription:</strong> Deepgram operates from the US. Audio data
              sent to Deepgram is transferred under SCCs and is not retained by Deepgram beyond
              the transcription session.
            </li>
            <li>
              <strong>Meeting capture:</strong> Recall.ai operates from the US. Meeting bot
              data is transferred under SCCs.
            </li>
          </ul>
        </Section>

        <Section title="3. Data Retention Policy">
          <Table
            headers={['Data Type', 'Storage Location', 'Retention Period', 'Deletion Method']}
            rows={[
              [
                'User profiles and account data',
                'Supabase (EU)',
                'Active lifetime + 30 days after account closure',
                'Cascade delete from auth.users',
              ],
              [
                'Call recordings (audio/video)',
                'Supabase Storage (EU)',
                'Default: 90 days. Enterprise contracts may set custom retention.',
                'Automated purge job; manual deletion available on request',
              ],
              [
                'Call transcripts',
                'Supabase (EU)',
                'Default: 90 days.',
                'Deleted with associated recording',
              ],
              [
                'AI coaching outputs and scores',
                'Supabase (EU)',
                'Same as account data lifetime',
                'Deleted with user account',
              ],
              [
                'Product analytics events',
                'PostHog EU',
                '12 months rolling',
                'Automatic expiry in PostHog',
              ],
              [
                'Payment records',
                'Stripe',
                '7 years (UK HMRC requirement)',
                'Per Stripe data retention policy',
              ],
              [
                'Demo enquiry messages',
                'Supabase (EU)',
                '24 months',
                'Manual deletion on request',
              ],
            ]}
          />
        </Section>

        <Section title="4. Security Measures">
          <p>OAST implements the following technical and organisational security measures:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Encryption in transit:</strong> All data is transmitted over TLS 1.2 or higher.</li>
            <li><strong>Encryption at rest:</strong> Data is encrypted at rest in Supabase/AWS using AES-256.</li>
            <li><strong>Access control:</strong> Role-based access control (RBAC) at the application layer. Supabase Row-Level Security (RLS) policies enforce data isolation between organisations.</li>
            <li><strong>Authentication:</strong> Supabase Auth with JWT tokens. Sessions expire automatically.</li>
            <li><strong>Penetration testing:</strong> Periodic security reviews. Contact us for our latest assessment.</li>
          </ul>
        </Section>

        <Section title="5. Data Processing Agreement">
          <p>
            Enterprise customers may require a Data Processing Agreement (DPA) for compliance
            purposes. A standard DPA is available on request.
          </p>
          <p>
            To request a DPA, email{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>{' '}
            with the subject line "DPA Request".
          </p>
        </Section>

        <Section title="6. Contact">
          <p>
            For questions about data handling, sub-processors, or to request a DPA, contact:{' '}
            <a href="mailto:[DPO_EMAIL]" className="text-accent underline underline-offset-2">
              [DPO_EMAIL]
            </a>
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-border-default flex gap-8 text-sm text-text-muted">
          <Link to="/privacy-policy" className="hover:text-text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="hover:text-text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/" className="hover:text-text-primary transition-colors">
            ← Back to OAST
          </Link>
        </div>
      </div>
    </div>
  );
}
