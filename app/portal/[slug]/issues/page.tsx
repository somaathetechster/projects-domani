"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Issue = {
  id: string;
  number: number;
  title: string;
  priority: string;
  status: string;
  created_at: string;
};

type Comment = {
  id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
};

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "investigating", "in_progress", "awaiting_client", "resolved", "closed"];

export default function IssuesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    loadIssues(t);
  }, [slug, router]);

  async function loadIssues(t: string) {
    setLoading(true);
    const res = await fetch("/api/issues", { headers: { Authorization: `Bearer ${t}` } });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to load issues");
      return;
    }
    setIssues(json.issues);
  }

  async function createIssue() {
    const token = tokenRef.current;
    if (!token || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, description, priority }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to create issue");
      return;
    }
    setTitle("");
    setDescription("");
    setPriority("medium");
    setShowForm(false);
    loadIssues(token);
  }

  async function openIssue(id: string) {
    const token = tokenRef.current;
    if (!token) return;
    setSelectedId(id);
    const res = await fetch(`/api/issues/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (res.ok) setComments(json.comments);
  }

  async function updateStatus(id: string, status: string) {
    const token = tokenRef.current;
    if (!token) return;
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadIssues(token);
  }

  async function postComment() {
    const token = tokenRef.current;
    if (!token || !selectedId || !commentBody.trim()) return;
    const res = await fetch(`/api/issues/${selectedId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: commentBody }),
    });
    if (res.ok) {
      setCommentBody("");
      openIssue(selectedId);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#666]">Domani Portal · {slug}</p>
          <h1 className="text-2xl font-semibold mt-1">Issues</h1>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-black text-white text-sm rounded-lg px-4 py-2"
        >
          {showForm ? "Cancel" : "New Issue"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <div className="border border-[#ECECEC] rounded-xl p-4 space-y-3">
          <input
            placeholder="Title"
            className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description (optional)"
            className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={createIssue}
            disabled={submitting || !title.trim()}
            className="bg-black text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit issue"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#666]">Loading…</p>
      ) : (
        <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC]">
          {issues.length === 0 && <p className="p-4 text-sm text-[#666]">No issues yet.</p>}
          {issues.map((i) => (
            <div key={i.id} className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => openIssue(i.id)}>
                <span className="text-sm">#{i.number} {i.title}</span>
                <span className="text-xs text-[#666]">{i.priority} · {i.status.replace("_", " ")}</span>
              </div>

              {selectedId === i.id && (
                <div className="mt-4 pl-4 border-l-2 border-[#ECECEC] space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(i.id, s)}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          i.status === s ? "bg-black text-white border-black" : "border-[#ECECEC] text-[#666]"
                        }`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="text-sm bg-[#FAFAFA] rounded-lg p-2">
                        {c.body}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Add a comment…"
                      className="flex-1 border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                    />
                    <button
                      onClick={postComment}
                      disabled={!commentBody.trim()}
                      className="bg-black text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}