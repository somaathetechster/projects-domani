"use client";

import { useEffect, useState } from "react";

type ProjectRow = { slug: string; status: string; displayName: string; logoUrl: string | null };

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);

  useEffect(() => {
    fetch("/api/public/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111111] flex flex-col items-center px-6 py-20">
      <div className="max-w-2xl w-full space-y-12">
        <div className="text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/domani-orbit.jpg" alt="Domani" className="h-24 w-24 mx-auto rounded-full" />
          <div className="text-lg font-medium tracking-[0.16em]">DOMANI</div>
          <p className="text-sm text-[#666]">Enterprise Delivery Platform — we build tomorrow.</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-[#666] text-center">Active engagements</p>

          {projects === null && <p className="text-sm text-[#666] text-center">Loading…</p>}

          {projects && projects.length === 0 && (
            <p className="text-sm text-[#666] text-center">No active engagements listed yet.</p>
          )}

          <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC] bg-white">
            {projects?.map((p) => (
              <a
                key={p.slug}
                href={`/portal/${p.slug}/login`}
                className="flex items-center justify-between p-4 hover:bg-[#F5F5F5] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.displayName} className="h-6 w-6 rounded object-contain" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-[#ECECEC]" />
                  )}
                  <span className="text-sm font-medium">{p.displayName}</span>
                </div>
                <span className="text-xs text-[#666] capitalize">{p.status.replace("_", " ")}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#666] text-center">
          Have login details for a project not listed here? Go directly to{" "}
          <span className="font-mono">portal.domanimedia.com/portal/&lt;your-project&gt;/login</span>
        </p>
      </div>
    </main>
  );
}