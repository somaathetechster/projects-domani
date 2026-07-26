import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";

// Module progress is DERIVED from its checklist, never typed by a human.
// The moment a percentage can be hand-entered it becomes fiction, and a
// client-facing fiction is worse than showing nothing at all.
async function recomputeModuleProgress(moduleId: string) {
  const { data: items } = await supabaseAdmin
    .from("deliverables")
    .select("done")
    .eq("module_id", moduleId);

  if (!items || items.length === 0) return;

  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  const updates: Record<string, string | number> = { progress_pct: pct };
  if (pct === 100) updates.status = "completed";
  else if (pct > 0) updates.status = "in_progress";

  await supabaseAdmin.from("modules").update(updates).eq("id", moduleId);
}

// POST { project_id, module_id, title }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { project_id, module_id, title } = await req.json();
  if (!project_id || !module_id || !title?.trim()) {
    return NextResponse.json(
      { error: "project_id, module_id and title are required" },
      { status: 400 }
    );
  }

  const { count } = await supabaseAdmin
    .from("deliverables")
    .select("id", { count: "exact", head: true })
    .eq("module_id", module_id);

  const { data, error } = await supabaseAdmin
    .from("deliverables")
    .insert({ project_id, module_id, title: title.trim(), sort_order: (count ?? 0) + 1 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recomputeModuleProgress(module_id);
  return NextResponse.json({ deliverable: data }, { status: 201 });
}

// PATCH { id, project_id, done?, title? }
export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, string | boolean> = {};
  if (body.done !== undefined) updates.done = body.done;
  if (body.title !== undefined) updates.title = body.title;

  const { data, error } = await supabaseAdmin
    .from("deliverables")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Update failed" }, { status: 404 });

  await recomputeModuleProgress(data.module_id);

  if (body.done === true) {
    await logActivity(
      data.project_id,
      "deliverable_completed",
      `Delivered: ${data.title}`,
      auth.name ?? "Domani"
    );
  }
  return NextResponse.json({ deliverable: data });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data } = await supabaseAdmin.from("deliverables").select("module_id").eq("id", id).single();

  const { error } = await supabaseAdmin.from("deliverables").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) await recomputeModuleProgress(data.module_id);
  return NextResponse.json({ ok: true });
}
