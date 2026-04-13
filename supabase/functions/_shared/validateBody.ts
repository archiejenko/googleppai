/**
 * Shared request body validation for OAST Edge Functions.
 *
 * Usage:
 *   const rawBody = await req.json().catch(() => null);
 *   const v = validateBody<{ sessionId: string; message: string }>(rawBody, {
 *     sessionId: { type: 'string', required: true },
 *     message:   { type: 'string', required: true },
 *   });
 *   if (!v.ok) return new Response(JSON.stringify({ error: v.error }), {
 *     status: v.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 *   });
 *   const { sessionId, message } = v.body;
 *
 * Only required fields trigger a failure. Optional fields present in the body
 * are type-checked; absent optional fields pass through silently. Fields not
 * listed in the schema are passed through unchanged — intentional so action-
 * specific fields can be accessed via v.body without being over-constrained.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface FieldRule {
  /** Expected JavaScript type. Use 'array' for arrays (avoids typeof [] === 'object'). */
  type: FieldType;
  /** If true, a null/undefined value triggers a 400. Default: false. */
  required?: boolean;
}

export type BodySchema = Record<string, FieldRule>;

export type ValidationOk<T extends Record<string, unknown>> = {
  ok: true;
  body: T;
};

export type ValidationFail = {
  ok: false;
  status: 400;
  error: string;
};

export type ValidationResult<T extends Record<string, unknown>> =
  | ValidationOk<T>
  | ValidationFail;

/**
 * Validate a pre-parsed request body against a schema.
 * Returns { ok: true, body } on success or { ok: false, status: 400, error } on failure.
 * The caller constructs and returns the HTTP response.
 */
export function validateBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: BodySchema,
): ValidationResult<T> {
  if (
    body === null ||
    body === undefined ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    return { ok: false, status: 400, error: 'Invalid request body' };
  }

  const parsed = body as Record<string, unknown>;

  for (const [field, rule] of Object.entries(schema)) {
    const value = parsed[field];
    const absent = value === undefined || value === null;

    if (absent) {
      if (rule.required) {
        return { ok: false, status: 400, error: `Missing required field: ${field}` };
      }
      continue;
    }

    const valid =
      rule.type === 'array' ? Array.isArray(value) : typeof value === rule.type;

    if (!valid) {
      return {
        ok: false,
        status: 400,
        error: `Invalid field: ${field} must be a ${rule.type}`,
      };
    }
  }

  return { ok: true, body: parsed as T };
}
