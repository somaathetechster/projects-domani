import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";
import { notifyProject } from "@/lib/notify";

// GET /api/approval-comments?approval_id=
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const approvalId = req.nextUrl.searchParams.get("approval_id");
  if (!approvalId) return NextResponse.json({ error: "approval_id required" }, { status: 400 });

  // Confirm the approval belongs to this session's project before exposing comments.
  const { data: approval } = await supabaseAdmin
    .from("approvals").select("id").eq("id", approvalId).eq("project_id", session.projectId).single();
  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabaseAdmin
    .from("approval_comments")
    .select("id, author_label, author_role, body, created_at")
    .eq("approval_id", approvalId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ comments: data ?? [] });
}

// POST { approval_id, body }
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approval_id, body } = await req.json();
  if (!approval_id || !body?.trim()) {
    return NextResponse.json({ error: "approval_id and body are required" }, { status: 400 });
  }

  const { data: approval } = await supabaseAdmin
    .from("approvals").select("id, title").eq("id", approval_id).eq("project_id", session.projectId).single();
  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: member } = await supabaseAdmin
    .from("project_members").select("email, display_name, role").eq("id", session.memberId).single();

  const { data, error } = await supabaseAdmin
    .from("approval_comments")
    .insert({
      approval_id,
      author_label: member?.display_name ?? member?.email ?? "Unknown",
      author_role: session.role === "domani_staff" ? "domani_staff" : "client",
      body: body.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyProject(
    session.projectId,
    "Comment on approval",
    `${approval.title}: new comment`,
    "/approvals",
    session.memberId,
    { notifyAdmins: true }
  );

  return NextResponse.json({ comment: data }, { status: 201 });
}
