/**
 * Sanitization helpers for DB-derived values interpolated into AI system prompts.
 *
 * `target_persona`, `scenario`, and `pitch_goal` are AI-generated free-text
 * fields stored in training_sessions. They cannot be validated against an enum,
 * but must be stripped of prompt-injection control sequences before being
 * spliced into a system instruction.
 *
 * `difficulty` is a constrained column (easy / medium / hard) and is validated
 * against an explicit allowlist; any other value falls back to 'medium'.
 */

/** Allowed values for the `difficulty` column in training_sessions. */
export const DIFFICULTY_VALUES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = typeof DIFFICULTY_VALUES[number];

/**
 * Strip characters commonly used to break role-play context and inject new
 * instructions into an LLM system prompt:
 *   - Newlines / carriage returns → collapsed to a single space
 *   - Markdown headers (##, ###) → removed
 *   - XML / HTML-like tags (<tag>, </tag>) → removed
 *   - Model turn delimiters (<| and |>, used by some models) → removed
 *   - Horizontal rules (---) → removed
 *   - Literal role keywords (SYSTEM:, ASSISTANT:, USER:) → removed
 *
 * The result is then trimmed and capped at maxLength characters.
 * Returns an empty string for null / undefined input.
 */
export function sanitizeTextField(
  value: string | null | undefined,
  maxLength: number,
): string {
  if (!value) return '';
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/#{2,}/g, '')
    .replace(/<[^>]{0,80}>/g, '')
    .replace(/<\|/g, '').replace(/\|>/g, '')
    .replace(/-{3,}/g, '')
    .replace(/SYSTEM:/gi, '').replace(/ASSISTANT:/gi, '').replace(/USER:/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a difficulty value against the allowed enum.
 * Returns the value if valid, otherwise returns the fallback ('medium').
 */
export function validateDifficulty(
  value: string | null | undefined,
  fallback: Difficulty = 'medium',
): Difficulty {
  if (value && (DIFFICULTY_VALUES as readonly string[]).includes(value)) {
    return value as Difficulty;
  }
  return fallback;
}
