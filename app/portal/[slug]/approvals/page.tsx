"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Input, Panel, StatusChip, Textarea, Label, Skeleton } from "@/components/ui";

type Approval = {
  id: string;
  title: string;
  version: string | null;
  description: string | null;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

export default function ApprovalsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [approvals, setApprovals] = useState<Approval[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [signing, setSigning] = useState<string | null>(null); // approval id in signing flow
  const [signedName, setSignedName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (t: string) => {
      const res = await fetch("/api/approvals", { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) {
        router.push(`/portal/${slug}/login`);
        return;
      }
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Failed to load");
        return;
      }
      setApprovals(d.approvals);
    },
    [slug, router]
  );

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load(t);
  }, [slug, router, load]);

  async function decide(id: string, decision: "approved" | "changes_requested") {
    if (!tokenRef.current) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/approvals/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({
        approval_id: id,
        decision,
        note: note.trim() || undefined,
        signed_name: decision === "approved" ? signedName : undefined,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(d.error ?? "Something went wrong");
      return;
    }
    setSigning(null);
    setSignedName("");
    setNote("");
    load(tokenRef.current);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="mt-1 text-sm text-[#948E80]">
          Approving an item records your typed name, the time, and your IP address as an electronic signature.
        </p>
      </div>

      {error && <p className="text-sm text-[#E88B7D]">{error}</p>}
      {!approvals && <Skeleton className="h-32 w-full" />}
      {approvals?.length === 0 && (
        <Panel>
          <EmptyState title="Nothing awaiting your approval." />
        </Panel>
      )}

      {approvals?.map((a) => (
        <Panel key={a.id} className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">{a.title}</h2>
              <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">
                {a.version ? `Version ${a.version} · ` : ""}
                Requested {new Date(a.requested_at).toLocaleDateString()}
              </p>
            </div>
            <StatusChip status={a.status} />
          </div>

          {a.description && <p className="text-sm text-[#948E80]">{a.description}</p>}

          {a.status === "pending" && signing !== a.id && (
            <div className="flex gap-2">
              <Button onClick={() => setSigning(a.id)}>Review & approve</Button>
              <Button variant="secondary" onClick={() => decide(a.id, "changes_requested")} disabled={busy}>
                Request changes
              </Button>
            </div>
          )}

          {signing === a.id && (
            <div className="space-y-3 rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] p-4">
              <Label>Electronic signature</Label>
              <p className="text-xs text-[#948E80]">
                You are approving &ldquo;{a.title}&rdquo;{a.version ? ` (version ${a.version})` : ""}. Type your
                full legal name to sign. This action is recorded and cannot be undone.
              </p>
              <Input
                placeholder="Your full name"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
              />
              <Textarea
                placeholder="Optional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-16"
              />
              <div className="flex gap-2">
                <Button onClick={() => decide(a.id, "approved")} disabled={busy || signedName.trim().length < 3}>
                  {busy ? "Signing…" : "Sign & approve"}
                </Button>
                <Button variant="ghost" onClick={() => setSigning(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {a.status === "approved" && (
            <Button variant="secondary" onClick={() => router.push(`/portal/${slug}/approvals/${a.id}/certificate`)}>
              Acceptance certificate
            </Button>
          )}

          {a.status !== "pending" && (
            <p className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">
              {a.status === "approved" ? "Approved" : "Changes requested"}
              {a.resolved_at ? ` · ${new Date(a.resolved_at).toLocaleString()}` : ""}
              {a.resolution_note ? ` · "${a.resolution_note}"` : ""}
            </p>
          )}
        </Panel>
      ))}
    </main>
  );
}
