import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/admin-guard";

// POST /api/admin/deliverables — { module_id, title, sort_order? }
export async function POST(req: NextRequest) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;

  const { module_id, title, sort_order } = await req.json();
  if (!module_id || !title?.trim()) {
    return NextResponse.json({ error: "module_id and title are required" }, { status: 400 });
  }

  // Confirm the module actually belongs to this project before attaching a deliverable to it.
  const { data: mod } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("id", module_id)
    .eq("project_id", session.projectId)
    .single();
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("deliverables")
    .insert({
      module_id,
      project_id: session.projectId,
      title: title.trim(),
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deliverable: data }, { status: 201 });
}