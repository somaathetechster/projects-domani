import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/admin-guard";

const LOGO_BUCKET = "client-logos"; // must be a PUBLIC bucket — logos are shown pre-login

// POST /api/admin/client-logo — { filename } → returns a signed upload URL
export async function POST(req: NextRequest) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;

  const { filename } = await req.json();
  if (!filename) return NextResponse.json({ error: "filename is required" }, { status: 400 });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${session.projectId}/${Date.now()}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage.from(LOGO_BUCKET).createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path });
}

// PATCH /api/admin/client-logo — { path } → after upload succeeds, saves the public URL on the client
export async function PATCH(req: NextRequest) {
  const result = await requireStaff(req);
  if (result instanceof NextResponse) return result;
  const session = result;

  const { path } = await req.json();
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const { data: publicUrlData } = supabaseAdmin.storage.from(LOGO_BUCKET).getPublicUrl(path);

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("client_id")
    .eq("id", session.projectId)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("clients")
    .update({ logo_url: publicUrlData.publicUrl })
    .eq("id", project.client_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logoUrl: publicUrlData.publicUrl });
}