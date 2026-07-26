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
  if (body.codename !== undefined) {
    const cn = String(body.codename).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (cn.length < 3) return NextResponse.json({ error: "Codename must be at least 3 characters" }, { status: 400 });
    // Codename doubles as a login handle — it must not collide with another project.
    const { data: clash } = await supabaseAdmin
      .from("projects")
      .select("id")
      .ilike("codename", cn)
      .neq("id", id)
      .maybeSingle();
    if (clash) return NextResponse.json({ error: "That codename is already in use" }, { status: 409 });
    updates.codename = cn;
  }
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

  // Client-level fields (real name, homepage visibility) live on clients.
  if (body.client_name !== undefined || body.visibility !== undefined) {
    const clientUpdates: Record<string, string> = {};
    if (body.client_name !== undefined) clientUpdates.name = body.client_name;
    if (body.visibility !== undefined) {
      if (!["public", "category_only", "hidden"].includes(body.visibility)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
      clientUpdates.visibility = body.visibility;
    }
    await supabaseAdmin.from("clients").update(clientUpdates).eq("id", data.client_id);
  }

  await logActivity(id, "project_updated", "Project details updated", auth.name ?? "Domani");
  return NextResponse.json({ project: data });
}

// DELETE /api/admin-portal/projects/:id — removes the project and, if this was
// the client's only project, the client row too. Cascades take everything else
// (members, sessions, issues, documents rows, invoices, activity).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { data: project } = await supabaseAdmin
    .from("projects").select("client_id, name").eq("id", id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await supabaseAdmin
    .from("projects").select("id", { count: "exact", head: true })
    .eq("client_id", project.client_id);
  if ((count ?? 0) === 0) {
    await supabaseAdmin.from("clients").delete().eq("id", project.client_id);
  }

  return NextResponse.json({ ok: true });
}
