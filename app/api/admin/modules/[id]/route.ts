import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/admin-guard";

// PATCH /api/admin/modules/:id — { name?, status?, progress_pct?, sort_order? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;
  const { id } = await params;

  const body = await req.json();
  const allowedStatuses = ["upcoming", "in_progress", "completed", "blocked"];
  const updates: Record<string, string | number> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.progress_pct !== undefined) updates.progress_pct = body.progress_pct;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await supabaseAdmin
    .from("modules")
    .update(updates)
    .eq("id", id)
    .eq("project_id", session.projectId) // staff can only edit their own project's modules
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found or update failed" }, { status: 404 });
  return NextResponse.json({ module: data });
}

// DELETE /api/admin/modules/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("modules")
    .delete()
    .eq("id", id)
    .eq("project_id", session.projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}