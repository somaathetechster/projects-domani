import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";
import { hashValue, verifyHash } from "@/lib/auth";

// GET /api/settings — current member's preferences
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("project_members")
    .select("theme_preference, email, role, display_name")
    .eq("id", session.memberId)
    .single();

  return NextResponse.json({ settings: data });
}

// PATCH /api/settings — { theme_preference?, current_password?, new_password? }
export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.display_name !== undefined) {
    const name = String(body.display_name).trim().slice(0, 60);
    await supabaseAdmin
      .from("project_members")
      .update({ display_name: name || null })
      .eq("id", session.memberId);
  }

  if (body.theme_preference !== undefined) {
    if (!["light", "dark"].includes(body.theme_preference)) {
      return NextResponse.json({ error: "Invalid theme_preference" }, { status: 400 });
    }
    await supabaseAdmin
      .from("project_members")
      .update({ theme_preference: body.theme_preference })
      .eq("id", session.memberId);
  }

  if (body.new_password) {
    if (!body.current_password) {
      return NextResponse.json({ error: "current_password is required to change password" }, { status: 400 });
    }
    if (body.new_password.length < 10) {
      return NextResponse.json({ error: "New password must be at least 10 characters" }, { status: 400 });
    }

    const { data: member } = await supabaseAdmin
      .from("project_members")
      .select("password_hash")
      .eq("id", session.memberId)
      .single();

    const valid = member?.password_hash && (await verifyHash(body.current_password, member.password_hash));
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

    const newHash = await hashValue(body.new_password);
    await supabaseAdmin.from("project_members").update({ password_hash: newHash }).eq("id", session.memberId);
  }

  return NextResponse.json({ ok: true });
}
