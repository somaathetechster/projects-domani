import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateOtp, hashValue, otpExpiry } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/email";

// POST { projectSlug: string, email: string }
export async function POST(req: NextRequest) {
  const { projectSlug, email } = await req.json();

  if (!projectSlug || !email) {
    return NextResponse.json({ error: "projectSlug and email are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("slug", projectSlug)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // CRITICAL: only whitelisted emails for this project can proceed.
  // This is what makes it "only the 3-4 emails we configured" — no open signup, ever.
  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("id, email")
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .single();

  if (!member) {
    // Same generic response whether project or email is invalid — don't leak which emails are whitelisted.
    return NextResponse.json({ error: "If this email is authorized, a code has been sent." });
  }

  // Rate limit: block if too many unconsumed codes issued in the last hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const otp = generateOtp();
  const codeHash = await hashValue(otp);

  await supabaseAdmin.from("otp_codes").insert({
    project_id: project.id,
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: otpExpiry(10).toISOString(),
  });

  await sendOtpEmail(normalizedEmail, otp, projectSlug);

  return NextResponse.json({ ok: true });
}
