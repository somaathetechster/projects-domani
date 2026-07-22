import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/auth";

export type AuthedSession = {
  memberId: string;
  projectId: string;
  role: "client" | "domani_staff";
  email: string;
};

// Reads "Authorization: Bearer <token>", resolves it to an active session.
// Returns null if missing/expired/invalid — callers must handle that as 401.
export async function getSession(req: NextRequest): Promise<AuthedSession | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("member_id, project_id, expires_at")
    .eq("token_hash", hashToken(token))
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("id, role, email")
    .eq("id", session.member_id)
    .single();

  if (!member) return null;

  // Touch last_seen_at, fire-and-forget — not worth blocking the request on.
  supabaseAdmin
    .from("sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .then(() => {});

  return {
    memberId: member.id,
    projectId: session.project_id,
    role: member.role,
    email: member.email,
  };
}

// Guard used at the top of every Phase 2 route. A session's project_id is the
// hard boundary — it is never trusted from the request body, only from the
// verified session, so a token issued for Infinitswap can never touch
// Nutrition Bay's data even if the client tampers with request payloads.
export function assertSameProject(session: AuthedSession, requestedProjectId: string): boolean {
  return session.projectId === requestedProjectId;
}