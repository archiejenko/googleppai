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
    // org_id needed to build new-format storage paths
    const orgId: string | undefined =
      user.app_metadata?.org_id ?? user.user_metadata?.org_id;

    // Service-role client for privileged operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Rate limit: 3 erasure requests/min burst, 10/day sustained — per user
    const { data: isAllowed, error: rateLimitError } = await serviceClient
      .rpc('check_rate_limit_hardened', {
        dimension_keys:           [`user:${userId}`],
        cost:                     1,
        burst_limit:              3,
        burst_window_seconds:     60,
        sustained_limit:          10,
        sustained_window_seconds: 86400,
      });
    if (rateLimitError) {
      console.error('[gdpr-erasure] rate limit check failed:', rateLimitError);
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const itemsDeleted: Record<string, number> = {};

    // 2. Collect and delete storage objects

    // Avatars: prefix = userId (e.g. avatars/uuid.jpg)
    const { data: avatarObjects } = await serviceClient.storage
      .from('avatars')
      .list(userId);
    if (avatarObjects && avatarObjects.length > 0) {
      const avatarPaths = avatarObjects.map((o) => `${userId}/${o.name}`);
      const { error: avatarRemoveError } = await serviceClient.storage.from('avatars').remove(avatarPaths);
      if (avatarRemoveError) throw new Error('Failed to delete avatar storage objects: ' + avatarRemoveError.message);
      itemsDeleted.avatars = avatarPaths.length;
    }

    // Pitch recordings: prefix = userId/
    const { data: pitchObjects } = await serviceClient.storage
      .from('pitch-recordings')
      .list(userId);
    if (pitchObjects && pitchObjects.length > 0) {
      const pitchPaths = pitchObjects.map((o) => `${userId}/${o.name}`);
      const { error: pitchRemoveError } = await serviceClient.storage.from('pitch-recordings').remove(pitchPaths);
      if (pitchRemoveError) throw new Error('Failed to delete pitch-recordings storage objects: ' + pitchRemoveError.message);
      itemsDeleted['pitch-recordings'] = pitchPaths.length;
    }

    // Session recordings: look up session IDs via DB, then delete storage objects.
    // Handles both the new org-prefixed path format ({org_id}/sessions/{id}.webm)
    // and the legacy format (sessions/{id}.webm) for recordings uploaded before
    // the Stage 3 storage policy migration.
    const { data: sessions } = await serviceClient
      .from('training_sessions')
      .select('id')
      .eq('user_id', userId);
    if (sessions && sessions.length > 0) {
      const legacyPaths = sessions.map((s: { id: string }) => `sessions/${s.id}.webm`);
      const newPaths = orgId
        ? sessions.map((s: { id: string }) => `${orgId}/sessions/${s.id}.webm`)
        : [];
      const allPaths = [...newPaths, ...legacyPaths];
      const { error: sessionRemoveError } = await serviceClient.storage.from('recordings').remove(allPaths);
      if (sessionRemoveError) throw new Error('Failed to delete session recordings storage objects: ' + sessionRemoveError.message);
      itemsDeleted['session-recordings'] = sessions.length;
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
      const { count, error: deleteError } = await serviceClient
        .from(table)
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      if (deleteError) throw new Error(`Failed to delete rows from ${table}: ${deleteError.message}`);
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

    const { error: auditError } = await serviceClient.from('erasure_audit_log').insert({
      user_id_hash: userIdHash,
      completed_at: completedAt,
      items_deleted: itemsDeleted,
      reference,
    });
    if (auditError) throw new Error('Failed to write erasure audit log: ' + auditError.message);

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
