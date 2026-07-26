import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashValue, hashToken } from "@/lib/auth";

// POST { email, setupToken, password }
export async function POST(req: NextRequest) {
  const { email, setupToken, password } = await req.json();
  const normalized = email.trim().toLowerCase();

  if (!password || password.length < 12) {
    return NextResponse.json(
      { error: "Admin password must be at least 12 characters." },
      { status: 400 }
    );
  }

  const { data: tokenRow } = await supabaseAdmin
    .from("admin_otp_codes")
    .select("*")
    .eq("email", normalized)
    .eq("code_hash", hashToken(setupToken))
    .eq("consumed", false)
    .single();

  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Setup session expired. Start over." }, { status: 400 });
  }

  const totpSecret = authenticator.generateSecret();
  const otpAuthUrl = authenticator.keyuri(normalized, "Domani Workspace · Admin", totpSecret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

  await supabaseAdmin
    .from("platform_admins")
    .update({
      password_hash: await hashValue(password),
      totp_secret: totpSecret,
      totp_enabled: false,
    })
    .eq("email", normalized);

  await supabaseAdmin.from("admin_otp_codes").update({ consumed: true }).eq("id", tokenRow.id);

  return NextResponse.json({ qrCodeDataUrl });
}
