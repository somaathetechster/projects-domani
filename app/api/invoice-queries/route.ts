import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";
import { notifyProject } from "@/lib/notify";

// GET /api/invoice-queries?invoice_id=
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoiceId = req.nextUrl.searchParams.get("invoice_id");
  if (!invoiceId) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("invoice_queries")
    .select("id, type, body, created_at")
    .eq("invoice_id", invoiceId)
    .eq("project_id", session.projectId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ queries: data ?? [] });
}

// POST { invoice_id, type, body }
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoice_id, type, body } = await req.json();
  const allowed = ["payment_made", "query", "dispute"];
  if (!invoice_id || !body?.trim() || !allowed.includes(type)) {
    return NextResponse.json({ error: "invoice_id, valid type, and body are required" }, { status: 400 });
  }

  const { data: invoice } = await supabaseAdmin
    .from("invoices").select("id, number").eq("id", invoice_id).eq("project_id", session.projectId).single();
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("invoice_queries")
    .insert({ invoice_id, project_id: session.projectId, member_id: session.memberId, type, body: body.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const titles: Record<string, string> = {
    payment_made: "Client marked payment made",
    query: "Client query on invoice",
    dispute: "Client dispute on invoice",
  };

  await notifyProject(
    session.projectId,
    titles[type],
    `Invoice ${invoice.number}: ${body.trim().slice(0, 80)}`,
    "/invoices",
    session.memberId,
    { notifyAdmins: true }
  );

  return NextResponse.json({ query: data }, { status: 201 });
}
