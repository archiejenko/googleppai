/**
 * OAST Filler Word Configuration — L4
 *
 * Canonical list of filler words/phrases detected in rep speech.
 * Pure regex — no OpenAI call needed for filler detection.
 *
 * Each entry has:
 *   key    — canonical identifier used in filler_words_breakdown JSON
 *   label  — human-readable label for UI display
 *   pattern — regex to match in transcript text (case-insensitive)
 *
 * "like", "actually", "right", "so" are contextual fillers — the patterns
 * are scoped to catch filler usage specifically (e.g. sentence-initial "so",
 * "right?" at sentence end) rather than all occurrences.
 */

export interface FillerWordConfig {
  key:     string;
  label:   string;
  pattern: RegExp;
}

export const FILLER_WORDS: FillerWordConfig[] = [
  { key: 'um',         label: 'Um',         pattern: /\bum\b/gi },
  { key: 'uh',         label: 'Uh',         pattern: /\buh\b/gi },
  { key: 'like',       label: 'Like',       pattern: /\blike\b(?!\s+(?:to|that|this|it|when|how|what|who|which|a|an|the)\b)/gi },
  { key: 'you_know',   label: 'You know',   pattern: /\byou know\b/gi },
  { key: 'basically',  label: 'Basically',  pattern: /\bbasically\b/gi },
  { key: 'actually',   label: 'Actually',   pattern: /\bactually\b/gi },
  { key: 'sort_of',    label: 'Sort of',    pattern: /\bsort of\b/gi },
  { key: 'kind_of',    label: 'Kind of',    pattern: /\bkind of\b/gi },
  { key: 'right',      label: 'Right?',     pattern: /\bright\?/gi },
  { key: 'so',         label: 'So (opener)',pattern: /(?:^|[.!?]\s+)so\b/gi },
]

export const FILLER_RATE_WARNING  = 4   // triggers coaching_trigger at warning severity
export const FILLER_RATE_CRITICAL = 6   // triggers coaching_trigger at critical severity
export const FILLER_RATE_TARGET   = 2   // green threshold on trend chart

/**
 * Count filler occurrences in a block of rep speech text.
 * Returns a breakdown map { key → count } and the total count.
 */
export function countFillers(repText: string): {
  breakdown: Record<string, number>;
  total:     number;
} {
  const breakdown: Record<string, number> = {}
  let total = 0

  for (const { key, pattern } of FILLER_WORDS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0
    const matches = repText.match(pattern)
    const count   = matches?.length ?? 0
    if (count > 0) {
      breakdown[key] = count
      total += count
    }
  }

  return { breakdown, total }
}

/**
 * Compute filler rate per minute given total count and call duration in seconds.
 */
export function fillerRatePerMin(totalCount: number, durationSecs: number): number {
  if (durationSecs <= 0) return 0
  return Math.round((totalCount / (durationSecs / 60)) * 100) / 100
}

/**
 * Return the top N filler words by count, sorted descending.
 */
export function topFillers(
  breakdown: Record<string, number>,
  n = 3,
): { key: string; label: string; count: number }[] {
  return Object.entries(breakdown)
    .map(([key, count]) => ({
      key,
      label: FILLER_WORDS.find(f => f.key === key)?.label ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}
