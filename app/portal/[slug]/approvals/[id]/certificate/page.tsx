"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Approval = {
  id: string;
  title: string;
  version: string | null;
  description: string | null;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  signed_name?: string | null;
};

export default function CertificatePage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [codename, setCodename] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    fetch("/api/approvals", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        const a = (d.approvals ?? []).find((x: Approval) => x.id === id);
        if (!a) setNotFound(true);
        else setApproval(a);
      });
    fetch(`/api/public/project/${slug}`)
      .then((r) => r.json())
      .then((d) => setCodename(d.codename ?? ""));
  }, [slug, id, router]);

  if (notFound) return <main className="p-10 text-sm text-[#948E80]">Certificate not found.</main>;
  if (!approval) return <main className="p-10 text-sm text-[#948E80]">Loading…</main>;
  if (approval.status !== "approved") {
    return (
      <main className="p-10 text-sm text-[#948E80]">
        A certificate is only available once this item has been approved and signed.
      </main>
    );
  }

  const signedDate = approval.resolved_at
    ? new Date(approval.resolved_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white px-12 py-14 text-[#080706] print:px-0 print:py-0">
      <div className="mb-10 flex justify-between print:hidden">
        <button onClick={() => router.back()} className="text-xs text-[#6B665C]">
          ← Back
        </button>
        <button onClick={() => window.print()} className="rounded-lg bg-[#080706] px-4 py-2 text-xs text-white">
          Download PDF
        </button>
      </div>

      {/* framed certificate */}
      <div className="border-2 border-[#080706] p-1">
        <div className="border border-[#080706] px-10 py-14 text-center">
          <p className="font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[0.5em]">DOMANI</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xs italic text-[#6B665C]">
            We build tomorrow.
          </p>

          <h1 className="mt-12 font-[family-name:var(--font-display)] text-3xl">
            Certificate of Acceptance
          </h1>

          <p className="mx-auto mt-10 max-w-md text-sm leading-relaxed text-[#3A3833]">
            This certifies that the deliverable identified below has been reviewed and formally
            accepted under engagement <span className="font-[family-name:var(--font-dm-mono)] tracking-[0.15em]">{codename}</span>.
          </p>

          <div className="mx-auto mt-10 max-w-md border-y border-[#080706] py-6">
            <p className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.25em] text-[#6B665C]">
              DELIVERABLE
            </p>
            <p className="mt-2 text-lg">{approval.title}</p>
            {approval.version && (
              <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">
                Version {approval.version}
              </p>
            )}
          </div>

          <div className="mx-auto mt-12 grid max-w-md grid-cols-2 gap-10 text-left">
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl italic">
                {approval.signed_name ?? "—"}
              </p>
              <div className="mt-1 border-t border-[#080706] pt-1.5">
                <p className="font-[family-name:var(--font-dm-mono)] text-[9px] tracking-[0.25em] text-[#6B665C]">
                  ACCEPTED & ELECTRONICALLY SIGNED
                </p>
              </div>
            </div>
            <div>
              <p className="font-[family-name:var(--font-dm-mono)] text-sm">{signedDate}</p>
              <div className="mt-1 border-t border-[#080706] pt-1.5">
                <p className="font-[family-name:var(--font-dm-mono)] text-[9px] tracking-[0.25em] text-[#6B665C]">
                  DATE OF ACCEPTANCE
                </p>
              </div>
            </div>
          </div>

          {approval.resolution_note && (
            <p className="mx-auto mt-8 max-w-md text-xs italic text-[#6B665C]">
              &ldquo;{approval.resolution_note}&rdquo;
            </p>
          )}

          <p className="mt-14 font-[family-name:var(--font-dm-mono)] text-[8px] leading-relaxed tracking-wider text-[#948E80]">
            SIGNATURE, TIMESTAMP AND ORIGINATING IP ADDRESS ARE RECORDED IN THE DOMANI WORKSPACE
            AUDIT LOG. CERT-{approval.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    </main>
  );
}
