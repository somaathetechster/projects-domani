import { notifyProject } from "@/lib/notify";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// GET /api/issues?status=open — list issues for the caller's own project
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");

  let query = supabaseAdmin
    .from("issues")
    .select("id, number, title, priority, status, created_at, updated_at, created_by")
    .eq("project_id", session.projectId) // scoped strictly to this session's project — never client-supplied
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issues: data });
}

// POST /api/issues — create a new issue, { title, description?, priority? }
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, priority } = await req.json();
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("issues")
    .insert({
      project_id: session.projectId,
      title: title.trim(),
      description: description ?? null,
      priority: priority ?? "medium",
      created_by: session.memberId,
    })
    .select("id, number, title, priority, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issue: data }, { status: 201 });
}
