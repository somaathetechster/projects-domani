import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/public/project/:handle — pre-login info. Codename only, never the
// client or project name: this endpoint is reachable without a session.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = slug.trim();

  const { data } = await supabaseAdmin
    .from("projects")
    .select("codename")
    .or(`slug.eq.${h.toLowerCase()},codename.ilike.${h}`)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ codename: data.codename });
}
