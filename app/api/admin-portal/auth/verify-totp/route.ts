import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateSessionToken, hashToken, sessionExpiry } from "@/lib/auth";

// POST { email, code } — the sole issuer of admin sessions.
export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  const normalized = email.trim().toLowerCase();

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id, totp_secret, totp_enabled")
    .eq("email", normalized)
    .single();

  if (!admin?.totp_secret) {
    return NextResponse.json({ error: "Authenticator not set up." }, { status: 400 });
  }
  if (!authenticator.check(code, admin.totp_secret)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  if (!admin.totp_enabled) {
    await supabaseAdmin.from("platform_admins").update({ totp_enabled: true }).eq("id", admin.id);
  }

  const token = generateSessionToken();
  await supabaseAdmin.from("admin_sessions").insert({
    admin_id: admin.id,
    token_hash: hashToken(token),
    // Admin sessions expire faster than client sessions — broader blast radius.
    expires_at: sessionExpiry(2).toISOString(),
  });

  return NextResponse.json({ sessionToken: token });
}
