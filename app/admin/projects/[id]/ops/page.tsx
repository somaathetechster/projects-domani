"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Input, Label, Panel, Select, Skeleton, StatusChip } from "@/components/ui";

type Doc = {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  created_at: string;
  project_members: { email: string } | null;
};
type Invoice = { id: string; number: string; workstream: string | null; amount_minor: number; currency: string; status: string; due_on: string | null };
type Approval = { id: string; title: string; version: string | null; status: string; signed_name: string | null; resolved_at: string | null };
type Msg = { id: string; body: string; created_at: string; project_members: { email: string; role: string } | null };

const DOC_TYPES = ["sow", "contract", "invoice", "acceptance_certificate", "architecture", "meeting_notes", "other"];

export default function AdminOpsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);

  // forms
  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);

  const [invNumber, setInvNumber] = useState("");
  const [invWorkstream, setInvWorkstream] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDue, setInvDue] = useState("");

  const [apTitle, setApTitle] = useState("");
  const [apVersion, setApVersion] = useState("");

  const [chatText, setChatText] = useState("");

  function headers() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` };
  }

  const load = useCallback(async () => {
    const h = { Authorization: `Bearer ${tokenRef.current}` };
    const [dRes, iRes, aRes, mRes] = await Promise.all([
      fetch(`/api/admin-portal/documents?project_id=${id}`, { headers: h }),
      fetch(`/api/admin-portal/projects/${id}`, { headers: h }),
      fetch(`/api/admin-portal/approvals?project_id=${id}`, { headers: h }),
      fetch(`/api/admin-portal/messages?project_id=${id}`, { headers: h }),
    ]);
    if (dRes.status === 401) {
      router.push("/admin/login");
      return;
    }
    const [d, i, a, m] = await Promise.all([dRes.json(), iRes.json(), aRes.json(), mRes.json()]);
    setDocs(d.documents ?? []);
    setInvoices(i.invoices ?? []);
    setApprovals(a.approvals ?? []);
    setMsgs(m.messages ?? []);
  }, [id, router]);

  useEffect(() => {
    const t = sessionStorage.getItem("domani_admin_session");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    tokenRef.current = t;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load();
  }, [load, router]);

  async function uploadDoc() {
    if (!file || !docTitle.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const urlRes = await fetch("/api/admin-portal/documents", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ mode: "upload-url", project_id: id, filename: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error);

      const put = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error("Storage upload failed");

      const reg = await fetch("/api/admin-portal/documents", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          mode: "register",
          project_id: id,
          title: docTitle.trim(),
          doc_type: docType,
          storage_path: urlData.storagePath,
        }),
      });
      if (!reg.ok) throw new Error((await reg.json()).error);

      setFile(null);
      setDocTitle("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function download(docId: string) {
    const res = await fetch("/api/admin-portal/documents", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id: docId }),
    });
    const d = await res.json();
    if (res.ok && d.url) window.open(d.url, "_blank");
  }

  async function createInvoice() {
    if (!invNumber.trim() || !invAmount) return;
    const res = await fetch("/api/admin-portal/invoices", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        project_id: id,
        number: invNumber.trim(),
        workstream: invWorkstream.trim() || undefined,
        amount_major: Number(invAmount),
        due_on: invDue || undefined,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setInvNumber("");
    setInvWorkstream("");
    setInvAmount("");
    setInvDue("");
    load();
  }

  async function markInvoice(invoiceId: string, status: string) {
    await fetch("/api/admin-portal/invoices", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id: invoiceId, status }),
    });
    load();
  }

  async function requestApproval() {
    if (!apTitle.trim()) return;
    await fetch("/api/admin-portal/approvals", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ project_id: id, title: apTitle.trim(), version: apVersion.trim() || undefined }),
    });
    setApTitle("");
    setApVersion("");
    load();
  }

  async function sendChat() {
    if (!chatText.trim()) return;
    await fetch("/api/admin-portal/messages", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ project_id: id, body: chatText.trim() }),
    });
    setChatText("");
    load();
  }

  const money = (minor: number, cur: string) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(minor / 100);

  return (
    <main className="min-h-screen bg-[#080706] text-[#EDE9E2]">
      <div className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        <button
          onClick={() => router.push(`/admin/projects/${id}`)}
          className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C] hover:text-[#948E80]"
        >
          ← Project settings
        </button>
        <h1 className="text-2xl font-semibold">Operations</h1>
        {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

        {/* ── Documents ─────────────────────────── */}
        <section className="space-y-3">
          <Label>Documents</Label>
          <Panel className="space-y-3 p-5">
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !docTitle) setDocTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
              className="block w-full text-xs text-[#948E80] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1F1E1B] file:px-3 file:py-1.5 file:text-xs file:text-[#EDE9E2]"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Document title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              <Select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full">
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={uploadDoc} disabled={uploading || !file || !docTitle.trim()}>
              {uploading ? "Uploading…" : "Upload document"}
            </Button>
          </Panel>

          <Panel className="divide-y divide-[#1F1E1B]">
            {docs === null && <Skeleton className="m-4 h-16" />}
            {docs?.length === 0 && <EmptyState title="No documents yet." />}
            {docs?.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">{d.title}</p>
                  <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                    {d.doc_type.replace(/_/g, " ")} ·{" "}
                    {d.project_members?.email ? `uploaded by ${d.project_members.email}` : "uploaded by Domani"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={d.status} />
                  <Button variant="secondary" onClick={() => download(d.id)}>
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </Panel>
        </section>

        {/* ── Invoices ─────────────────────────── */}
        <section className="space-y-3">
          <Label>Invoices</Label>
          <Panel className="space-y-3 p-5">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Invoice number (INV-001)" value={invNumber} onChange={(e) => setInvNumber(e.target.value)} />
              <Input placeholder="Workstream (optional)" value={invWorkstream} onChange={(e) => setInvWorkstream(e.target.value)} />
              <Input type="number" min="0" placeholder="Amount (major units, e.g. 450000)" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} />
              <Input type="date" value={invDue} onChange={(e) => setInvDue(e.target.value)} />
            </div>
            <Button onClick={createInvoice} disabled={!invNumber.trim() || !invAmount}>
              Issue invoice
            </Button>
          </Panel>
          <Panel className="divide-y divide-[#1F1E1B]">
            {invoices.length === 0 && <EmptyState title="No invoices issued." />}
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">
                    {inv.number}
                    {inv.workstream && <span className="text-[#948E80]"> · {inv.workstream}</span>}
                  </p>
                  <p className="font-[family-name:var(--font-dm-mono)] text-[10px] tabular-nums text-[#6B665C]">
                    {money(inv.amount_minor, inv.currency)}
                    {inv.due_on && ` · due ${inv.due_on}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={inv.status} />
                  {inv.status !== "paid" && (
                    <Button variant="secondary" onClick={() => markInvoice(inv.id, "paid")}>
                      Mark paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Panel>
        </section>

        {/* ── Approvals ─────────────────────────── */}
        <section className="space-y-3">
          <Label>Approvals</Label>
          <Panel className="space-y-3 p-5">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="What needs approval" value={apTitle} onChange={(e) => setApTitle(e.target.value)} />
              <Input placeholder="Version (optional)" value={apVersion} onChange={(e) => setApVersion(e.target.value)} />
            </div>
            <Button onClick={requestApproval} disabled={!apTitle.trim()}>
              Request approval
            </Button>
          </Panel>
          <Panel className="divide-y divide-[#1F1E1B]">
            {approvals.length === 0 && <EmptyState title="No approvals requested." />}
            {approvals.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">
                    {a.title}
                    {a.version && <span className="text-[#948E80]"> · v{a.version}</span>}
                  </p>
                  {a.signed_name && (
                    <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                      Signed by {a.signed_name}
                      {a.resolved_at && ` · ${new Date(a.resolved_at).toLocaleString()}`}
                    </p>
                  )}
                </div>
                <StatusChip status={a.status} />
              </div>
            ))}
          </Panel>
        </section>

        {/* ── Chat ─────────────────────────────── */}
        <section className="space-y-3">
          <Label>Client chat</Label>
          <Panel className="max-h-80 space-y-2 overflow-y-auto p-4">
            {msgs.length === 0 && <EmptyState title="No messages yet." />}
            {msgs.map((m) => {
              const isStaff = m.project_members?.role === "domani_staff";
              return (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    isStaff ? "ml-auto bg-[#B8F0FF] text-[#080706]" : "border border-[#1F1E1B] bg-[#0D0C0A]"
                  }`}
                >
                  <p>{m.body}</p>
                  <p className={`mt-0.5 font-[family-name:var(--font-dm-mono)] text-[9px] ${isStaff ? "text-[#080706]/60" : "text-[#6B665C]"}`}>
                    {m.project_members?.email ?? "unknown"} · {new Date(m.created_at).toLocaleTimeString()}
                  </p>
                </div>
              );
            })}
          </Panel>
          <div className="flex gap-2">
            <Input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Message the client…"
            />
            <Button onClick={sendChat} disabled={!chatText.trim()}>
              Send
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
