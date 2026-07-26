import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/auth";

export type AdminSession = { adminId: string; email: string; name: string | null };

// Resolves an admin bearer token. Reads ONLY from admin_sessions — a client
// project session token can never satisfy this, and vice versa. The two
// session systems share no table and no lookup path by design.
export async function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const { data: session } = await supabaseAdmin
    .from("admin_sessions")
    .select("admin_id, expires_at")
    .eq("token_hash", hashToken(token))
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id, email, name")
    .eq("id", session.admin_id)
    .single();

  if (!admin) return null;
  return { adminId: admin.id, email: admin.email, name: admin.name };
}

// Guard for every /api/admin-portal route.
export async function requirePlatformAdmin(req: NextRequest): Promise<AdminSession | NextResponse> {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

// Every admin mutation writes an activity row so the client-facing feed and
// the audit trail stay truthful without each route remembering to do it ad hoc.
export async function logActivity(
  projectId: string,
  eventType: string,
  summary: string,
  actorLabel = "Domani"
) {
  await supabaseAdmin.from("activity_events").insert({
    project_id: projectId,
    actor_label: actorLabel,
    event_type: eventType,
    summary,
  });
}
