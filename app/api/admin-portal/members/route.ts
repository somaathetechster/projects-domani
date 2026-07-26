import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";

// POST /api/admin-portal/members — { project_id, email, role }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { project_id, email, role } = await req.json();
  if (!project_id || !email?.includes("@")) {
    return NextResponse.json({ error: "project_id and a valid email are required" }, { status: 400 });
  }
  if (role && !["client", "domani_staff"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("project_members")
    .insert({
      project_id,
      email: email.trim().toLowerCase(),
      role: role ?? "client",
    })
    .select("id, email, role")
    .single();

  if (error) {
    // Unique violation on (project_id, email) is the common case here.
    if (error.code === "23505") {
      return NextResponse.json({ error: "That email already has access." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(project_id, "member_added", `Access granted to ${data.email}`, auth.name ?? "Domani");
  return NextResponse.json({ member: data }, { status: 201 });
}

// DELETE /api/admin-portal/members?id=...
export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("project_id, email")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("project_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revoking access must also kill live sessions, or the removed member keeps
  // working until their token happens to expire.
  await supabaseAdmin.from("sessions").delete().eq("member_id", id);

  if (member) {
    await logActivity(member.project_id, "member_removed", `Access revoked for ${member.email}`, auth.name ?? "Domani");
  }
  return NextResponse.json({ ok: true });
}
