import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyHash, generateSessionToken, hashToken, MAX_OTP_ATTEMPTS } from "@/lib/auth";

// POST { email, code }
export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  const normalized = email.trim().toLowerCase();

  const { data: otpRow } = await supabaseAdmin
    .from("admin_otp_codes")
    .select("*")
    .eq("email", normalized)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired or invalid." }, { status: 400 });
  }
  if (otpRow.attempt_count >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  if (!(await verifyHash(code, otpRow.code_hash))) {
    await supabaseAdmin
      .from("admin_otp_codes")
      .update({ attempt_count: otpRow.attempt_count + 1 })
      .eq("id", otpRow.id);
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  await supabaseAdmin.from("admin_otp_codes").update({ consumed: true }).eq("id", otpRow.id);

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id, password_hash")
    .eq("email", normalized)
    .single();

  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  if (!admin.password_hash) {
    const setupToken = generateSessionToken();
    await supabaseAdmin.from("admin_otp_codes").insert({
      email: normalized,
      code_hash: hashToken(setupToken),
      expires_at: new Date(Date.now() + 900_000).toISOString(),
    });
    return NextResponse.json({ requiresSetup: true, setupToken });
  }

  return NextResponse.json({ requiresSetup: false });
}
