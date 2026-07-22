import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// POST /api/signatures — { document_id? , module_id?, signature_type, signed_value? }
// Exactly one of document_id / module_id must be provided.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { document_id, module_id, signature_type, signed_value } = await req.json();

  if (!document_id && !module_id) {
    return NextResponse.json({ error: "document_id or module_id is required" }, { status: 400 });
  }
  if (document_id && module_id) {
    return NextResponse.json({ error: "Provide only one of document_id or module_id" }, { status: 400 });
  }
  if (!["click_accept", "typed_name"].includes(signature_type)) {
    return NextResponse.json({ error: "Invalid signature_type" }, { status: 400 });
  }
  if (signature_type === "typed_name" && !signed_value?.trim()) {
    return NextResponse.json({ error: "signed_value is required for typed_name signatures" }, { status: 400 });
  }

  // Verify the target actually belongs to the caller's project before signing it —
  // otherwise a session could "accept" a document belonging to a different client.
  if (document_id) {
    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("id")
      .eq("id", document_id)
      .eq("project_id", session.projectId)
      .single();
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  } else {
    const { data: mod } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("id", module_id)
      .eq("project_id", session.projectId)
      .single();
    if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { data, error } = await supabaseAdmin
    .from("signatures")
    .insert({
      document_id: document_id ?? null,
      module_id: module_id ?? null,
      signed_by: session.memberId,
      signature_type,
      signed_value: signed_value ?? null,
      ip_address: ip,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Signing a document flips its status to 'signed'; signing a module marks it complete.
  if (document_id) {
    await supabaseAdmin.from("documents").update({ status: "signed" }).eq("id", document_id);
  } else {
    await supabaseAdmin.from("modules").update({ status: "completed", progress_pct: 100 }).eq("id", module_id);
  }

  return NextResponse.json({ signature: data }, { status: 201 });
}