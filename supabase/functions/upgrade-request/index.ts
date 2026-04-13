import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateBody } from '../_shared/validateBody.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    ).auth.getUser(authHeader.replace('Bearer ', ''));

    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Extract org_id from JWT — fall back to profiles lookup
    let org_id: string | undefined =
      user.user_metadata?.org_id ?? user.app_metadata?.org_id

    if (!org_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()
      org_id = profile?.org_id
    }

    if (!org_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: no org_id resolved for user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: 5 upgrade requests/min burst, 10/hr sustained — per user
    const { data: isAllowed, error: rateLimitError } = await supabase
      .rpc('check_rate_limit_hardened', {
        dimension_keys:           [`user:${user.id}`],
        cost:                     1,
        burst_limit:              5,
        burst_window_seconds:     60,
        sustained_limit:          10,
        sustained_window_seconds: 3600,
      });
    if (rateLimitError) {
      console.error('[upgrade-request] rate limit check failed:', rateLimitError);
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => null);
    const v = validateBody<{ requested_tier?: string; message?: string; seats?: number }>(rawBody, {
      requested_tier: { type: 'string' },
      message:        { type: 'string' },
      seats:          { type: 'number' },
    });
    if (!v.ok) return new Response(JSON.stringify({ error: v.error }), {
      status: v.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    const { requested_tier, message, seats } = v.body;

    const { error } = await supabase.from('upgrade_requests').insert({
      user_id: user.id,
      org_id,
      requested_tier: requested_tier ?? 'revenue_intelligence',
      message: message ?? null,
      seats: seats ?? 1,
      status: 'pending',
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
