import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/public/project/:slug — safe pre-login info: display name + logo only.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from("projects")
    .select("name, clients(name, visibility, logo_url)")
    .eq("slug", slug)
    .single();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = data.clients as unknown as { name: string; visibility: string; logo_url: string | null } | null;

  return NextResponse.json({
    displayName: client?.visibility === "public" ? client.name : data.name,
    logoUrl: client?.visibility === "public" ? client.logo_url : null,
  });
}