import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateSessionToken, hashToken, sessionExpiry } from "@/lib/auth";

// POST { projectSlug, email, code }
// Called (a) once during enrollment to confirm the authenticator app works,
// and (b) on every future login after password check.
export async function POST(req: NextRequest) {
  const { projectSlug, email, code } = await req.json();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: project } = await supabaseAdmin
    .from("projects").select("id").eq("slug", projectSlug).single();
  if (!project) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("id, totp_secret, totp_enabled")
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .single();

  if (!member?.totp_secret) {
    return NextResponse.json({ error: "Authenticator not set up." }, { status: 400 });
  }

  const valid = authenticator.check(code, member.totp_secret);
  if (!valid) return NextResponse.json({ error: "Invalid code." }, { status: 400 });

  if (!member.totp_enabled) {
    await supabaseAdmin.from("project_members").update({ totp_enabled: true }).eq("id", member.id);
  }

  const sessionToken = generateSessionToken();
  await supabaseAdmin.from("sessions").insert({
    member_id: member.id,
    project_id: project.id,
    token_hash: hashToken(sessionToken),
    expires_at: sessionExpiry(7).toISOString(),
  });

  return NextResponse.json({ sessionToken });
}
