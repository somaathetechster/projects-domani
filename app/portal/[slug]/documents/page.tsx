"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Doc = {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  created_at: string;
};

const DOC_TYPES = ["sow", "contract", "invoice", "acceptance_certificate", "architecture", "meeting_notes", "other"];

export default function DocumentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    loadDocs(t);
  }, [slug, router]);

  async function loadDocs(t: string) {
    setLoading(true);
    const res = await fetch("/api/documents", { headers: { Authorization: `Bearer ${t}` } });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to load documents");
      return;
    }
    setDocs(json.documents);
  }

  async function handleUpload() {
    const token = tokenRef.current;
    const file = fileInputRef.current?.files?.[0];
    if (!file || !token || !title.trim()) {
      setError("Pick a file and enter a title first");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // Step 1: get a signed upload URL scoped to this project
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? "Could not get upload URL");

      // Step 2: upload the file directly to Supabase Storage
      const uploadRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("File upload to storage failed");

      // Step 3: register the document record
      const registerRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, doc_type: docType, storage_path: urlData.storagePath }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.error ?? "Could not register document");

      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDocs(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(id: string) {
    const token = tokenRef.current;
    if (!token) return;
    const res = await fetch(`/api/documents/${id}/signed-url`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (res.ok) window.open(json.url, "_blank");
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#666]">Domani Portal · {slug}</p>
        <h1 className="text-2xl font-semibold mt-1">Documents</h1>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border border-[#ECECEC] rounded-xl p-4 space-y-3">
        <input
          placeholder="Document title"
          className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="w-full border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
        <input ref={fileInputRef} type="file" className="w-full text-sm" />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-black text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40"
        >
          {uploading ? "Uploading…" : "Upload document"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#666]">Loading…</p>
      ) : (
        <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC]">
          {docs.length === 0 && <p className="p-4 text-sm text-[#666]">No documents yet.</p>}
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm">{d.title}</p>
                <p className="text-xs text-[#666]">{d.doc_type.replace("_", " ")} · {d.status.replace("_", " ")}</p>
              </div>
              <button onClick={() => handleDownload(d.id)} className="text-xs underline">
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}