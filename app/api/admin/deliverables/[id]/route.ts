import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/admin-guard";

// PATCH /api/admin/deliverables/:id — { title?, done?, sort_order? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;
  const { id } = await params;

  const body = await req.json();
  const updates: Record<string, string | number | boolean> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.done !== undefined) updates.done = body.done;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const { data, error } = await supabaseAdmin
    .from("deliverables")
    .update(updates)
    .eq("id", id)
    .eq("project_id", session.projectId)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found or update failed" }, { status: 404 });
  return NextResponse.json({ deliverable: data });
}

// DELETE /api/admin/deliverables/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("deliverables")
    .delete()
    .eq("id", id)
    .eq("project_id", session.projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}