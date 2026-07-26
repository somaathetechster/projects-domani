import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateOtp, hashValue, otpExpiry } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

// POST { email }
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const normalized = email.trim().toLowerCase();

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("email", normalized)
    .single();

  // Generic response either way — never confirm which addresses are admins.
  if (!admin) {
    return NextResponse.json({ ok: true });
  }

  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabaseAdmin
    .from("admin_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("email", normalized)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const otp = generateOtp();
  await supabaseAdmin.from("admin_otp_codes").insert({
    email: normalized,
    code_hash: await hashValue(otp),
    expires_at: otpExpiry(10).toISOString(),
  });

  await sendOtpEmail(normalized, otp, "admin");
  return NextResponse.json({ ok: true });
}
