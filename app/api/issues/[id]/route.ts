import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// GET /api/issues/:id — issue detail including comment thread
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: issue, error } = await supabaseAdmin
    .from("issues")
    .select("*")
    .eq("id", id)
    .eq("project_id", session.projectId) // ownership check baked into the query itself
    .single();

  if (error || !issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: comments } = await supabaseAdmin
    .from("issue_comments")
    .select("id, body, attachment_url, author_id, created_at")
    .eq("issue_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ issue, comments: comments ?? [] });
}

// PATCH /api/issues/:id — update status and/or priority
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };

  const allowedStatuses = ["open", "investigating", "in_progress", "awaiting_client", "resolved", "closed"];
  const allowedPriorities = ["low", "medium", "high", "critical"];

  if (body.status) {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.priority) {
    if (!allowedPriorities.includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    updates.priority = body.priority;
  }

  const { data, error } = await supabaseAdmin
    .from("issues")
    .update(updates)
    .eq("id", id)
    .eq("project_id", session.projectId) // can't patch an issue outside your own project
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found or update failed" }, { status: 404 });

  return NextResponse.json({ issue: data });
}