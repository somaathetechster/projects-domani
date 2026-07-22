import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

const STORAGE_BUCKET = "project-documents";

// GET /api/documents/:id/signed-url — returns a short-lived signed URL to view/download
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select("file_url")
    .eq("id", id)
    .eq("project_id", session.projectId) // can't fetch another project's document by guessing an id
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.file_url, 60 * 5); // 5 minutes

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl, expiresIn: 300 });
}