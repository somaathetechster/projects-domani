import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";

// GET /api/admin-portal/projects/:id — everything about one project.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const [project, modules, deliverables, members, issues, documents, approvals, invoices, milestones] =
    await Promise.all([
      supabaseAdmin.from("projects").select("*, clients(*)").eq("id", id).single(),
      supabaseAdmin.from("modules").select("*").eq("project_id", id).order("sort_order"),
      supabaseAdmin.from("deliverables").select("*").eq("project_id", id).order("sort_order"),
      supabaseAdmin.from("project_members").select("id, email, role, totp_enabled").eq("project_id", id),
      supabaseAdmin.from("issues").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("approvals").select("*").eq("project_id", id).order("requested_at", { ascending: false }),
      supabaseAdmin.from("invoices").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabaseAdmin.from("milestones").select("*").eq("project_id", id).order("sort_order"),
    ]);

  if (!project.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    project: project.data,
    modules: modules.data ?? [],
    deliverables: deliverables.data ?? [],
    members: members.data ?? [],
    issues: issues.data ?? [],
    documents: documents.data ?? [],
    approvals: approvals.data ?? [],
    invoices: invoices.data ?? [],
    milestones: milestones.data ?? [],
  });
}

// PATCH — update project-level fields.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await req.json();
  const allowed = ["planning", "in_progress", "blocked", "review", "completed"];
  const updates: Record<string, string | number | null> = {};

  if (body.status !== undefined) {
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.name !== undefined) updates.name = body.name;
  if (body.progress_pct !== undefined) updates.progress_pct = body.progress_pct;
  if (body.current_phase !== undefined) updates.current_phase = body.current_phase;
  if (body.next_milestone !== undefined) updates.next_milestone = body.next_milestone;
  if (body.eta !== undefined) updates.eta = body.eta || null;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logActivity(id, "project_updated", "Project details updated", auth.name ?? "Domani");
  return NextResponse.json({ project: data });
}
