"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Input, Label, Panel, Skeleton, StatusChip, Textarea } from "@/components/ui";

type Approval = {
  id: string;
  title: string;
  version: string | null;
  description: string | null;
  context: string | null;
  verification_steps: string | null;
  review_location: string | null;
  deadline: string | null;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  signed_name: string | null;
};
type Comment = { id: string; author_label: string; author_role: string; body: string; created_at: string };

export default function ApprovalsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [signing, setSigning] = useState<string | null>(null);
  const [signedName, setSignedName] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/approvals", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) { router.push(`/portal/${slug}/login`); return; }
    const d = await res.json();
    if (res.ok) setApprovals(d.approvals ?? []);
  }, [slug, router]);

  async function loadComments(approvalId: string, t: string) {
    const res = await fetch(`/api/approval-comments?approval_id=${approvalId}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) { const d = await res.json(); setComments(prev => ({ ...prev, [approvalId]: d.comments ?? [] })); }
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
    if (!comments[id]) loadComments(id, t);
  }

  async function addComment(approvalId: string) {
    const t = tokenRef.current;
    if (!t || !commentText.trim()) return;
    setBusy(true);
    const res = await fetch("/api/approval-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ approval_id: approvalId, body: commentText.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setCommentText("");
      loadComments(approvalId, t);
    }
  }

  async function decide(id: string, decision: "approved" | "changes_requested") {
    const t = tokenRef.current;
    if (!t) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/approvals/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ approval_id: id, decision, note: resolutionNote.trim() || undefined, signed_name: signedName }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error ?? "Something went wrong"); return; }
    setSigning(null); setSignedName(""); setResolutionNote("");
    load(t);
  }

  const pending = (approvals ?? []).filter(a => a.status === "pending");
  const resolved = (approvals ?? []).filter(a => a.status !== "pending");

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="mt-1 text-sm text-[#948E80]">
          Review what Domani is asking you to sign off on. Approving records your name, timestamp,
          and IP as an electronic signature — immutable and auditable.
        </p>
      </div>

      {error && <p className="text-sm text-[#E88B7D]">{error}</p>}
      {!approvals && <Skeleton className="h-32 w-full" />}

      {/* ── PENDING ──────────────────────────────────────── */}
      {pending.length > 0 && (
        <section className="space-y-4">
          <Label>Awaiting your decision</Label>
          {pending.map(a => (
            <ApprovalCard
              key={a.id}
              approval={a}
              open={open === a.id}
              signing={signing === a.id}
              comments={comments[a.id] ?? null}
              commentText={open === a.id ? commentText : ""}
              busy={busy}
              signedName={signedName}
              resolutionNote={resolutionNote}
              slug={slug}
              onToggle={() => toggleOpen(a.id)}
              onCommentChange={setCommentText}
              onAddComment={() => addComment(a.id)}
              onStartSign={() => { setSigning(a.id); setOpen(a.id); if (tokenRef.current) loadComments(a.id, tokenRef.current); }}
              onCancelSign={() => setSigning(null)}
              onSignedNameChange={setSignedName}
              onResolutionNoteChange={setResolutionNote}
              onApprove={() => decide(a.id, "approved")}
              onRequestChanges={() => decide(a.id, "changes_requested")}
            />
          ))}
        </section>
      )}

      {/* ── RESOLVED ─────────────────────────────────────── */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <Label>Resolved</Label>
          {resolved.map(a => (
            <ApprovalCard
              key={a.id}
              approval={a}
              open={open === a.id}
              signing={false}
              comments={comments[a.id] ?? null}
              commentText={open === a.id ? commentText : ""}
              busy={busy}
              signedName=""
              resolutionNote=""
              slug={slug}
              onToggle={() => toggleOpen(a.id)}
              onCommentChange={setCommentText}
              onAddComment={() => addComment(a.id)}
              onStartSign={() => {}}
              onCancelSign={() => {}}
              onSignedNameChange={() => {}}
              onResolutionNoteChange={() => {}}
              onApprove={() => {}}
              onRequestChanges={() => {}}
            />
          ))}
        </section>
      )}

      {approvals?.length === 0 && (
        <Panel><EmptyState title="No approvals yet." hint="Domani will send items here when your sign-off is needed." /></Panel>
      )}
    </main>
  );
}

function ApprovalCard({
  approval, open, signing, comments, commentText, busy, signedName, resolutionNote, slug,
  onToggle, onCommentChange, onAddComment, onStartSign, onCancelSign,
  onSignedNameChange, onResolutionNoteChange, onApprove, onRequestChanges
}: {
  approval: Approval; open: boolean; signing: boolean;
  comments: Comment[] | null; commentText: string; busy: boolean;
  signedName: string; resolutionNote: string; slug: string;
  onToggle: () => void; onCommentChange: (v: string) => void;
  onAddComment: () => void; onStartSign: () => void; onCancelSign: () => void;
  onSignedNameChange: (v: string) => void; onResolutionNoteChange: (v: string) => void;
  onApprove: () => void; onRequestChanges: () => void;
}) {
  const a = approval;
  const isPending = a.status === "pending";

  return (
    <Panel className="overflow-hidden">
      {/* ── Header row ── */}
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-[#161513]">
        <div className="space-y-1 min-w-0">
          <h3 className="text-base font-medium text-[#EDE9E2]">{a.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {a.version && <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">v{a.version}</span>}
            {a.deadline && (
              <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#E8C07D]">
                Sign by {new Date(a.deadline).toLocaleDateString()}
              </span>
            )}
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
              {new Date(a.requested_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <StatusChip status={a.status} />
          <span className="text-[#6B665C]">{open ? "↑" : "↓"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#1F1E1B]">
          {/* ── Rich detail fields ── */}
          <div className="space-y-5 p-5">
            {a.description && (
              <Field label="What this is">
                <p className="text-sm text-[#948E80] leading-relaxed">{a.description}</p>
              </Field>
            )}
            {a.context && (
              <Field label="Background">
                <p className="text-sm text-[#948E80] leading-relaxed">{a.context}</p>
              </Field>
            )}
            {a.verification_steps && (
              <Field label="How to review this">
                <p className="text-sm text-[#948E80] leading-relaxed whitespace-pre-wrap">{a.verification_steps}</p>
              </Field>
            )}
            {a.review_location && (
              <Field label="Where to review">
                {a.review_location.startsWith("http") ? (
                  <a href={a.review_location} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#B8F0FF] underline break-all">
                    {a.review_location}
                  </a>
                ) : (
                  <p className="text-sm text-[#948E80]">{a.review_location}</p>
                )}
              </Field>
            )}

            {/* Resolved note */}
            {!isPending && (
              <div className="rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] p-4 space-y-1">
                <p className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#6B665C]">
                  {a.status === "approved" ? "SIGNED & ACCEPTED" : "CHANGES REQUESTED"}
                  {a.resolved_at && ` · ${new Date(a.resolved_at).toLocaleString()}`}
                </p>
                {a.signed_name && <p className="text-sm italic text-[#EDE9E2]">{a.signed_name}</p>}
                {a.resolution_note && <p className="text-sm text-[#948E80]">{a.resolution_note}</p>}
                {a.status === "approved" && (
                  <a href={`/portal/${slug}/approvals/${a.id}/certificate`}
                    className="mt-2 inline-block font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wide text-[#B8F0FF] hover:underline">
                    DOWNLOAD ACCEPTANCE CERTIFICATE →
                  </a>
                )}
              </div>
            )}

            {/* Actions */}
            {isPending && !signing && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={onStartSign}>Approve & sign</Button>
                <Button variant="secondary" onClick={onRequestChanges} disabled={busy}>
                  Request changes
                </Button>
              </div>
            )}

            {isPending && signing && (
              <div className="space-y-3 rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] p-4">
                <Label>Electronic signature</Label>
                <p className="text-xs text-[#948E80]">
                  You are signing off on &ldquo;{a.title}&rdquo;
                  {a.version ? ` (v${a.version})` : ""}. Type your full legal name. This is recorded
                  with the timestamp and your IP address and cannot be undone.
                </p>
                <Input placeholder="Your full legal name" value={signedName} onChange={e => onSignedNameChange(e.target.value)} />
                <Textarea
                  placeholder="Optional note for the record"
                  value={resolutionNote}
                  onChange={e => onResolutionNoteChange(e.target.value)}
                  className="min-h-16"
                />
                <div className="flex gap-2">
                  <Button onClick={onApprove} disabled={busy || signedName.trim().length < 3}>
                    {busy ? "Signing…" : "Confirm & sign"}
                  </Button>
                  <Button variant="ghost" onClick={onCancelSign}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Comment thread ── */}
          <div className="border-t border-[#1F1E1B] bg-[#0A0908] p-5 space-y-4">
            <Label>Discussion</Label>
            {comments === null && <p className="text-xs text-[#6B665C]">Loading…</p>}
            {comments?.length === 0 && <p className="text-xs text-[#6B665C]">No comments yet. Ask a question or note a concern below.</p>}
            {(comments ?? []).map(c => (
              <div key={c.id} className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                c.author_role === "client" ? "ml-auto bg-[#B8F0FF] text-[#080706]"
                : "border border-[#1F1E1B] bg-[#111110] text-[#EDE9E2]"
              }`}>
                <p className="whitespace-pre-wrap">{c.body}</p>
                <p className={`mt-1 font-[family-name:var(--font-dm-mono)] text-[9px] ${c.author_role === "client" ? "text-[#080706]/60" : "text-[#6B665C]"}`}>
                  {c.author_label}
                  {c.author_role !== "client" ? " · Domani" : ""} ·{" "}
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question or note a concern…"
                value={commentText}
                onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onAddComment()}
              />
              <Button variant="secondary" onClick={onAddComment} disabled={busy || !commentText.trim()}>
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.18em] text-[#6B665C]">{label}</p>
      {children}
    </div>
  );
}
