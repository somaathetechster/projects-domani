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

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(`domani_session_${slug}`);
    if (!token) {
      router.push(`/portal/${slug}/login`);
      return;
    }

    fetch("/api/overview", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401) {
          router.push(`/portal/${slug}/login`);
          return;
        }
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to load");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to load"));
  }, [slug, router]);

  if (error) return <main className="p-8 text-sm text-red-600">{error}</main>;
  if (!data) return <main className="p-8 text-sm text-[#666]">Loading…</main>;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#666]">Domani Portal · {slug}</p>
        <h1 className="text-2xl font-semibold mt-1">{data.project.name}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Status" value={data.project.status.replace("_", " ")} />
        <Stat label="Progress" value={`${data.project.progress_pct}%`} />
        <Stat label="Phase" value={data.project.current_phase ?? "—"} />
        <Stat label="Next milestone" value={data.project.next_milestone ?? "—"} />
      </div>

      <section>
        <h2 className="text-sm font-medium text-[#666] mb-3">Modules</h2>
        <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC]">
          {data.modules.length === 0 && <p className="p-4 text-sm text-[#666]">No modules yet.</p>}
          {data.modules.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <span className="text-sm">{m.name}</span>
              <span className="text-xs text-[#666]">{m.status.replace("_", " ")} · {m.progress_pct}%</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#666] mb-3">Open issues</h2>
        <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC]">
          {data.openIssues.length === 0 && <p className="p-4 text-sm text-[#666]">No open issues.</p>}
          {data.openIssues.map((i) => (
            <div key={i.id} className="flex items-center justify-between p-4">
              <span className="text-sm">#{i.number} {i.title}</span>
              <span className="text-xs text-[#666]">{i.priority} · {i.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </section>

      {data.pendingSignatures.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-[#666] mb-3">Awaiting your signature</h2>
          <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC]">
            {data.pendingSignatures.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-4">
                <span className="text-sm">{d.title}</span>
                <span className="text-xs text-[#666]">{d.doc_type.replace("_", " ")}</span>
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
    <div className="border border-[#ECECEC] rounded-xl p-4">
      <p className="text-xs text-[#666]">{label}</p>
      <p className="text-sm font-medium mt-1 capitalize">{value}</p>
    </div>
  );
}