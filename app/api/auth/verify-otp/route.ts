import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveProject } from "@/lib/resolve-project";
import { verifyHash, generateSessionToken, hashToken, sessionExpiry, MAX_OTP_ATTEMPTS } from "@/lib/auth";

// POST { projectSlug: string, email: string, code: string }
export async function POST(req: NextRequest) {
  const { projectSlug, email, code } = await req.json();
  const normalizedEmail = email.trim().toLowerCase();

  const project = await resolveProject(projectSlug);
  if (!project) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: otpRow } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired or invalid. Request a new one." }, { status: 400 });
  }

  if (otpRow.attempt_count >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  const valid = await verifyHash(code, otpRow.code_hash);

  if (!valid) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempt_count: otpRow.attempt_count + 1 })
      .eq("id", otpRow.id);
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  await supabaseAdmin.from("otp_codes").update({ consumed: true }).eq("id", otpRow.id);

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("id, password_hash, totp_enabled")
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .single();

  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // First-ever login: no password set yet -> force password + authenticator setup before granting a session.
  if (!member.password_hash) {
    const setupToken = generateSessionToken();
    await supabaseAdmin.from("otp_codes").insert({
      project_id: project.id,
      email: normalizedEmail,
      code_hash: hashToken(setupToken), // reusing table as a short-lived setup-token store
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      consumed: false,
    });
    return NextResponse.json({ requiresSetup: true, setupToken });
  }

  // Returning user: OTP alone doesn't grant access if TOTP is enabled — password step still required client-side.
  const sessionToken = generateSessionToken();
  await supabaseAdmin.from("sessions").insert({
    member_id: member.id,
    project_id: project.id,
    token_hash: hashToken(sessionToken),
    expires_at: sessionExpiry(7).toISOString(),
  });

  return NextResponse.json({
    requiresSetup: false,
    requiresPassword: true, // client then calls /api/auth/login-password
    sessionToken,
  });
}
