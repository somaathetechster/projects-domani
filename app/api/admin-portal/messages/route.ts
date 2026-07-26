import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { notifyProject } from "@/lib/notify";

// Admin messages appear in the same thread the client sees. sender_id refers
// to project_members, so admin messages use a per-project "Domani" staff
// member row, created on first send if absent.
async function ensureStaffMember(projectId: string, adminEmail: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("email", adminEmail)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabaseAdmin
    .from("project_members")
    .insert({ project_id: projectId, email: adminEmail, role: "domani_staff" })
    .select("id")
    .single();

  return created!.id;
}

// GET ?project_id=
export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, body, sender_id, created_at, project_members(email, role)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

// POST { project_id, body }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { project_id, body } = await req.json();
  if (!project_id || !body?.trim()) {
    return NextResponse.json({ error: "project_id and body are required" }, { status: 400 });
  }

  const senderId = await ensureStaffMember(project_id, auth.email);

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ project_id, sender_id: senderId, body: body.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyProject(project_id, "New message from Domani", body.trim().slice(0, 80), "/chat", senderId);
  return NextResponse.json({ message: data }, { status: 201 });
}
