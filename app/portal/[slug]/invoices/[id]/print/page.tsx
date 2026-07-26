"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Invoice = {
  id: string;
  number: string;
  workstream: string | null;
  amount_minor: number;
  currency: string;
  status: string;
  issued_on: string | null;
  due_on: string | null;
  paid_on: string | null;
};

const fmt = (minor: number, cur: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(minor / 100);

export default function InvoicePrintPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [codename, setCodename] = useState("");

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    fetch("/api/invoices", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => setInvoice((d.invoices ?? []).find((i: Invoice) => i.id === id) ?? null));
    fetch(`/api/public/project/${slug}`)
      .then((r) => r.json())
      .then((d) => setCodename(d.codename ?? ""));
  }, [slug, id, router]);

  if (!invoice) return <main className="p-10 text-sm text-[#948E80]">Loading…</main>;

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-12 py-14 text-[#080706] print:px-0 print:py-0">
      {/* screen-only toolbar */}
      <div className="mb-10 flex justify-between print:hidden">
        <button onClick={() => router.back()} className="text-xs text-[#6B665C]">
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-[#080706] px-4 py-2 text-xs text-white"
        >
          Download PDF
        </button>
      </div>

      {/* letterhead */}
      <header className="flex items-start justify-between border-b-2 border-[#080706] pb-8">
        <div>
          <p className="font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[0.4em]">DOMANI</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-sm italic text-[#6B665C]">
            We build tomorrow.
          </p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-dm-mono)] text-2xl tracking-wide">INVOICE</p>
          <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-xs text-[#6B665C]">{invoice.number}</p>
        </div>
      </header>

      {/* meta */}
      <section className="mt-10 grid grid-cols-3 gap-8 font-[family-name:var(--font-dm-mono)] text-[11px]">
        <div>
          <p className="tracking-[0.2em] text-[#6B665C]">ENGAGEMENT</p>
          <p className="mt-1.5 tracking-[0.15em]">{codename}</p>
        </div>
        <div>
          <p className="tracking-[0.2em] text-[#6B665C]">ISSUED</p>
          <p className="mt-1.5">{invoice.issued_on ?? "—"}</p>
        </div>
        <div>
          <p className="tracking-[0.2em] text-[#6B665C]">DUE</p>
          <p className="mt-1.5">{invoice.due_on ?? "On receipt"}</p>
        </div>
      </section>

      {/* line */}
      <section className="mt-12">
        <div className="flex justify-between border-b border-[#080706] pb-2 font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.2em] text-[#6B665C]">
          <span>DESCRIPTION</span>
          <span>AMOUNT</span>
        </div>
        <div className="flex items-baseline justify-between py-6">
          <span className="text-sm">{invoice.workstream ?? "Professional services"}</span>
          <span className="font-[family-name:var(--font-dm-mono)] text-sm tabular-nums">
            {fmt(invoice.amount_minor, invoice.currency)}
          </span>
        </div>
        <div className="flex items-baseline justify-between border-t-2 border-[#080706] pt-4">
          <span className="font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[0.25em]">TOTAL DUE</span>
          <span className="font-[family-name:var(--font-dm-mono)] text-2xl tabular-nums">
            {fmt(invoice.amount_minor, invoice.currency)}
          </span>
        </div>
        {invoice.status === "paid" && (
          <p className="mt-4 inline-block rounded border border-[#080706] px-3 py-1 font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.3em]">
            PAID {invoice.paid_on ?? ""}
          </p>
        )}
      </section>

      <footer className="mt-24 border-t border-[#E0DCD3] pt-6 font-[family-name:var(--font-dm-mono)] text-[9px] leading-relaxed tracking-wide text-[#6B665C]">
        <p>DOMANI · DESIGN, ENGINEERING & AI STUDIO · ABUJA, NIGERIA · OPERATING WORLDWIDE</p>
        <p>DOMANIMEDIA.COM · GENERATED FROM DOMANI WORKSPACE</p>
      </footer>
    </main>
  );
}
