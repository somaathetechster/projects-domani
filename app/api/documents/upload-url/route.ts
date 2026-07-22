import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

const STORAGE_BUCKET = "project-documents";

// POST /api/documents/upload-url — { filename }
// Returns a signed upload URL scoped to this project's folder in the private
// bucket. The browser uploads directly to Supabase Storage using this URL —
// the file bytes never pass through our own server.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename } = await req.json();
  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${session.projectId}/${Date.now()}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath, // pass this back to POST /api/documents after upload succeeds
  });
}