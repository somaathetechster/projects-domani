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
  project_members: { email: string; display_name: string | null } | null;
};

const DOC_TYPES = ["sow", "contract", "invoice", "acceptance_certificate", "architecture", "meeting_notes", "other"];

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  // File is held in state, not just a ref, so the UI can react to it —
  // this is what lets the button disable correctly and show the filename.
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const loadDocs = useCallback(async (t: string) => {
    const res = await fetch("/api/documents", { headers: { Authorization: `Bearer ${t}` } });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load documents");
      setDocs([]);
      return;
    }
    setDocs(json.documents);
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    loadDocs(t);
  }, [slug, router, loadDocs]);

  function selectFile(f: File | null) {
    setError(null);
    if (f && f.size > MAX_BYTES) {
      setError(`That file is ${humanSize(f.size)}. The limit is 25 MB.`);
      return;
    }
    setFile(f);
    // Auto-fill the title from the filename so the common case needs no typing.
    if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  // Exactly what's still missing — never a blanket "fill everything in".
  const missing = !file ? "file" : !title.trim() ? "title" : null;

  async function handleUpload() {
    const token = tokenRef.current;
    if (!token || !file || !title.trim()) return;

    setUploading(true);
    setError(null);

    try {
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? "Could not get upload URL");

      const uploadRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("File upload to storage failed");

      const registerRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), doc_type: docType, storage_path: urlData.storagePath }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.error ?? "Could not register document");

      setTitle("");
      setFile(null);
      setDocType("other");
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
    else setError(json.error ?? "Could not open document");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="mt-1 text-sm text-[#948E80]">
          Upload files for Domani, and download anything shared with you. Download links expire after
          five minutes.
        </p>
      </div>

      {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

      {/* ── Upload ─────────────────────────────────────── */}
      <Panel className="space-y-4 p-6">
        <Label>Upload a document</Label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            selectFile(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
            dragging
              ? "border-[#B8F0FF] bg-[#B8F0FF]/5"
              : file
                ? "border-[#2A2825] bg-[#0D0C0A]"
                : "border-[#1F1E1B] bg-[#0D0C0A] hover:border-[#2A2825]"
          }`}
        >
          {file ? (
            <div className="space-y-1">
              <p className="text-sm text-[#EDE9E2]">{file.name}</p>
              <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                {humanSize(file.size)} · click to replace
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-[#948E80]">Drop a file here, or click to browse</p>
              <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                Up to 25 MB
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full">
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleUpload} disabled={uploading || !!missing}>
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
          {missing && !uploading && (
            <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
              {missing === "file" ? "Choose a file to continue" : "Add a title to continue"}
            </span>
          )}
        </div>
      </Panel>

      {/* ── Library ────────────────────────────────────── */}
      <section className="space-y-3">
        <Label>Document library</Label>
        {!docs && <Skeleton className="h-32 w-full" />}
        {docs?.length === 0 && (
          <Panel>
            <EmptyState title="No documents yet." hint="Anything you or Domani upload appears here." />
          </Panel>
        )}
        {docs && docs.length > 0 && (
          <Panel className="divide-y divide-[#1F1E1B]">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#EDE9E2]">{d.title}</p>
                  <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                    {d.doc_type.replace(/_/g, " ")} ·{" "}
                    {d.project_members?.display_name ?? d.project_members?.email ?? "Domani"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <StatusChip status={d.status} />
                  <Button variant="secondary" onClick={() => handleDownload(d.id)}>
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </section>
    </main>
  );
}
