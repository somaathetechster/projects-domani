import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

const STORAGE_BUCKET = "project-documents";

// GET /api/documents — list documents for the caller's project
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, title, doc_type, status, file_url, uploaded_by, created_at, project_members(email, display_name)")
    .eq("project_id", session.projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}

// POST /api/documents — registers a document AFTER the file itself has been
// uploaded to Supabase Storage client-side via a signed upload URL (see
// /api/documents/upload-url). Body: { title, doc_type, storage_path }
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, doc_type, storage_path } = await req.json();

  const allowedTypes = ["sow", "contract", "invoice", "acceptance_certificate", "architecture", "meeting_notes", "other"];
  if (!title || !doc_type || !storage_path) {
    return NextResponse.json({ error: "title, doc_type, and storage_path are required" }, { status: 400 });
  }
  if (!allowedTypes.includes(doc_type)) {
    return NextResponse.json({ error: "Invalid doc_type" }, { status: 400 });
  }

  // storage_path must live under this project's own folder — prevents a client
  // from registering another project's uploaded file against their own project.
  if (!storage_path.startsWith(`${session.projectId}/`)) {
    return NextResponse.json({ error: "storage_path must belong to your project" }, { status: 403 });
  }

  // file_url stores the private storage path, NOT a public URL — the bucket is
  // private, and reads only ever happen through the short-lived signed URL
  // endpoint (/api/documents/:id/signed-url), scoped to the caller's session.
  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      project_id: session.projectId,
      title,
      doc_type,
      file_url: storage_path,
      uploaded_by: session.memberId,
      status: "uploaded",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}
