import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateBody } from '../_shared/validateBody.ts';

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (Deno.env.get('SUPABASE_ANON_KEY') ?? 'salt'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Rate limit: 3 demo requests/min burst, 20/hr sustained — per IP (no auth on this endpoint)
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const ipHash = await hashIp(rawIp);
    const { data: isAllowed, error: rateLimitError } = await supabase
      .rpc('check_rate_limit_hardened', {
        dimension_keys:           [`ip:${ipHash}`],
        cost:                     1,
        burst_limit:              3,
        burst_window_seconds:     60,
        sustained_limit:          20,
        sustained_window_seconds: 3600,
      });
    if (rateLimitError) {
      console.error('[deployment-request] rate limit check failed:', rateLimitError);
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => null);
    const v = validateBody<{ name: string; email: string; company?: string; industry?: string; message?: string; request_type?: string }>(rawBody, {
      name:         { type: 'string', required: true },
      email:        { type: 'string', required: true },
      company:      { type: 'string' },
      industry:     { type: 'string' },
      message:      { type: 'string' },
      request_type: { type: 'string' },
    });
    if (!v.ok) return new Response(JSON.stringify({ error: v.error }), {
      status: v.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    const { name, company, email, industry, message, request_type } = v.body;

    const { error } = await supabase.from('deployment_requests').insert({
      name,
      company: company || '',
      email,
      industry: industry || null,
      message: message || null,
      request_type: request_type || 'demo',
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('[deployment-request] unhandled error:', err);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
