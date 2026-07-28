"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, Label, Panel, ProgressBar, Skeleton, StatusChip, Button } from "@/components/ui";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string;
  progress_pct: number;
  current_phase: string | null;
  clients: { name: string; visibility: string } | null;
};

export default function AdminHomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("domani_admin_session");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetch("/api/admin-portal/projects", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/admin/login");
          return;
        }
        const d = await r.json();
        if (!r.ok) {
          setError(d.error ?? "Failed to load");
          return;
        }
        setProjects(d.projects ?? []);
      })
      .catch(() => setError("Failed to load"));
  }, [router]);

  return (
    <main className="min-h-screen bg-[#080706] text-[#EDE9E2]">
      <header className="border-b border-[#1F1E1B]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Label>Domani Workspace · Admin</Label>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/admin/team")}>
              Team
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/projects/new")}>
              New project
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                sessionStorage.removeItem("domani_admin_session");
                router.push("/admin/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold">All engagements</h1>
          <p className="mt-1 text-sm text-[#948E80]">
            {projects ? `${projects.length} project${projects.length === 1 ? "" : "s"}` : "\u00A0"}
          </p>
        </div>

        {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

        {!projects && !error && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {projects?.length === 0 && (
          <Panel>
            <EmptyState
              title="No projects yet."
              hint="Create your first engagement to get started."
            />
          </Panel>
        )}

        <div className="grid gap-4">
          {projects?.map((p) => (
            <Panel key={p.id} className="p-6 transition-colors hover:border-[#2A2825]">
              <button
                onClick={() => router.push(`/admin/projects/${p.id}`)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium">{p.name}</h2>
                    <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">
                      {p.clients?.name} · /{p.slug}
                    </p>
                  </div>
                  <StatusChip status={p.status} />
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[#948E80]">
                      {p.current_phase ?? "No phase set"}
                    </span>
                    <span className="font-[family-name:var(--font-dm-mono)] text-xs tabular-nums text-[#EDE9E2]">
                      {p.progress_pct}%
                    </span>
                  </div>
                  <ProgressBar value={p.progress_pct} />
                </div>
              </button>
            </Panel>
          ))}
        </div>
      </div>
    </main>
  );
}
