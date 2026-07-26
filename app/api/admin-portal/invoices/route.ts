import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";
import { notifyProject } from "@/lib/notify";

// POST /api/admin-portal/invoices
// { project_id, number, workstream?, amount_major, currency?, due_on? }
// amount_major is what a human types (e.g. 450000 for ₦450,000); stored ×100.
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { project_id, number, workstream, amount_major, currency, due_on } = await req.json();

  if (!project_id || !number || amount_major === undefined || amount_major === null) {
    return NextResponse.json({ error: "project_id, number and amount_major are required" }, { status: 400 });
  }
  const parsed = Number(amount_major);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NextResponse.json({ error: "amount_major must be a non-negative number" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      project_id,
      number: String(number).trim(),
      workstream: workstream ?? null,
      amount_minor: Math.round(parsed * 100),
      currency: currency ?? "NGN",
      status: "pending",
      issued_on: new Date().toISOString().slice(0, 10),
      due_on: due_on || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity(project_id, "invoice_issued", `Invoice ${data.number} issued`, auth.name ?? "Domani");
  await notifyProject(project_id, "New invoice", `Invoice ${data.number}`, "/invoices");
  return NextResponse.json({ invoice: data }, { status: 201 });
}

// PATCH { id, status } — pending → paid / overdue etc.
export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id, status } = await req.json();
  const allowed = ["draft", "pending", "paid", "overdue"];
  if (!id || !allowed.includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  const updates: Record<string, string | null> = { status };
  if (status === "paid") updates.paid_on = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Update failed" }, { status: 404 });

  if (status === "paid") {
    await logActivity(data.project_id, "invoice_paid", `Invoice ${data.number} marked paid`, auth.name ?? "Domani");
  }
  return NextResponse.json({ invoice: data });
}
