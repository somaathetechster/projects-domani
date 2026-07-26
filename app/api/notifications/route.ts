import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// GET /api/notifications — newest first, unread flag included
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id, title, body, link_path, read_at, created_at")
    .eq("member_id", session.memberId)
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return NextResponse.json({ notifications: data ?? [], unread });
}

// PATCH /api/notifications — { id } marks one read; { all: true } marks all
export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const now = new Date().toISOString();

  if (body.all) {
    await supabaseAdmin
      .from("notifications")
      .update({ read_at: now })
      .eq("member_id", session.memberId)
      .is("read_at", null);
  } else if (body.id) {
    await supabaseAdmin
      .from("notifications")
      .update({ read_at: now })
      .eq("id", body.id)
      .eq("member_id", session.memberId);
  }
  return NextResponse.json({ ok: true });
}
