import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyHash } from "@/lib/auth";

// POST /api/auth/login-password — { projectSlug, email, password }
// Called after OTP has already confirmed the email is live. Checks the
// password; if correct AND the account has TOTP enabled, tells the client to
// proceed to /api/auth/verify-totp. Does NOT issue a session by itself —
// TOTP is a hard requirement on every login, not an optional second factor.
export async function POST(req: NextRequest) {
  const { projectSlug, email, password } = await req.json();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: project } = await supabaseAdmin
    .from("projects").select("id").eq("slug", projectSlug).single();
  if (!project) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: member } = await supabaseAdmin
    .from("project_members")
    .select("id, password_hash, totp_enabled")
    .eq("project_id", project.id)
    .eq("email", normalizedEmail)
    .single();

  if (!member?.password_hash) {
    return NextResponse.json({ error: "Account not set up" }, { status: 400 });
  }

  const valid = await verifyHash(password, member.password_hash);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  if (!member.totp_enabled) {
    // Shouldn't normally happen — password is only ever set alongside TOTP
    // enrollment in set-password — but fail safe rather than skip the factor.
    return NextResponse.json({ error: "Authenticator app not enrolled. Contact Domani staff." }, { status: 400 });
  }

  return NextResponse.json({ requiresTotp: true });
}