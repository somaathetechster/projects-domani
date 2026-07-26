"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmptyState, Panel, Skeleton, StatusChip } from "@/components/ui";

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

function formatMoney(minor: number, currency: string) {
  const major = minor / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

export default function InvoicesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    fetch("/api/invoices", { headers: { Authorization: `Bearer ${t}` } })
      .then(async (r) => {
        if (r.status === 401) {
          router.push(`/portal/${slug}/login`);
          return;
        }
        const d = await r.json();
        if (!r.ok) {
          setError(d.error ?? "Failed to load");
          return;
        }
        setInvoices(d.invoices);
      })
      .catch(() => setError("Failed to load"));
  }, [slug, router]);

  const totalOutstanding = (invoices ?? [])
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount_minor, 0);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        {invoices && invoices.length > 0 && (
          <p className="mt-1 text-sm text-[#948E80]">
            Outstanding:{" "}
            <span className="font-[family-name:var(--font-dm-mono)] tabular-nums text-[#EDE9E2]">
              {formatMoney(totalOutstanding, invoices[0].currency)}
            </span>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-[#E88B7D]">{error}</p>}
      {!invoices && <Skeleton className="h-32 w-full" />}
      {invoices?.length === 0 && (
        <Panel>
          <EmptyState title="No invoices yet." />
        </Panel>
      )}

      {invoices && invoices.length > 0 && (
        <Panel className="divide-y divide-[#1F1E1B]">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-medium">
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
                <span className="font-[family-name:var(--font-dm-mono)] text-sm tabular-nums">
                  {formatMoney(inv.amount_minor, inv.currency)}
                </span>
                <StatusChip status={inv.status} />
                <a
                  href={`/portal/${slug}/invoices/${inv.id}/print`}
                  className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#948E80] hover:text-[#B8F0FF]"
                >
                  PDF
                </a>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </main>
  );
}
