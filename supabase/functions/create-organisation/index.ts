import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, companyName } = await req.json();
    if (!userId || !companyName) {
      return new Response(JSON.stringify({ error: 'userId and companyName are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to bypass RLS
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

    // Link profile to org
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ org_id: org.id })
      .eq('id', userId);

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ org_id: org.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
