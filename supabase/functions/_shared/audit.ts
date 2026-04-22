import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuditLogEntry {
  orgId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append one row to audit_log.
 * Uses the service-role client — never call with an anon client.
 *
 * This function NEVER throws. If the audit write fails, it logs the
 * error to stderr and returns silently. A failed audit write must
 * never break the user's operation.
 */
export async function logAudit(
  serviceClient: SupabaseClient,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    const { error } = await serviceClient
      .from("audit_log")
      .insert({
        org_id:        entry.orgId,
        user_id:       entry.userId ?? null,
        action:        entry.action,
        resource_type: entry.resourceType,
        resource_id:   entry.resourceId ?? null,
        metadata:      entry.metadata ?? {},
        ip_address:    entry.ipAddress ?? null,
        user_agent:    entry.userAgent ?? null,
      });

    if (error) {
      console.error("[audit] Failed to write audit log:", error.message, entry);
    }
  } catch (err) {
    console.error("[audit] Unexpected error writing audit log:", err, entry);
  }
}

/**
 * Extract client IP and user-agent from the incoming request.
 * Supabase edge functions run behind a proxy, so the real client IP
 * is in x-forwarded-for (first entry) or cf-connecting-ip.
 */
export function extractRequestContext(req: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : req.headers.get("cf-connecting-ip") ?? null;

  return {
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}
