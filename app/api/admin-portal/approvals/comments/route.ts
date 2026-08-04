import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { notifyProject } from "@/lib/notify";

// POST { approval_id, body }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { approval_id, body } = await req.json();
  if (!approval_id || !body?.trim()) {
    return NextResponse.json({ error: "approval_id and body are required" }, { status: 400 });
  }

  const { data: approval } = await supabaseAdmin
    .from("approvals").select("id, title, project_id").eq("id", approval_id).single();
  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("approval_comments")
    .insert({
      approval_id,
      author_label: auth.name ?? auth.email,
      author_role: "admin",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyProject(approval.project_id, "Comment from Domani on approval", approval.title, "/approvals");
  return NextResponse.json({ comment: data }, { status: 201 });
}
