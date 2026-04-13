import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { writeAuditLog } from '../_shared/auditLog.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify caller identity — never trust userId from request body
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { companyName } = await req.json();
    if (!companyName) {
      return new Response(JSON.stringify({ error: 'companyName is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to bypass RLS for org creation only
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create organisation with 14-day trial
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({
        name: companyName,
        tier: 'core',
        seats_licensed: 1,
        price_per_seat_gbp: 65.00,
        onboarding_fee_paid: false,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        weekly_target: 10,
      })
      .select('id')
      .single();

    if (orgError) throw orgError;

    // Link authenticated user's profile to the new org
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ org_id: org.id })
      .eq('id', user.id); // user.id from verified JWT, never from request body

    if (profileError) throw profileError;

    await writeAuditLog(supabase, {
      actor_id:    user.id,
      actor_role:  "user",
      action:      "create_organisation",
      target_type: "organisation",
      target_id:   org.id,
      metadata:    { company_name: companyName },
    });

    return new Response(JSON.stringify({ org_id: org.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[create-organisation] unhandled error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
