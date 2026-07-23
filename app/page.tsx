"use client";

import { useEffect, useState } from "react";
import { AmbientOrbit } from "@/components/AmbientOrbit";

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
    <main className="relative min-h-screen bg-[#080706] text-[#EDE9E2] overflow-hidden">
      <AmbientOrbit opacity={0.6} />

      <div className="relative z-10 flex flex-col items-center px-6 py-24">
        <div className="max-w-xl w-full space-y-14">
          <div className="text-center space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/domani-orbit.jpg" alt="Domani" className="h-20 w-20 mx-auto rounded-full opacity-95" />
            <div className="font-[family-name:var(--font-dm-mono)] text-xs tracking-[0.4em] text-[#B8F0FF]">
              DOMANI
            </div>
            <p className="font-[family-name:var(--font-display)] italic text-2xl text-[#EDE9E2]">
              We build tomorrow.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.3em] text-[#948E80] text-center">
              Active Engagements
            </p>

            {projects === null && (
              <p className="text-sm text-[#948E80] text-center">Loading…</p>
            )}
            {projects && projects.length === 0 && (
              <p className="text-sm text-[#948E80] text-center">No active engagements listed yet.</p>
            )}

            <div className="border border-[#1F1E1B] rounded-xl divide-y divide-[#1F1E1B] bg-[#0D0C0A]/70 backdrop-blur-sm">
              {projects?.map((p) => (
                <a
                  key={p.slug}
                  href={`/portal/${p.slug}/login`}
                  className="flex items-center justify-between p-4 hover:bg-[#141310] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {p.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.logoUrl} alt={p.displayName} className="h-6 w-6 rounded object-contain" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-[#1F1E1B] border border-[#2A2925]" />
                    )}
                    <span className="text-sm font-medium">{p.displayName}</span>
                  </div>
                  <span className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-widest text-[#B8F0FF]/70">
                    {p.status.replace("_", " ")}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C] text-center tracking-wide">
            Have login details for a project not listed here? Go directly to your project&apos;s
            /login URL.
          </p>
        </div>
      </div>
    </main>
  );
}