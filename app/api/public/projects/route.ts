import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/public/projects — homepage listing. Returns codenames ONLY.
// No client names, no logos, no status: the public page confirms Domani has
// active engagements without disclosing whose they are or how they're going.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("codename, clients(visibility)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = { codename: string | null; clients: { visibility: string } | null };

  const engagements = (data as unknown as Row[])
    .filter((r) => r.clients?.visibility !== "hidden" && r.codename)
    .map((r) => ({ codename: r.codename as string }));

  return NextResponse.json({ engagements });
}
