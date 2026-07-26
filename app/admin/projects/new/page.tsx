"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Panel, Select } from "@/components/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [slug, setSlug] = useState("");
  const [visibility, setVisibility] = useState("hidden");
  const [category, setCategory] = useState("");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Slug is derived from the project name until the user edits it directly —
  // then we stop overwriting their choice.
  const [slugTouched, setSlugTouched] = useState(false);
  function onProjectName(v: string) {
    setProjectName(v);
    if (!slugTouched) {
      setSlug(v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function submit() {
    const token = sessionStorage.getItem("domani_admin_session");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin-portal/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        clientName,
        projectName,
        slug,
        visibility,
        category: category || null,
        memberEmails: emails
          .split(/[\n,]/)
          .map((e) => e.trim())
          .filter(Boolean),
      }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create project");
      return;
    }
    router.push(`/admin/projects/${data.project.id}`);
  }

  return (
    <main className="min-h-screen bg-[#080706] px-6 py-10 text-[#EDE9E2]">
      <div className="mx-auto max-w-lg space-y-6">
        <button
          onClick={() => router.push("/admin")}
          className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C] hover:text-[#948E80]"
        >
          ← All engagements
        </button>

        <h1 className="text-2xl font-semibold">New project</h1>

        {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

        <Panel className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Client name</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Infinitswap" />
          </div>

          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input value={projectName} onChange={(e) => onProjectName(e.target.value)} placeholder="Infinitswap Platform" />
          </div>

          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="infinitswap"
            />
            <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
              portal.domanimedia.com/portal/{slug || "…"}/login
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Homepage visibility</Label>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full">
              <option value="hidden">Hidden — not listed publicly</option>
              <option value="category_only">Category only — shows sector, not name</option>
              <option value="public">Public — client name and logo shown</option>
            </Select>
          </div>

          {visibility === "category_only" && (
            <div className="space-y-1.5">
              <Label>Category label</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Enterprise Fintech" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Client emails</Label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={"one per line\nceo@client.com\ncto@client.com"}
              className="h-24 w-full rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] px-3 py-2 text-sm text-[#EDE9E2] placeholder:text-[#6B665C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F0FF]/40"
            />
            <p className="text-[10px] text-[#6B665C]">
              Only these addresses will be able to sign in. You can add more later.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={busy || !clientName.trim() || !projectName.trim() || !slug.trim()}
            onClick={submit}
          >
            {busy ? "Creating…" : "Create project"}
          </Button>
        </Panel>
      </div>
    </main>
  );
}
