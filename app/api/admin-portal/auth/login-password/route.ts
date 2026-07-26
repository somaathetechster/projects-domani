import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyHash } from "@/lib/auth";

// POST { email, password } — confirms password, does NOT issue a session.
// TOTP is mandatory on every admin login; the session is only minted by
// verify-totp. Admin access is never one factor away.
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const normalized = email.trim().toLowerCase();

  const { data: admin } = await supabaseAdmin
    .from("platform_admins")
    .select("password_hash, totp_enabled")
    .eq("email", normalized)
    .single();

  if (!admin?.password_hash) {
    return NextResponse.json({ error: "Account not set up" }, { status: 400 });
  }
  if (!(await verifyHash(password, admin.password_hash))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  if (!admin.totp_enabled) {
    return NextResponse.json({ error: "Authenticator not enrolled." }, { status: 400 });
  }

  return NextResponse.json({ requiresTotp: true });
}
