import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/admin-guard";

// GET /api/admin/modules — list modules for the caller's project (staff only)
export async function GET(req: NextRequest) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;

  const { data, error } = await supabaseAdmin
    .from("modules")
    .select("id, name, status, progress_pct, sort_order")
    .eq("project_id", session.projectId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ modules: data });
}

// POST /api/admin/modules — { name, status?, progress_pct?, sort_order? }
export async function POST(req: NextRequest) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;

  const { name, status, progress_pct, sort_order } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert({
      project_id: session.projectId,
      name: name.trim(),
      status: status ?? "upcoming",
      progress_pct: progress_pct ?? 0,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ module: data }, { status: 201 });
}