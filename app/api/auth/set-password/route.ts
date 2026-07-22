import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashValue, hashToken } from "@/lib/auth";

// POST { projectSlug, email, setupToken, password }
// Sets the password and generates a TOTP secret + QR code for the client
// to scan in Google Authenticator / Authy / 1Password etc.
export async function POST(req: NextRequest) {
  const { projectSlug, email, setupToken, password } = await req.json();
  const normalizedEmail = email.trim().toLowerCase();

  if (!password || password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }

  const { data: project } = await supabaseAdmin
    .from("projects").select("id").eq("slug", projectSlug).single();
  if (!project) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Validate the short-lived setup token issued by verify-otp
  const { data: tokenRow } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .eq("code_hash", hashToken(setupToken))
    .eq("consumed", false)
    .single();

  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Setup session expired. Start over." }, { status: 400 });
  }

  const passwordHash = await hashValue(password);
  const totpSecret = authenticator.generateSecret();
  const otpAuthUrl = authenticator.keyuri(normalizedEmail, `Domani Projects · ${projectSlug}`, totpSecret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

  await supabaseAdmin
    .from("project_members")
    .update({ password_hash: passwordHash, totp_secret: totpSecret, totp_enabled: false })
    .eq("project_id", project.id)
    .eq("email", normalizedEmail);

  await supabaseAdmin.from("otp_codes").update({ consumed: true }).eq("id", tokenRow.id);

  // totp_enabled flips to true only after the client verifies one code — see verify-totp route.
  return NextResponse.json({ qrCodeDataUrl, otpAuthUrl });
}
