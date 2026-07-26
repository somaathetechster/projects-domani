import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

// POST /api/assistant — { messages: [{role, content}] }
// Grounds Claude in the caller's OWN project state (and nothing else) plus a
// map of the portal itself, so it can answer both "how do I…" and "what's the
// status of…". Requires ANTHROPIC_API_KEY in the environment.
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Assistant is not configured yet. Add OPENAI_API_KEY to the environment." },
      { status: 503 }
    );
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  // Snapshot of this project only — the session boundary applies to the
  // assistant exactly as it applies to every other route.
  const [{ data: project }, { data: modules }, { data: issues }, { data: approvals }, { data: invoices }] =
    await Promise.all([
      supabaseAdmin
        .from("projects")
        .select("name, status, progress_pct, current_phase, next_milestone, eta")
        .eq("id", session.projectId)
        .single(),
      supabaseAdmin
        .from("modules")
        .select("name, status, progress_pct")
        .eq("project_id", session.projectId)
        .order("sort_order"),
      supabaseAdmin
        .from("issues")
        .select("number, title, status, priority")
        .eq("project_id", session.projectId)
        .in("status", ["open", "investigating", "in_progress", "awaiting_client"]),
      supabaseAdmin
        .from("approvals")
        .select("title, status")
        .eq("project_id", session.projectId)
        .eq("status", "pending"),
      supabaseAdmin
        .from("invoices")
        .select("number, workstream, amount_minor, currency, status, due_on")
        .eq("project_id", session.projectId),
    ]);

  const systemPrompt = `You are the Domani Workspace assistant, helping a client of Domani (a design and technology studio — "we build tomorrow") navigate their project portal.

PORTAL MAP — where things live:
- Overview (/dashboard): project status, progress, module checklists
- Issues (/issues): report a bug or request via "New Issue"; comment threads on each
- Documents (/documents): upload files, download deliverables (links expire after 5 minutes for security)
- Approvals (/approvals): review pending items; approving requires typing your full name as an electronic signature
- Invoices (/invoices): amounts, due dates, payment status
- Chat (/chat): direct line to the Domani team
- Notifications (/notifications): everything that changed
- Settings (/settings): dark/light mode, change password

CURRENT PROJECT STATE (live, this client only):
${JSON.stringify({ project, modules, openIssues: issues, pendingApprovals: approvals, invoices }, null, 2)}

Rules:
- Answer from the state above when asked about status; never invent progress, dates, or amounts not present in it.
- For amounts, amount_minor is in minor units (kobo/cents): divide by 100 and format with the currency.
- If asked something outside this project or portal, say that's outside what you can help with here and suggest the Chat page to reach the Domani team.
- Be concise and direct. No filler.`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      messages: [{ role: "system", content: systemPrompt }, ...messages.slice(-12)],
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    console.error("OpenAI API error:", detail);
    return NextResponse.json({ error: "Assistant is temporarily unavailable." }, { status: 502 });
  }

  const data = await openaiRes.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ reply: text });
}
