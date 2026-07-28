import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin } from "@/lib/admin-auth";

// GET — list all platform admins (email + name + whether TOTP enrolled).
// Does NOT return secrets.
export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .select("id, email, name, totp_enabled, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data });
}

// POST { email, name? } — provision a new admin. They set their own password
// and authenticator on first login, just like the initial seed accounts.
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { email, name } = await req.json();
  if (!email?.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .insert({ email: email.trim().toLowerCase(), name: name?.trim() ?? null })
    .select("id, email, name, totp_enabled")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That email is already an admin" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ admin: data }, { status: 201 });
}

// DELETE ?id= — removes an admin and kills their sessions.
// An admin cannot delete themselves — always keep at least one admin.
export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Find the admin being removed to guard self-deletion.
  const { data: target } = await supabaseAdmin
    .from("platform_admins")
    .select("id, email")
    .eq("id", id)
    .single();

  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.email === auth.email) {
    return NextResponse.json({ error: "You cannot remove your own admin account" }, { status: 400 });
  }

  // Must leave at least one admin.
  const { count } = await supabaseAdmin
    .from("platform_admins")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: "Cannot remove the last admin account" }, { status: 400 });
  }

  await supabaseAdmin.from("admin_sessions").delete().eq("admin_id", id);
  await supabaseAdmin.from("platform_admins").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
