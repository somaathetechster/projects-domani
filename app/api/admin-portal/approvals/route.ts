import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";
import { notifyProject } from "@/lib/notify";

// POST /api/admin-portal/approvals — { project_id, title, version?, description? }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { project_id, title, version, description } = await req.json();
  if (!project_id || !title?.trim()) {
    return NextResponse.json({ error: "project_id and title are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("approvals")
    .insert({
      project_id,
      title: title.trim(),
      version: version ?? null,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(project_id, "approval_requested", `Approval requested: ${data.title}`, auth.name ?? "Domani");
  await notifyProject(project_id, "Approval needed", data.title, "/approvals");
  return NextResponse.json({ approval: data }, { status: 201 });
}

// GET ?project_id= — list all for admin view
export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("approvals")
    .select("*")
    .eq("project_id", projectId)
    .order("requested_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ approvals: data });
}
