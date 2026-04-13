import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuditEntry {
  actor_id?: string | null;   // auth.uid(); omit or null for system/webhook events
  actor_role?: string;        // 'admin', 'system', etc.
  action: string;             // e.g. 'delete_user', 'create_organisation', 'stripe.checkout.session.completed'
  target_type: string;        // 'user', 'organisation', 'subscription'
  target_id: string;          // UUID or Stripe ID
  metadata?: Record<string, unknown>;
}

/**
 * Append one row to admin_action_log.
 * Uses the service-role client — never call with an anon client.
 * Failures are logged to console but do NOT throw; the primary
 * operation should not be unwound because the audit write failed.
 */
export async function writeAuditLog(
  serviceClient: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await serviceClient
    .from("admin_action_log")
    .insert({
      actor_id:   entry.actor_id ?? null,
      actor_role: entry.actor_role ?? "system",
      action:     entry.action,
      target_type: entry.target_type,
      target_id:  entry.target_id,
      metadata:   entry.metadata ?? {},
    });

  if (error) {
    console.error("[auditLog] Failed to write audit entry:", error.message, entry);
  }
}
