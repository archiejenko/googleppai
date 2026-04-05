/**
 * OAST Pacing Analysis Configuration — L8
 *
 * ─── SINGLE SOURCE OF TRUTH ───────────────────────────────────────────────────
 * `computePacingScore` is defined here and imported by tests and hooks.
 *
 * The Edge Function (call-intelligence-scorer/index.ts) INLINES this function
 * because Deno cannot import from src/. If the scoring formula changes,
 * update BOTH this file AND the inline copy in the Edge Function.
 * Mark any change with: // SYNC: pacing.ts computePacingScore
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── WPM thresholds ────────────────────────────────────────────────────────────

export const WPM_TOO_FAST  = 200   // > 200 wpm → too_fast flag
export const WPM_TOO_SLOW  = 100   // < 100 wpm → too_slow flag
export const WPM_OPT_LOW   = 120   // pacing score deduction boundary
export const WPM_OPT_HIGH  = 190   // pacing score deduction boundary
export const WPM_SHADE_LOW  = 140  // shaded "optimal zone" on chart (tighter visual range)
export const WPM_SHADE_HIGH = 170  // shaded "optimal zone" on chart

export const MIN_WORDS_PER_WINDOW = 5  // windows with fewer words are excluded from avg/score
export const WINDOW_DURATION_SECS = 30

export type PacingFlag = 'too_fast' | 'too_slow' | 'optimal'

// ── computePacingScore ─────────────────────────────────────────────────────────
// SYNC: call-intelligence-scorer/index.ts (inlined copy must match)

export interface PacingWindow {
  wpm:  number
  flag: PacingFlag
}

/**
 * Compute a 0–100 pacing score from an array of analysed windows.
 *
 * Formula:
 *   Start at 100.
 *   -2 per window outside 120–190 wpm range.
 *   -5 if overall avg > 200 or avg < 110.
 *   +5 bonus if population std dev > 20 (natural variation).
 *   Clamp to [0, 100].
 *
 * Returns null if no scored windows.
 */
export function computePacingScore(windows: PacingWindow[]): number | null {
  const scored = windows.filter(w => w.wpm > 0)
  if (!scored.length) return null

  const avg    = scored.reduce((s, w) => s + w.wpm, 0) / scored.length
  const stdDev = Math.sqrt(
    scored.reduce((s, w) => s + Math.pow(w.wpm - avg, 2), 0) / scored.length,
  )

  let score = 100

  // Deduct 2 per window outside 120–190 wpm
  for (const w of scored) {
    if (w.wpm < WPM_OPT_LOW || w.wpm > WPM_OPT_HIGH) score -= 2
  }

  // Deduct 5 if avg is outside healthy range
  if (avg > 200 || avg < 110) score -= 5

  // Bonus: natural variation rewards engagement
  if (stdDev > 20) score += 5

  return Math.min(100, Math.max(0, Math.round(score)))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function pacingFlag(wpm: number): PacingFlag {
  if (wpm > WPM_TOO_FAST) return 'too_fast'
  if (wpm < WPM_TOO_SLOW) return 'too_slow'
  return 'optimal'
}

export function pacingScoreColor(score: number | null): string {
  if (score === null) return '#6B7280'
  if (score >= 75) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#FF6B6B'
}

export function varianceLabel(stdDev: number | null): string {
  if (stdDev === null) return ''
  if (stdDev > 20) return 'Natural variation'
  if (stdDev < 10) return 'Monotone delivery'
  return 'Moderate variation'
}

export function flagColor(flag: PacingFlag | null): string {
  if (flag === 'too_fast') return '#FF6B6B'
  if (flag === 'too_slow') return '#6366F1'
  return '#10B981'
}
