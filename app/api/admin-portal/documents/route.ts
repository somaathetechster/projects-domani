import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";
import { notifyProject } from "@/lib/notify";

const BUCKET = "project-documents";

// GET /api/admin-portal/documents?project_id=... — list, including who uploaded
export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, title, doc_type, status, file_url, uploaded_by, created_at, project_members(email)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

// POST — two modes:
//   { mode: "upload-url", project_id, filename } → signed upload URL
//   { mode: "register", project_id, title, doc_type, storage_path } → save + notify client
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();

  if (body.mode === "upload-url") {
    const { project_id, filename } = body;
    if (!project_id || !filename) {
      return NextResponse.json({ error: "project_id and filename are required" }, { status: 400 });
    }
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${project_id}/${Date.now()}-${safe}`;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, storagePath: path });
  }

  if (body.mode === "register") {
    const { project_id, title, doc_type, storage_path } = body;
    const allowed = ["sow", "contract", "invoice", "acceptance_certificate", "architecture", "meeting_notes", "other"];
    if (!project_id || !title || !allowed.includes(doc_type) || !storage_path) {
      return NextResponse.json({ error: "project_id, title, valid doc_type, storage_path required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("documents")
      .insert({
        project_id,
        title,
        doc_type,
        file_url: storage_path,
        status: doc_type === "acceptance_certificate" ? "pending_signature" : "uploaded",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity(project_id, "document_uploaded", `Document uploaded: ${title}`, auth.name ?? "Domani");
    await notifyProject(project_id, "New document", title, "/documents");
    return NextResponse.json({ document: data }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}

// PATCH { id, project_id } → signed 5-minute download URL (admin viewing client uploads)
export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: doc } = await supabaseAdmin.from("documents").select("file_url").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(doc.file_url, 300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
