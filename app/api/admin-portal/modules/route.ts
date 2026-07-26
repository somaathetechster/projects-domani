import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";

// POST { project_id, name, sort_order? }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { project_id, name, sort_order } = await req.json();
  if (!project_id || !name?.trim()) {
    return NextResponse.json({ error: "project_id and name are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert({
      project_id,
      name: name.trim(),
      status: "upcoming",
      progress_pct: 0,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(project_id, "module_added", `Module "${data.name}" added`, auth.name ?? "Domani");
  return NextResponse.json({ module: data }, { status: 201 });
}

// PATCH { id, project_id, name?, status?, progress_pct? }
export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const allowed = ["upcoming", "in_progress", "completed", "blocked"];
  const updates: Record<string, string | number> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.progress_pct !== undefined) updates.progress_pct = body.progress_pct;
  if (body.status !== undefined) {
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  const { data, error } = await supabaseAdmin
    .from("modules")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Update failed" }, { status: 404 });

  if (body.status) {
    await logActivity(
      data.project_id,
      "module_status_changed",
      `Module "${data.name}" → ${String(body.status).replace("_", " ")}`,
      auth.name ?? "Domani"
    );
  }
  return NextResponse.json({ module: data });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("modules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
