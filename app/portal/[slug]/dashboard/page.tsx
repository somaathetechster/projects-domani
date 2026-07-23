"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(`domani_session_${slug}`);
    if (!token) {
      router.push(`/portal/${slug}/login`);
      return;
    }

    Promise.all([
      fetch("/api/overview", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/deliverables", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([ovRes, delRes]) => {
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
        if (delRes.ok) {
          const del = await delRes.json();
          setDeliverables(del.deliverables ?? []);
        }
      })
      .catch(() => setError("Failed to load"));
  }, [slug, router]);

  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-sm text-[#666] dark:text-[#888]">Loading…</main>;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#666] dark:text-[#888]">Domani Portal · {slug}</p>
        <h1 className="text-2xl font-semibold mt-1">{data.project.name}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Status" value={data.project.status.replace("_", " ")} />
        <Stat label="Progress" value={`${data.project.progress_pct}%`} />
        <Stat label="Phase" value={data.project.current_phase ?? "—"} />
        <Stat label="Next milestone" value={data.project.next_milestone ?? "—"} />
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-[#666] dark:text-[#888]">Modules</h2>
        {data.modules.length === 0 && <p className="text-sm text-[#666] dark:text-[#888]">No modules yet.</p>}
        {data.modules.map((m) => {
          const items = deliverables.filter((d) => d.module_id === m.id).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={m.id} className="border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.name}</span>
                <span className="text-xs text-[#666] dark:text-[#888]">{m.status.replace("_", " ")} · {m.progress_pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#ECECEC] dark:bg-[#2A2A2A] overflow-hidden">
                <div className="h-full bg-black dark:bg-white" style={{ width: `${m.progress_pct}%` }} />
              </div>
              {items.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {items.map((it) => (
                    <li key={it.id} className="text-xs flex items-center gap-2">
                      <span className={it.done ? "line-through text-[#999]" : ""}>
                        {it.done ? "✓" : "○"} {it.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#666] dark:text-[#888] mb-3">Open issues</h2>
        <div className="border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl divide-y divide-[#ECECEC] dark:divide-[#2A2A2A]">
          {data.openIssues.length === 0 && <p className="p-4 text-sm text-[#666] dark:text-[#888]">No open issues.</p>}
          {data.openIssues.map((i) => (
            <div key={i.id} className="flex items-center justify-between p-4">
              <span className="text-sm">#{i.number} {i.title}</span>
              <span className="text-xs text-[#666] dark:text-[#888]">{i.priority} · {i.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </section>

      {data.pendingSignatures.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[#666] dark:text-[#888] mb-3">Awaiting your signature</h2>
          <div className="border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl divide-y divide-[#ECECEC] dark:divide-[#2A2A2A]">
            {data.pendingSignatures.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-4">
                <span className="text-sm">{d.title}</span>
                <span className="text-xs text-[#666] dark:text-[#888]">{d.doc_type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl p-4">
      <p className="text-xs text-[#666] dark:text-[#888]">{label}</p>
      <p className="text-sm font-medium mt-1 capitalize">{value}</p>
    </div>
  );
}