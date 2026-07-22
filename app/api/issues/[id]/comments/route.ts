import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// POST /api/issues/:id/comments — { body, attachment_url? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Confirm the issue actually belongs to this session's project before allowing a comment.
  const { data: issue } = await supabaseAdmin
    .from("issues")
    .select("id")
    .eq("id", id)
    .eq("project_id", session.projectId)
    .single();

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body: commentBody, attachment_url } = await req.json();
  if (!commentBody || typeof commentBody !== "string" || commentBody.trim().length === 0) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("issue_comments")
    .insert({
      issue_id: id,
      author_id: session.memberId,
      body: commentBody.trim(),
      attachment_url: attachment_url ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bumping the parent issue's updated_at so it sorts correctly by recent activity.
  await supabaseAdmin.from("issues").update({ updated_at: new Date().toISOString() }).eq("id", id);

  return NextResponse.json({ comment: data }, { status: 201 });
}