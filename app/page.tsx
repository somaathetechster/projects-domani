"use client";

import { useEffect, useState } from "react";
import { AmbientOrbit } from "@/components/AmbientOrbit";

type Engagement = { codename: string };

export default function HomePage() {
  const [engagements, setEngagements] = useState<Engagement[] | null>(null);

  useEffect(() => {
    fetch("/api/public/projects")
      .then((r) => r.json())
      .then((d) => setEngagements(d.engagements ?? []))
      .catch(() => setEngagements([]));
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080706] text-[#EDE9E2]">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col">
        <AmbientOrbit opacity={0.85} />

        {/* top bar */}
        <header className="relative z-10 flex items-center justify-between px-8 py-6 md:px-14">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/domani-orbit.jpg" alt="" className="h-8 w-8 rounded-full" />
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[0.4em] text-[#EDE9E2]">
              DOMANI
            </span>
          </div>
          <a
            href="https://www.domanimedia.com"
            className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.2em] text-[#6B665C] transition-colors hover:text-[#B8F0FF]"
          >
            DOMANIMEDIA.COM ↗
          </a>
        </header>

        {/* statement */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-8 md:px-14">
          <p className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.35em] text-[#B8F0FF]">
            CLIENT WORKSPACE · EST. 2026
          </p>
          <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] text-[#EDE9E2] md:text-8xl">
            The future belongs to organisations that behave like{" "}
            <span className="italic text-[#B8F0FF]">systems</span>.
          </h1>
          <p className="mt-8 max-w-md text-sm leading-relaxed text-[#948E80]">
            Domani — <span className="italic">tomorrow</span>. Every engagement in this workspace is
            infrastructure in motion: documented, signed, and built to outlast the conversation that
            started it.
          </p>
        </div>

        {/* scroll cue */}
        <div className="relative z-10 flex justify-center pb-10">
          <a
            href="#engagements"
            className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.3em] text-[#6B665C] transition-colors hover:text-[#B8F0FF]"
          >
            ACTIVE ENGAGEMENTS ↓
          </a>
        </div>

        {/* bottom fade into ledger */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-40 bg-gradient-to-b from-transparent to-[#080706]" />
      </section>

      {/* ── ENGAGEMENT LEDGER ────────────────────────────── */}
      <section id="engagements" className="relative px-8 py-24 md:px-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-baseline justify-between border-b border-[#1F1E1B] pb-6">
            <h2 className="font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[0.35em] text-[#948E80]">
              ACTIVE ENGAGEMENTS
            </h2>
            <span className="font-[family-name:var(--font-dm-mono)] text-[11px] tabular-nums text-[#6B665C]">
              {engagements ? String(engagements.length).padStart(2, "0") : "··"}
            </span>
          </div>

          <p className="mt-4 max-w-lg text-xs leading-relaxed text-[#6B665C]">
            Engagements are listed by codename. If Domani is building with you, you know yours —
            select it to sign in. Confidential engagements are not listed.
          </p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#1F1E1B] bg-[#1F1E1B] sm:grid-cols-2 lg:grid-cols-3">
            {engagements === null &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse bg-[#0D0C0A]" />
              ))}

            {engagements?.map((e, i) => (
              <a
                key={e.codename}
                href={`/portal/${e.codename.toLowerCase()}/login`}
                className="group relative flex h-36 flex-col justify-between bg-[#0D0C0A] p-6 transition-colors duration-200 hover:bg-[#111110]"
              >
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tabular-nums tracking-[0.2em] text-[#6B665C]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="block font-[family-name:var(--font-dm-mono)] text-lg tracking-[0.25em] text-[#EDE9E2] transition-colors group-hover:text-[#B8F0FF]">
                    {e.codename}
                  </span>
                  <span className="mt-1 block font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.15em] text-[#6B665C] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    SIGN IN →
                  </span>
                </div>
                <span className="absolute right-6 top-6 h-1.5 w-1.5 rounded-full bg-[#B8F0FF]/40 transition-colors group-hover:bg-[#B8F0FF]" />
              </a>
            ))}

            {engagements?.length === 0 && (
              <div className="col-span-full bg-[#0D0C0A] p-10 text-center text-sm text-[#6B665C]">
                No engagements are publicly listed.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-[#1F1E1B] px-8 py-10 md:px-14">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="font-[family-name:var(--font-display)] text-lg italic text-[#948E80]">
            We build tomorrow.
          </p>
          <p className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.2em] text-[#6B665C]">
            © {new Date().getFullYear()} DOMANI · ABUJA / WORLDWIDE
          </p>
        </div>
      </footer>
    </main>
  );
}
