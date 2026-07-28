"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Input, Label, Panel, Select, Skeleton, StatusChip, Textarea } from "@/components/ui";

type Issue = {
  id: string;
  number: number;
  title: string;
  priority: string;
  status: string;
  created_at: string;
};
type Comment = { id: string; body: string; author_id: string; created_at: string };

const PRIORITIES = ["low", "medium", "high", "critical"];
const FILTERS = [
  { key: "open", label: "Open" },
  { key: "all", label: "All" },
  { key: "resolved", label: "Resolved" },
];

export default function IssuesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const [openIssue, setOpenIssue] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/issues", { headers: { Authorization: `Bearer ${t}` } });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? "Failed to load issues");
      setIssues([]);
      return;
    }
    setIssues(d.issues);
  }, []);

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

  async function submitIssue() {
    const t = tokenRef.current;
    if (!t || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, priority }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not create issue");
      return;
    }
    setTitle("");
    setDescription("");
    setPriority("medium");
    setShowForm(false);
    load(t);
  }

  async function openThread(id: string) {
    const t = tokenRef.current;
    if (!t) return;
    if (openIssue === id) {
      setOpenIssue(null);
      return;
    }
    setOpenIssue(id);
    setComments([]);
    const res = await fetch(`/api/issues/${id}`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setComments((await res.json()).comments ?? []);
  }

  async function addComment(id: string) {
    const t = tokenRef.current;
    if (!t || !commentText.trim()) return;
    await fetch(`/api/issues/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ body: commentText.trim() }),
    });
    setCommentText("");
    openThread(id);
    setOpenIssue(id);
  }

  const visible = (issues ?? []).filter((i) => {
    if (filter === "all") return true;
    if (filter === "resolved") return ["resolved", "closed"].includes(i.status);
    return !["resolved", "closed"].includes(i.status);
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Issues</h1>
          <p className="mt-1 text-sm text-[#948E80]">
            Report anything that needs attention. Everything here is tracked and answered.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "New issue"}</Button>
      </div>

      {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

      {showForm && (
        <Panel className="space-y-3 p-6">
          <Label>Report an issue</Label>
          <Input placeholder="Short summary" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="What happened, what you expected, and how to reproduce it"
            className="min-h-28"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Button onClick={submitIssue} disabled={submitting || !title.trim()}>
              {submitting ? "Submitting…" : "Submit issue"}
            </Button>
          </div>
        </Panel>
      )}

      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.15em] transition-colors ${
              filter === f.key ? "bg-[#1F1E1B] text-[#EDE9E2]" : "text-[#6B665C] hover:text-[#948E80]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!issues && <Skeleton className="h-32 w-full" />}
      {issues && visible.length === 0 && (
        <Panel>
          <EmptyState
            title={filter === "open" ? "No open issues." : "Nothing here."}
            hint={filter === "open" ? "Everything reported has been resolved." : undefined}
          />
        </Panel>
      )}

      {visible.length > 0 && (
        <Panel className="divide-y divide-[#1F1E1B]">
          {visible.map((i) => (
            <div key={i.id}>
              <button
                onClick={() => openThread(i.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[#161513]"
              >
                <span className="min-w-0 text-sm">
                  <span className="font-[family-name:var(--font-dm-mono)] text-[#6B665C]">#{i.number}</span>{" "}
                  {i.title}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                  <StatusChip status={i.priority} />
                  <StatusChip status={i.status} />
                </span>
              </button>

              {openIssue === i.id && (
                <div className="space-y-3 border-t border-[#1F1E1B] bg-[#0D0C0A] p-4">
                  {comments.length === 0 && (
                    <p className="text-xs text-[#6B665C]">No replies yet.</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-[#1F1E1B] bg-[#111110] px-3 py-2">
                      <p className="text-sm text-[#EDE9E2]">{c.body}</p>
                      <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-[9px] text-[#6B665C]">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a reply…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addComment(i.id)}
                    />
                    <Button variant="secondary" onClick={() => addComment(i.id)} disabled={!commentText.trim()}>
                      Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Panel>
      )}
    </main>
  );
}
