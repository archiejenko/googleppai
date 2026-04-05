/**
 * OAST Next Step Detection Configuration — L7
 *
 * Canonical phrase list and date detection patterns.
 * UK-first: covers dd/mm formats, ordinal dates, UK relative terms.
 *
 * Single source of truth used by:
 *   - call-intelligence-scorer Edge Function (inlined — Deno can't import from src/)
 *   - useNextStepCommitmentRate hook
 *   - smoke tests
 */

// ── Next step trigger phrases ─────────────────────────────────────────────────

export const NEXT_STEP_PHRASES: string[] = [
  'so the next step is',
  "the next step is",
  "next step is",
  "let's schedule",
  "lets schedule",
  "i'll send over",
  "i will send over",
  "speak on",
  "i'll follow up",
  "i will follow up",
  "next we'll",
  "next we will",
  "shall we book",
  "let's book",
  "lets book",
  "i'll reach out",
  "i will reach out",
  "follow up on",
  "i'll send you",
  "i will send you",
  "book a",
  "schedule a",
]

/**
 * Detect whether a text block contains a next step commitment phrase.
 * Returns the matched phrase or null.
 */
export function detectNextStepPhrase(text: string): string | null {
  const lower = text.toLowerCase()
  for (const phrase of NEXT_STEP_PHRASES) {
    if (lower.includes(phrase)) return phrase
  }
  return null
}

// ── Date / timeframe detection (UK-first) ────────────────────────────────────

/**
 * Patterns that indicate a specific timeframe was mentioned.
 * UK-first: dd/mm, ordinal dates ("14th March"), UK day names.
 * Also covers US mm/dd and ISO yyyy-mm-dd as secondary.
 */
export const DATE_PATTERNS: RegExp[] = [
  // UK: dd/mm or dd/mm/yyyy
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,

  // Ordinal day + month: "14th March", "3rd of April", "1st June"
  /\b\d{1,2}(?:st|nd|rd|th)(?:\s+of)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,

  // Month + ordinal: "March 14th", "April 3rd"
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,

  // Specific day names
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

  // Relative: "tomorrow", "next week", "this Friday", "in two weeks", "end of week"
  /\b(?:tomorrow|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:week|friday|thursday|wednesday|tuesday|monday)|in\s+(?:a|one|two|three|a\s+couple\s+of)\s+(?:days?|weeks?|months?)|end\s+of\s+(?:the\s+)?week|end\s+of\s+(?:the\s+)?month)\b/i,

  // Numeric: "in 2 days", "in 3 weeks"
  /\bin\s+\d+\s+(?:days?|weeks?|months?)\b/i,

  // ISO date: yyyy-mm-dd
  /\b\d{4}-\d{2}-\d{2}\b/,
]

/**
 * Returns true if the text mentions a specific timeframe or date.
 */
export function hasDateMention(text: string): boolean {
  return DATE_PATTERNS.some(p => p.test(text))
}

// ── Commitment rate helpers ───────────────────────────────────────────────────

export const COMMITMENT_RATE_GREEN  = 85   // ≥ 85% → green
export const COMMITMENT_RATE_AMBER  = 60   // ≥ 60% → amber; < 60% → coral + coaching trigger
export const COACHING_TRIGGER_THRESHOLD = 60

/**
 * Compute commitment rate as a percentage (0–100).
 */
export function commitmentRate(confirmed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((confirmed / total) * 100)
}

/**
 * Trend direction: compare current vs previous period rate.
 */
export type TrendDirection = 'up' | 'down' | 'stable'

export function trendDirection(current: number, previous: number): TrendDirection {
  const delta = current - previous
  if (delta > 3) return 'up'
  if (delta < -3) return 'down'
  return 'stable'
}

export function commitmentRateColor(rate: number): string {
  if (rate >= COMMITMENT_RATE_GREEN) return '#10B981'
  if (rate >= COMMITMENT_RATE_AMBER) return '#F59E0B'
  return '#FF6B6B'
}
