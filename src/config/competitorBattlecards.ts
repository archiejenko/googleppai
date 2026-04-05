/**
 * Competitor Battlecards — R7
 * Hardcoded differentiator bullets per competitor.
 */

import type { Competitor } from './competitors'

export const COMPETITOR_BATTLECARDS: Record<Competitor, string[]> = {
  Gong: [
    'OAST focuses on skill transfer, not just call recording — training impact is measurable.',
    'Our Transfer Gap metric shows exactly where learning stops converting to revenue.',
    'No per-seat recording costs — pricing is pure skill outcome, not data storage.',
  ],
  Chorus: [
    'OAST delivers live coaching triggers in real time, not just post-call review.',
    'Built-in MEDDIC scoring and deal risk intelligence — Chorus requires integrations for this.',
    'Nordic Brutalism UX designed for rep adoption — no onboarding fatigue.',
  ],
  Salesloft: [
    'OAST is skill-first, not sequence-first — we fix the quality of each touch, not just the cadence.',
    'Revenue Intelligence layer connects training gaps directly to deal outcomes.',
    'No separate coaching module needed — everything is unified in one platform.',
  ],
  Outreach: [
    'OAST measures training ROI directly against pipeline conversion, Outreach does not.',
    'Live call pacing, objection scoring, and buying signal capitalisation — all native.',
    'Simpler pricing model: per-user skill tiers, not per-feature module stacking.',
  ],
  Mindtickle: [
    'OAST is lighter to deploy — no LMS overhead, no content library required to start.',
    'Real-time live call intelligence bridges training and execution in one platform.',
    'Transfer Gap analytics show which specific skills aren\'t converting — not just readiness scores.',
  ],
  Allego: [
    'OAST goes beyond video roleplay — live call intelligence connects training to live deals.',
    'Deal-level MEDDIC and risk scoring gives sales managers deal-specific coaching context.',
    'Faster time-to-value: most teams are live within a week with no video production required.',
  ],
  Jiminny: [
    'OAST adds structured skill frameworks (MEDDIC, AER) on top of call recording.',
    'Revenue Intelligence layer — deal risk, pipeline stage conversion, win/loss — is built in.',
    'Training and call analysis are unified; Jiminny requires external LMS integration.',
  ],
  Oliv: [
    'OAST covers the full rep journey — from skill training through live calls to deal intelligence.',
    'Transfer Gap analytics are unique: no other tool measures training-to-revenue conversion.',
    'Established security compliance and enterprise RLS — Oliv is earlier stage.',
  ],
}
