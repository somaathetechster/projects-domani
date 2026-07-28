"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmptyState, Label, Panel, ProgressBar, ProgressRing, Skeleton, StatusChip } from "@/components/ui";

type Overview = {
  project: {
    name: string;
    status: string;
    progress_pct: number;
    current_phase: string | null;
    next_milestone: string | null;
    eta: string | null;
  };
  modules: { id: string; name: string; status: string; progress_pct: number }[];
  openIssues: { id: string; number: number; title: string; priority: string; status: string }[];
  pendingSignatures: { id: string; title: string; doc_type: string }[];
};

type Deliverable = { id: string; module_id: string; title: string; done: boolean; sort_order: number };

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(`domani_session_${slug}`);
    if (!token) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/overview", { headers: h }),
      fetch("/api/deliverables", { headers: h }),
      fetch("/api/approvals", { headers: h }),
    ])
      .then(async ([ovRes, delRes, apRes]) => {
        if (ovRes.status === 401) {
          router.push(`/portal/${slug}/login`);
          return;
        }
        const ov = await ovRes.json();
        if (!ovRes.ok) {
          setError(ov.error ?? "Failed to load");
          return;
        }
        setData(ov);
        if (delRes.ok) setDeliverables((await delRes.json()).deliverables ?? []);
        if (apRes.ok) {
          const ap = await apRes.json();
          setPendingApprovals((ap.approvals ?? []).filter((a: { status: string }) => a.status === "pending").length);
        }
      })
      .catch(() => setError("Failed to load"));
  }, [slug, router]);

  if (error) return <main className="p-10 text-sm text-[#E88B7D]">{error}</main>;

  if (!data) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  const needsYou = pendingApprovals + data.pendingSignatures.length;

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      {/* ── Health ─────────────────────────────────────── */}
      <Panel className="p-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div>
              <Label>Engagement</Label>
              <h1 className="mt-1.5 text-2xl font-semibold">{data.project.name}</h1>
            </div>
            <StatusChip status={data.project.status} />
          </div>
          <ProgressRing value={data.project.progress_pct} size={104} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-[#1F1E1B] pt-6 sm:grid-cols-4">
          <Metric label="Phase" value={data.project.current_phase ?? "—"} />
          <Metric label="Next milestone" value={data.project.next_milestone ?? "—"} />
          <Metric label="Target date" value={data.project.eta ?? "—"} />
          <Metric label="Needs you" value={needsYou > 0 ? String(needsYou) : "Nothing"} accent={needsYou > 0} />
        </div>
      </Panel>

      {/* ── Needs you ──────────────────────────────────── */}
      {needsYou > 0 && (
        <section className="space-y-3">
          <Label>Awaiting your action</Label>
          <Panel className="divide-y divide-[#1F1E1B]">
            {pendingApprovals > 0 && (
              <a href={`/portal/${slug}/approvals`} className="flex items-center justify-between p-4 transition-colors hover:bg-[#161513]">
                <span className="text-sm">
                  {pendingApprovals} item{pendingApprovals === 1 ? "" : "s"} awaiting approval
                </span>
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#B8F0FF]">REVIEW →</span>
              </a>
            )}
            {data.pendingSignatures.map((d) => (
              <a key={d.id} href={`/portal/${slug}/documents`} className="flex items-center justify-between p-4 transition-colors hover:bg-[#161513]">
                <span className="text-sm">{d.title}</span>
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#B8F0FF]">SIGN →</span>
              </a>
            ))}
          </Panel>
        </section>
      )}

      {/* ── Modules ────────────────────────────────────── */}
      <section className="space-y-3">
        <Label>Build scope</Label>
        {data.modules.length === 0 && (
          <Panel>
            <EmptyState title="No modules defined yet." hint="Workstreams appear here once scoped." />
          </Panel>
        )}
        <div className="space-y-3">
          {data.modules.map((m) => {
            const items = deliverables.filter((d) => d.module_id === m.id).sort((a, b) => a.sort_order - b.sort_order);
            const done = items.filter((d) => d.done).length;
            return (
              <Panel key={m.id} className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <StatusChip status={m.status} />
                    <span className="font-[family-name:var(--font-dm-mono)] text-xs tabular-nums text-[#948E80]">
                      {m.progress_pct}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={m.progress_pct} />
                {items.length > 0 && (
                  <>
                    <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                      {done} of {items.length} delivered
                    </p>
                    <ul className="space-y-1.5">
                      {items.map((it) => (
                        <li key={it.id} className="flex items-start gap-2 text-xs">
                          <span className={it.done ? "text-[#7FD1A8]" : "text-[#2A2825]"}>{it.done ? "✓" : "○"}</span>
                          <span className={it.done ? "text-[#6B665C] line-through" : "text-[#948E80]"}>{it.title}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            );
          })}
        </div>
      </section>

      {/* ── Open issues ────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Open issues</Label>
          <a href={`/portal/${slug}/issues`} className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#6B665C] hover:text-[#B8F0FF]">
            ALL ISSUES →
          </a>
        </div>
        <Panel className="divide-y divide-[#1F1E1B]">
          {data.openIssues.length === 0 && <EmptyState title="No open issues." />}
          {data.openIssues.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm">
                <span className="font-[family-name:var(--font-dm-mono)] text-[#6B665C]">#{i.number}</span> {i.title}
              </span>
              <div className="flex items-center gap-2">
                <StatusChip status={i.priority} />
                <StatusChip status={i.status} />
              </div>
            </div>
          ))}
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.18em] text-[#6B665C]">
        {label}
      </p>
      <p className={`mt-1.5 text-sm ${accent ? "text-[#B8F0FF]" : "text-[#EDE9E2]"}`}>{value}</p>
    </div>
  );
}
