import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// GET /api/overview — everything the dashboard needs in one round trip
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: project }, { data: modules }, { data: openIssues }, { data: pendingDocs }] = await Promise.all([
    supabaseAdmin
      .from("projects")
      .select("id, slug, name, status, progress_pct, current_phase, next_milestone, eta")
      .eq("id", session.projectId)
      .single(),
    supabaseAdmin
      .from("modules")
      .select("id, name, status, progress_pct")
      .eq("project_id", session.projectId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("issues")
      .select("id, number, title, priority, status")
      .eq("project_id", session.projectId)
      .in("status", ["open", "investigating", "in_progress", "awaiting_client"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("documents")
      .select("id, title, doc_type, status")
      .eq("project_id", session.projectId)
      .eq("status", "pending_signature"),
  ]);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({
    project,
    modules: modules ?? [],
    openIssues: openIssues ?? [],
    pendingSignatures: pendingDocs ?? [],
  });
}