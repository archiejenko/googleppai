/**
 * Shared CORS headers for all OAST Edge Functions.
 *
 * IMPORTANT: ALLOWED_ORIGIN must be set to https://app.oasthq.com in both
 * the Vercel dashboard (Environment Variables) and the Supabase dashboard
 * (Edge Function secrets) before deploying. Never default to '*'.
 *
 * getCorsHeaders reads ALLOWED_ORIGIN from Deno.env and throws a hard error
 * if the variable is absent — there is no wildcard fallback.
 */

export function getCorsHeaders(req: Request): Record<string, string> {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN')
  if (!allowedOrigin) {
    throw new Error(
      'ALLOWED_ORIGIN environment variable is not set. ' +
      'Set it to https://app.oasthq.com in both the Vercel and Supabase dashboards before deploying.',
    )
  }

  // Validate request origin against the allowlist.
  // Only reflect the origin back if it matches; browsers enforce the mismatch for unrecognised origins.
  const requestOrigin = req.headers.get('Origin') ?? ''
  const origin = requestOrigin === allowedOrigin ? allowedOrigin : allowedOrigin

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-keepwarm',
  }
}
