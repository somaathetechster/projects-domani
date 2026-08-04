"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Label, Panel, Select, Skeleton, StatusChip, Textarea } from "@/components/ui";

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
type Query = { id: string; type: string; body: string; created_at: string };

function fmt(minor: number, cur: string) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(minor / 100);
}

const QUERY_TYPES = [
  { key: "payment_made", label: "I've made this payment" },
  { key: "query", label: "I have a question" },
  { key: "dispute", label: "I want to dispute this" },
];

export default function InvoicesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [queries, setQueries] = useState<Record<string, Query[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [queryType, setQueryType] = useState("payment_made");
  const [queryText, setQueryText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/invoices", { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setInvoices((await res.json()).invoices ?? []);
  }, []);

  async function loadQueries(invoiceId: string, t: string) {
    const res = await fetch(`/api/invoice-queries?invoice_id=${invoiceId}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) { const d = await res.json(); setQueries(prev => ({ ...prev, [invoiceId]: d.queries ?? [] })); }
  }

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) { router.push(`/portal/${slug}/login`); return; }
    tokenRef.current = t;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load(t);
  }, [slug, router, load]);

  function toggleOpen(id: string) {
    const t = tokenRef.current;
    if (!t) return;
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!queries[id]) loadQueries(id, t);
  }

  async function submitQuery(invoiceId: string) {
    const t = tokenRef.current;
    if (!t || !queryText.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/invoice-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ invoice_id: invoiceId, type: queryType, body: queryText.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    setQueryText("");
    loadQueries(invoiceId, t);
  }

  const outstanding = (invoices ?? [])
    .filter(i => ["pending", "overdue"].includes(i.status))
    .reduce((s, i) => s + i.amount_minor, 0);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        {invoices && invoices.length > 0 && outstanding > 0 && (
          <p className="mt-1 text-sm text-[#948E80]">
            Outstanding:{" "}
            <span className="font-[family-name:var(--font-dm-mono)] tabular-nums text-[#EDE9E2]">
              {fmt(outstanding, invoices[0].currency)}
            </span>
          </p>
        )}
        {invoices && outstanding === 0 && <p className="mt-1 text-sm text-[#7FD1A8]">All invoices settled. Thank you.</p>}
      </div>

      {error && <p className="text-sm text-[#E88B7D]">{error}</p>}
      {!invoices && <Skeleton className="h-32 w-full" />}
      {invoices?.length === 0 && (
        <Panel><EmptyState title="No invoices yet." /></Panel>
      )}

      {invoices?.map(inv => (
        <Panel key={inv.id} className="overflow-hidden">
          <button onClick={() => toggleOpen(inv.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-[#161513]">
            <div>
              <p className="text-sm font-medium text-[#EDE9E2]">
                {inv.number}
                {inv.workstream && <span className="text-[#948E80]"> · {inv.workstream}</span>}
              </p>
              <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                {inv.issued_on && `Issued ${inv.issued_on}`}
                {inv.due_on && ` · Due ${inv.due_on}`}
                {inv.paid_on && ` · Paid ${inv.paid_on}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-dm-mono)] text-sm tabular-nums text-[#EDE9E2]">
                {fmt(inv.amount_minor, inv.currency)}
              </span>
              <StatusChip status={inv.status} />
              <a
                href={`/portal/${slug}/invoices/${inv.id}/print`}
                onClick={e => e.stopPropagation()}
                className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#6B665C] hover:text-[#B8F0FF]"
              >
                PDF
              </a>
              <span className="text-[#6B665C]">{open === inv.id ? "↑" : "↓"}</span>
            </div>
          </button>

          {open === inv.id && (
            <div className="border-t border-[#1F1E1B] bg-[#0A0908] p-5 space-y-4">
              <Label>Invoice action</Label>
              <p className="text-xs text-[#948E80]">
                {inv.status === "paid"
                  ? "This invoice has been marked paid. Contact Domani via Chat if you have any questions."
                  : "Made a payment? Have a question or concern? Let us know here — we will get back to you."}
              </p>

              {/* Previous queries */}
              {queries[inv.id]?.map(q => (
                <div key={q.id} className="rounded-lg border border-[#1F1E1B] bg-[#111110] p-3">
                  <p className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#B8F0FF]">
                    {QUERY_TYPES.find(t => t.key === q.type)?.label ?? q.type}
                  </p>
                  <p className="mt-1 text-sm text-[#EDE9E2]">{q.body}</p>
                  <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                    {new Date(q.created_at).toLocaleString()}
                  </p>
                </div>
              ))}

              <div className="space-y-3">
                <Select value={queryType} onChange={e => setQueryType(e.target.value)} className="w-full">
                  {QUERY_TYPES.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </Select>
                <Textarea
                  placeholder="Details — transaction reference, question, or concern"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  className="min-h-20"
                />
                <Button onClick={() => submitQuery(inv.id)} disabled={submitting || !queryText.trim()}>
                  {submitting ? "Sending…" : "Send to Domani"}
                </Button>
              </div>
            </div>
          )}
        </Panel>
      ))}
    </main>
  );
}
