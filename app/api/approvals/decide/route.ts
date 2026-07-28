import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";
import { notifyProject } from "@/lib/notify";

// POST /api/approvals/decide
// { approval_id, decision: "approved" | "changes_requested", note?, signed_name? }
// An approval is a legally-meaningful act: signature row records who, when,
// from which IP, with what typed name. Immutable once written.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { approval_id, decision, note, signed_name } = await req.json();

  if (!approval_id || !["approved", "changes_requested"].includes(decision)) {
    return NextResponse.json({ error: "approval_id and a valid decision are required" }, { status: 400 });
  }
  if (decision === "approved" && !signed_name?.trim()) {
    return NextResponse.json({ error: "Type your full name to sign the approval." }, { status: 400 });
  }

  const { data: approval } = await supabaseAdmin
    .from("approvals")
    .select("id, title, status")
    .eq("id", approval_id)
    .eq("project_id", session.projectId)
    .single();

  if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (approval.status !== "pending") {
    return NextResponse.json({ error: "This approval has already been resolved." }, { status: 409 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { error } = await supabaseAdmin
    .from("approvals")
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
      resolved_by: session.memberId,
      resolution_note: note ?? null,
      // Signature evidence recorded directly on the approval — who, what name
      // they typed, from which IP. The signatures table requires a document or
      // module target, which an approval is not.
      signed_name: decision === "approved" ? signed_name.trim() : null,
      signed_ip: decision === "approved" ? ip : null,
    })
    .eq("id", approval_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("activity_events").insert({
    project_id: session.projectId,
    actor_label: session.email,
    event_type: decision === "approved" ? "approval_granted" : "changes_requested",
    summary: `${approval.title}: ${decision === "approved" ? "approved" : "changes requested"}`,
  });

  await notifyProject(
    session.projectId,
    decision === "approved" ? "Approval granted" : "Changes requested",
    approval.title,
    "/approvals",
    session.memberId,
    { notifyAdmins: true }
  );

  return NextResponse.json({ ok: true });
}
