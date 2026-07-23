import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/public/projects — no auth required. Returns only what's safe to show
// on the homepage before login: project name/slug and, depending on the
// client's visibility setting, either their real name+logo, just a category,
// or nothing at all (hidden clients are excluded entirely).
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("slug, name, status, clients(name, visibility, category, logo_url)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    slug: string;
    name: string;
    status: string;
    clients: { name: string; visibility: string; category: string | null; logo_url: string | null } | null;
  };

  const visible = (data as unknown as Row[])
    .filter((row) => row.clients?.visibility !== "hidden")
    .map((row) => ({
      slug: row.slug,
      status: row.status,
      displayName:
        row.clients?.visibility === "public"
          ? row.clients.name
          : row.clients?.category ?? "Confidential Engagement",
      logoUrl: row.clients?.visibility === "public" ? row.clients.logo_url : null,
    }));

  return NextResponse.json({ projects: visible });
}