import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/admin-guard";

// PATCH /api/admin/project — { status?, progress_pct?, current_phase?, next_milestone?, eta? }
export async function PATCH(req: NextRequest) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;

  const body = await req.json();
  const allowedStatuses = ["planning", "in_progress", "blocked", "review", "completed"];
  const updates: Record<string, string | number> = {};

  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.progress_pct !== undefined) updates.progress_pct = body.progress_pct;
  if (body.current_phase !== undefined) updates.current_phase = body.current_phase;
  if (body.next_milestone !== undefined) updates.next_milestone = body.next_milestone;
  if (body.eta !== undefined) updates.eta = body.eta;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(updates)
    .eq("id", session.projectId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}