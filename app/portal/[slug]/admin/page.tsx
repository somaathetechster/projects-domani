"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ModuleRow = { id: string; name: string; status: string; progress_pct: number; sort_order: number };

const MODULE_STATUSES = ["upcoming", "in_progress", "completed", "blocked"];
const PROJECT_STATUSES = ["planning", "in_progress", "blocked", "review", "completed"];

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [forbidden, setForbidden] = useState(false);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [newName, setNewName] = useState("");

  const [projStatus, setProjStatus] = useState("planning");
  const [projProgress, setProjProgress] = useState(0);
  const [projPhase, setProjPhase] = useState("");
  const [projMilestone, setProjMilestone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    load(t);
  }, [slug, router]);

  async function load(t: string) {
    const [modRes, ovRes] = await Promise.all([
      fetch("/api/admin/modules", { headers: { Authorization: `Bearer ${t}` } }),
      fetch("/api/overview", { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (modRes.status === 403) {
      setForbidden(true);
      return;
    }
    const modJson = await modRes.json();
    setModules(modJson.modules ?? []);

    if (ovRes.ok) {
      const ov = await ovRes.json();
      setProjStatus(ov.project.status);
      setProjProgress(ov.project.progress_pct);
      setProjPhase(ov.project.current_phase ?? "");
      setProjMilestone(ov.project.next_milestone ?? "");
    }
  }

  async function saveProject() {
    const t = tokenRef.current;
    if (!t) return;
    setSaving(true);
    await fetch("/api/admin/project", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        status: projStatus,
        progress_pct: projProgress,
        current_phase: projPhase,
        next_milestone: projMilestone,
      }),
    });
    setSaving(false);
  }

  async function addModule() {
    const t = tokenRef.current;
    if (!t || !newName.trim()) return;
    await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name: newName.trim(), sort_order: modules.length + 1 }),
    });
    setNewName("");
    load(t);
  }

  async function updateModule(id: string, patch: Partial<ModuleRow>) {
    const t = tokenRef.current;
    if (!t) return;
    await fetch(`/api/admin/modules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(patch),
    });
    load(t);
  }

  async function deleteModule(id: string) {
    const t = tokenRef.current;
    if (!t) return;
    await fetch(`/api/admin/modules/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    });
    load(t);
  }

  if (forbidden) {
    return <main className="p-8 text-sm text-red-600">Staff access only.</main>;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#666]">Domani Portal · {slug} · Staff</p>
        <h1 className="text-2xl font-semibold mt-1">Admin</h1>
      </div>

      <section className="border border-[#ECECEC] rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium text-[#666]">Project overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <select
            className="border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={projStatus}
            onChange={(e) => setProjStatus(e.target.value)}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={100}
            className="border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={projProgress}
            onChange={(e) => setProjProgress(Number(e.target.value))}
            placeholder="Progress %"
          />
          <input
            className="border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={projPhase}
            onChange={(e) => setProjPhase(e.target.value)}
            placeholder="Current phase"
          />
          <input
            className="border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={projMilestone}
            onChange={(e) => setProjMilestone(e.target.value)}
            placeholder="Next milestone"
          />
        </div>
        <button
          onClick={saveProject}
          disabled={saving}
          className="bg-black text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save overview"}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[#666]">Modules</h2>
        <div className="flex gap-2">
          <input
            placeholder="New module name"
            className="flex-1 border border-[#ECECEC] rounded-lg px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button onClick={addModule} className="bg-black text-white text-sm rounded-lg px-4 py-2">
            Add
          </button>
        </div>

        <div className="border border-[#ECECEC] rounded-xl divide-y divide-[#ECECEC]">
          {modules.length === 0 && <p className="p-4 text-sm text-[#666]">No modules yet.</p>}
          {modules.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <span className="text-sm flex-1">{m.name}</span>
              <select
                className="border border-[#ECECEC] rounded-lg px-2 py-1 text-xs"
                value={m.status}
                onChange={(e) => updateModule(m.id, { status: e.target.value })}
              >
                {MODULE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={100}
                className="w-16 border border-[#ECECEC] rounded-lg px-2 py-1 text-xs"
                value={m.progress_pct}
                onChange={(e) => updateModule(m.id, { progress_pct: Number(e.target.value) })}
              />
              <button onClick={() => deleteModule(m.id)} className="text-xs text-red-600">
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}