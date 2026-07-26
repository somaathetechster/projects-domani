import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePlatformAdmin, logActivity } from "@/lib/admin-auth";

// GET /api/admin-portal/projects — every project, every client.
export async function GET(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, slug, name, status, progress_pct, current_phase, next_milestone, eta, clients(name, visibility, category, logo_url)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

// POST — creates client + project + seed members in one transaction-ish flow.
// Body: { clientName, projectName, slug, visibility, category?, memberEmails[] }
export async function POST(req: NextRequest) {
  const auth = await requirePlatformAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { clientName, projectName, slug, visibility, category, memberEmails } = await req.json();

  if (!clientName?.trim() || !projectName?.trim() || !slug?.trim()) {
    return NextResponse.json(
      { error: "clientName, projectName and slug are required" },
      { status: 400 }
    );
  }

  const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const { data: existing } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("slug", normalizedSlug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
  }

  const { data: client, error: clientErr } = await supabaseAdmin
    .from("clients")
    .insert({
      name: clientName.trim(),
      visibility: visibility ?? "hidden",
      category: category ?? null,
    })
    .select("id")
    .single();
  if (clientErr || !client) {
    return NextResponse.json({ error: clientErr?.message ?? "Client create failed" }, { status: 500 });
  }

  const { data: project, error: projErr } = await supabaseAdmin
    .from("projects")
    .insert({ client_id: client.id, slug: normalizedSlug, name: projectName.trim() })
    .select("id, slug, name")
    .single();
  if (projErr || !project) {
    // Roll back the orphaned client rather than leaving debris behind.
    await supabaseAdmin.from("clients").delete().eq("id", client.id);
    return NextResponse.json({ error: projErr?.message ?? "Project create failed" }, { status: 500 });
  }

  const emails: string[] = Array.isArray(memberEmails) ? memberEmails : [];
  const cleaned = emails
    .map((e) => String(e).trim().toLowerCase())
    .filter((e) => e.includes("@"));

  if (cleaned.length) {
    await supabaseAdmin.from("project_members").insert(
      cleaned.map((email) => ({ project_id: project.id, email, role: "client" }))
    );
  }

  await logActivity(project.id, "project_created", `Project ${project.name} created`, auth.name ?? "Domani");

  return NextResponse.json({ project }, { status: 201 });
}
