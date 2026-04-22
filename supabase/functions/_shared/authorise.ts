import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,      // org_rep
  team_lead: 1, // org_manager
  admin: 2,     // org_admin
};

interface AuthResult {
  role: string;
  orgId: string;
}

/**
 * Verify the caller has at least the minimum role within their org.
 * Uses the service-role client to bypass RLS for the profile lookup.
 *
 * Returns { role, orgId } on success.
 * Returns a 403 Response on failure — caller should return it directly.
 */
export async function requireRole(
  adminClient: SupabaseClient,
  userId: string,
  orgId: string,
  minimumRole: "user" | "team_lead" | "admin",
): Promise<AuthResult | Response> {
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("role, org_id")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return new Response(
      JSON.stringify({ error: "Forbidden: user profile not found" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (profile.org_id !== orgId) {
    return new Response(
      JSON.stringify({ error: "Forbidden: org mismatch" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const userLevel = ROLE_HIERARCHY[profile.role] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    return new Response(
      JSON.stringify({ error: "Forbidden: insufficient role" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return { role: profile.role, orgId: profile.org_id };
}

/**
 * Allow access if the user owns the resource OR has at least the minimum role.
 * Defence in depth: RLS is the backstop, this is the application-level check.
 */
export async function requireOwnerOrRole(
  adminClient: SupabaseClient,
  userId: string,
  orgId: string,
  resourceOwnerId: string,
  minimumRole: "user" | "team_lead" | "admin",
): Promise<AuthResult | Response> {
  if (userId === resourceOwnerId) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, org_id")
      .eq("id", userId)
      .single();

    return { role: profile?.role ?? "user", orgId };
  }

  return requireRole(adminClient, userId, orgId, minimumRole);
}

/**
 * Shorthand: require org_admin role.
 */
export async function requireAdmin(
  adminClient: SupabaseClient,
  userId: string,
  orgId: string,
): Promise<AuthResult | Response> {
  return requireRole(adminClient, userId, orgId, "admin");
}
