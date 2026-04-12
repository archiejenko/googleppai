import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Verify caller identity
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

    const userId = user.id;

    // Service-role client for privileged operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const itemsDeleted: Record<string, number> = {};

    // 2. Collect and delete storage objects

    // Avatars: prefix = userId (e.g. avatars/uuid.jpg)
    const { data: avatarObjects } = await serviceClient.storage
      .from('avatars')
      .list(userId);
    if (avatarObjects && avatarObjects.length > 0) {
      const avatarPaths = avatarObjects.map((o) => `${userId}/${o.name}`);
      await serviceClient.storage.from('avatars').remove(avatarPaths);
      itemsDeleted.avatars = avatarPaths.length;
    }

    // Pitch recordings: prefix = userId/
    const { data: pitchObjects } = await serviceClient.storage
      .from('pitch-recordings')
      .list(userId);
    if (pitchObjects && pitchObjects.length > 0) {
      const pitchPaths = pitchObjects.map((o) => `${userId}/${o.name}`);
      await serviceClient.storage.from('pitch-recordings').remove(pitchPaths);
      itemsDeleted['pitch-recordings'] = pitchPaths.length;
    }

    // Session recordings: look up session IDs via DB, then delete storage objects
    const { data: sessions } = await serviceClient
      .from('training_sessions')
      .select('id')
      .eq('user_id', userId);
    if (sessions && sessions.length > 0) {
      const sessionPaths = sessions.map((s: { id: string }) => `sessions/${s.id}.webm`);
      await serviceClient.storage.from('recordings').remove(sessionPaths);
      itemsDeleted['session-recordings'] = sessionPaths.length;
    }

    // 3. Delete DB rows (order respects FK constraints)
    const tablesToDelete: string[] = [
      'call_consent_log',
      'dispatched_drills',
      'live_scores',
      'leaderboard_snapshots',
      'rep_correlation_snapshots',
      'deal_outcomes',
      'upgrade_requests',
      'pitches',
      'training_sessions',
      'prospect_profiles',
    ];

    for (const table of tablesToDelete) {
      const { count } = await serviceClient
        .from(table)
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      if (count) itemsDeleted[table] = count;
    }

    // 4. Write erasure audit record (hashed user ID — not PII)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(userId));
    const userIdHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const reference = `ERASURE-${userIdHash.slice(0, 16).toUpperCase()}-${Date.now()}`;
    const completedAt = new Date().toISOString();

    await serviceClient.from('erasure_audit_log').insert({
      user_id_hash: userIdHash,
      completed_at: completedAt,
      items_deleted: itemsDeleted,
      reference,
    });

    // 5. Delete the auth user (cascades to profiles via FK)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ reference, completed_at: completedAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: unknown) {
    console.error('[gdpr-erasure] unhandled error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
