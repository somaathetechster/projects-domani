import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// GET /api/search?q=... — searches issues, documents, and modules by title/name
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ issues: [], documents: [], modules: [] });

  const like = `%${q}%`;

  const [{ data: issues }, { data: documents }, { data: modules }] = await Promise.all([
    supabaseAdmin
      .from("issues")
      .select("id, number, title, status")
      .eq("project_id", session.projectId)
      .ilike("title", like)
      .limit(10),
    supabaseAdmin
      .from("documents")
      .select("id, title, doc_type, status")
      .eq("project_id", session.projectId)
      .ilike("title", like)
      .limit(10),
    supabaseAdmin
      .from("modules")
      .select("id, name, status")
      .eq("project_id", session.projectId)
      .ilike("name", like)
      .limit(10),
  ]);

  return NextResponse.json({
    issues: issues ?? [],
    documents: documents ?? [],
    modules: modules ?? [],
  });
}