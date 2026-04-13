# Data Protection Documentation Audit — Sprint 1
**Date:** 2026-04-13  
**Auditor:** Automated security audit (read-only)  
**Status:** FINDINGS ONLY — awaiting remediation approval

---

## 1. Data Protection Artifacts

| Artifact | Status | Location / Notes |
|---|---|---|
| Privacy policy | EXISTS — INCOMPLETE | `src/pages/PrivacyPolicy.tsx` — contains unfilled placeholders: `[COMPANY_LEGAL_NAME]`, `[ICO_REGISTRATION_NUMBER]`, `[DPO_EMAIL]`. **Blocking** — must be completed before any customer-facing deployment. |
| Customer DPA template | MISSING | No file in repo. Required under GDPR Article 28 for any customer who is a data processor. Noted as "Pending — required before pilot" in `docs/SECURITY_ARCHITECTURE.md` (Section 7). |
| Record of Processing Activities (ROPA) | MISSING | Explicitly noted as "not yet created" in `docs/SECURITY_ARCHITECTURE.md:263-269`. Required under GDPR Article 30 for all organisations with 250+ employees, or whose processing carries risk. Automated employee performance scoring qualifies. |
| DPIA for AI employee performance analysis | MISSING | No formal DPIA document exists. `docs/SECURITY_ARCHITECTURE.md` contains a risk narrative but this does not constitute a formal Data Protection Impact Assessment as required by GDPR Article 35. Automated scoring of employee performance is a high-risk processing activity requiring a DPIA before processing begins. |
| Sub-processor list | EXISTS — not standalone | Documented in `docs/SECURITY_ARCHITECTURE.md:194-207`. Not filed as a separate, customer-distributable artifact. Must be extracted as a standalone document. |
| Data retention policy | EXISTS — not standalone | Defined in `docs/SECURITY_ARCHITECTURE.md:57-71`. Default: 90 days active data; enterprise: configurable. Must be extracted as a standalone artifact for customer contracts. |
| Data deletion / right-to-erasure flow | EXISTS | `supabase/functions/gdpr-erasure/index.ts` — full implementation. SHA-256 hashed audit log in `erasure_audit_log`. Self-service deletion at `/account/delete`. Documented in `docs/SECURITY_ARCHITECTURE.md:236-243`. |

---

## 2. Sub-processor DPA Status

**Directory `docs/compliance/dpas/` does not exist.** No signed DPA files are stored in the repository.

| Sub-processor | Purpose | DPA Status | Blocking? |
|---|---|---|---|
| Supabase | Database, Auth, Storage | Confirmed available (dashboard) — **not filed in repo** | Yes — file copy required |
| Stripe | Payments, billing | Confirmed — **not filed in repo** | Yes — file copy required |
| Vercel | Hosting, Edge Functions | Confirmed — **not filed in repo** | Yes — file copy required |
| Anthropic | Claude AI (call-prep, deal-outcomes) | **PENDING — not signed** | Yes — required before pilot |
| OpenAI | GPT-4o mini (pitch-api, training-api, chat-ai, drill-generation, drill-analysis) | **PENDING — not signed** | Yes — required before pilot |
| Deepgram | Speech-to-text transcription | **PENDING — not signed** | Yes — required before pilot |
| PostHog | Product analytics | **PENDING — not signed** | Yes — required before pilot |
| Resend | Transactional email | **PENDING — not signed** | Yes — file/sign required |
| Recall.ai | Call recording integration | **PENDING — not signed** | Yes — file/sign required |
| Google | (OAuth, if used) | Not listed in arch doc — status unknown | Investigate |

**Source:** `docs/SECURITY_ARCHITECTURE.md:194-207`

---

## 3. Data Residency

**Supabase project region:** EU-West-1 (AWS Dublin, Ireland)  
**Confirmed in:** `docs/SECURITY_ARCHITECTURE.md:84`  
**CSP header in `vercel.json:13`:** references `rywcwxsohjnfalrpjhfk.supabase.co` (EU endpoint)  
**Vercel deployment region:** Not explicitly locked in `vercel.json` — defaults to Vercel's automatic routing. For EU data residency compliance, consider setting `regions: ["cdg1", "dub1", "fra1"]` in `vercel.json`.

---

## 4. Privacy Policy Gaps

**File:** `src/pages/PrivacyPolicy.tsx`

Unfilled placeholders identified (from `docs/SECURITY_ARCHITECTURE.md:329`):

| Placeholder | Required Content |
|---|---|
| `[COMPANY_LEGAL_NAME]` | Registered company name |
| `[ICO_REGISTRATION_NUMBER]` | UK ICO registration number (required for UK GDPR) |
| `[DPO_EMAIL]` | Data Protection Officer contact email |

The privacy policy text must accurately reflect actual data flows (Deepgram transcription, Anthropic AI analysis, automated scoring, data sharing with sub-processors). Until placeholders are filled and flows verified, the policy cannot be presented to data subjects.

---

## 5. ROPA — What It Must Contain

When created, the ROPA must document each processing activity with:
- Name and contact of the data controller (OAST)
- Purposes of the processing
- Categories of data subjects (employees of customer organisations)
- Categories of personal data (voice recordings, transcripts, performance scores, MEDDIC evaluations)
- Categories of recipients (sub-processors listed above)
- Third-country transfers (Anthropic/OpenAI — US-based; requires SCCs or adequacy basis)
- Data retention periods
- Technical and organisational security measures

---

## 6. DPIA — What It Must Cover

The DPIA for automated employee performance analysis must address:
- Nature of processing: real-time scoring of sales calls, AI-generated critique, leaderboard rankings
- Scope: all sales reps in customer organisations; systematic monitoring
- Context and purposes
- Necessity and proportionality
- Risks to rights and freedoms (employment decisions, performance management, potential bias in AI scoring)
- Measures to address risk (human oversight, right to object, explainability)
- Consultation with DPO if high residual risk remains

GDPR Article 35 requires a DPIA before processing begins for systematic monitoring of employees.

---

## 7. Finding Summary

| Severity | Count | Items |
|---|---|---|
| CRITICAL | 2 | ROPA missing; DPIA missing (processing high-risk data without either) |
| HIGH | 6 | DPAs not signed for Anthropic, OpenAI, Deepgram, PostHog, Resend, Recall.ai |
| MEDIUM | 3 | Privacy policy placeholders unfilled; sub-processor list not standalone; DPAs confirmed but not filed |
| LOW | 1 | Vercel deployment regions not locked to EU |

**Total findings: 12**
