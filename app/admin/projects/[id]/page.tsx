"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  Input,
  Label,
  Panel,
  ProgressBar,
  ProgressRing,
  Select,
  Skeleton,
  StatusChip,
} from "@/components/ui";

type Project = {
  id: string;
  slug: string;
  name: string;
  codename: string | null;
  status: string;
  progress_pct: number;
  current_phase: string | null;
  next_milestone: string | null;
  eta: string | null;
  clients: { name: string; visibility: string } | null;
};
type Module = { id: string; name: string; status: string; progress_pct: number };
type Deliverable = { id: string; module_id: string; title: string; done: boolean };
type Member = { id: string; email: string; role: string; totp_enabled: boolean };
type Issue = { id: string; number: number; title: string; status: string; priority: string };

const PROJECT_STATUSES = ["planning", "in_progress", "blocked", "review", "completed"];
const MODULE_STATUSES = ["upcoming", "in_progress", "completed", "blocked"];

export default function AdminProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newModule, setNewModule] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newDeliverable, setNewDeliverable] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const load = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/admin-portal/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Failed to load");
        return;
      }
      setProject(d.project);
      setModules(d.modules);
      setDeliverables(d.deliverables);
      setMembers(d.members);
      setIssues(d.issues);
    },
    [id, router]
  );

  useEffect(() => {
    const t = sessionStorage.getItem("domani_admin_session");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    tokenRef.current = t;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    load(t);
  }, [load, router]);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRef.current}`,
    };
  }

  async function saveProject(patch: Partial<Project>) {
    setSaving(true);
    await fetch(`/api/admin-portal/projects/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (tokenRef.current) load(tokenRef.current);
  }

  // Module and deliverable writes reuse the project-scoped staff endpoints,
  // which resolve project from the *staff* session — not usable here. So the
  // admin portal talks to its own project-id-explicit routes instead.
  async function addModule() {
    if (!newModule.trim()) return;
    await fetch("/api/admin-portal/modules", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ project_id: id, name: newModule.trim(), sort_order: modules.length + 1 }),
    });
    setNewModule("");
    if (tokenRef.current) load(tokenRef.current);
  }

  async function updateModule(moduleId: string, patch: Partial<Module>) {
    await fetch("/api/admin-portal/modules", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id: moduleId, project_id: id, ...patch }),
    });
    if (tokenRef.current) load(tokenRef.current);
  }

  async function addDeliverable(moduleId: string) {
    const title = (newDeliverable[moduleId] ?? "").trim();
    if (!title) return;
    await fetch("/api/admin-portal/deliverables", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ project_id: id, module_id: moduleId, title }),
    });
    setNewDeliverable((s) => ({ ...s, [moduleId]: "" }));
    if (tokenRef.current) load(tokenRef.current);
  }

  async function toggleDeliverable(delId: string, done: boolean) {
    await fetch("/api/admin-portal/deliverables", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id: delId, project_id: id, done }),
    });
    if (tokenRef.current) load(tokenRef.current);
  }

  async function addMember() {
    if (!newMemberEmail.includes("@")) return;
    const res = await fetch("/api/admin-portal/members", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ project_id: id, email: newMemberEmail.trim(), role: "client" }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not add member");
      return;
    }
    setNewMemberEmail("");
    if (tokenRef.current) load(tokenRef.current);
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/admin-portal/members?id=${memberId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (tokenRef.current) load(tokenRef.current);
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#080706] px-6 py-10">
        <div className="mx-auto max-w-3xl space-y-4">
          {error ? <p className="text-sm text-[#E88B7D]">{error}</p> : <Skeleton className="h-40 w-full" />}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080706] text-[#EDE9E2]">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C] hover:text-[#948E80]"
          >
            ← All engagements
          </button>
          <Button variant="secondary" onClick={() => router.push(`/admin/projects/${id}/ops`)}>
            Operations →
          </Button>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">
              /portal/{project.slug}
            </p>
          </div>
          <ProgressRing value={project.progress_pct} />
        </div>

        {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

        {/* ── Status ─────────────────────────────────────── */}
        <Panel className="space-y-4 p-6">
          <Label>Project status</Label>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={project.status}
              onChange={(e) => saveProject({ status: e.target.value })}
              className="w-full"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              max={100}
              value={project.progress_pct}
              onChange={(e) => setProject((prev) => prev ? { ...prev, progress_pct: Number(e.target.value) } : prev)}
              onBlur={(e) => {
                const v = Math.max(0, Math.min(100, Number(e.target.value)));
                setProject((prev) => prev ? { ...prev, progress_pct: v } : prev);
                saveProject({ progress_pct: v });
              }}
            />
            <Input
              placeholder="Current phase"
              value={project.current_phase ?? ""}
              onChange={(e) => setProject({ ...project, current_phase: e.target.value })}
              onBlur={(e) => {
                const v = e.target.value;
                setProject((prev) => prev ? { ...prev, current_phase: v } : prev);
                saveProject({ current_phase: v });
              }}
            />
            <Input
              placeholder="Next milestone"
              value={project.next_milestone ?? ""}
              onChange={(e) => setProject({ ...project, next_milestone: e.target.value })}
              onBlur={(e) => {
                const v = e.target.value;
                setProject((prev) => prev ? { ...prev, next_milestone: v } : prev);
                saveProject({ next_milestone: v });
              }}
            />
          </div>
          {saving && <p className="text-[10px] text-[#6B665C]">Saving…</p>}
        </Panel>

        {/* ── Identity & visibility ──────────────────────── */}
        <Panel className="space-y-4 p-6">
          <Label>Identity & visibility</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-[#6B665C]">Public codename (login handle)</p>
              <Input
                value={project.codename ?? ""}
                onChange={(e) => setProject({ ...project, codename: e.target.value.toUpperCase() })}
                onBlur={(e) => saveProject({ codename: e.target.value } as Partial<Project>)}
                placeholder="AURORA"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-[#6B665C]">Client name (admin-only)</p>
              <Input
                value={project.clients?.name ?? ""}
                onChange={(e) =>
                  setProject({ ...project, clients: { name: e.target.value, visibility: project.clients?.visibility ?? "hidden" } })
                }
                onBlur={(e) => saveProject({ client_name: e.target.value } as unknown as Partial<Project>)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-[#6B665C]">Homepage listing</p>
            <Select
              value={project.clients?.visibility ?? "hidden"}
              onChange={(e) => {
                setProject({ ...project, clients: { name: project.clients?.name ?? "", visibility: e.target.value } });
                saveProject({ visibility: e.target.value } as unknown as Partial<Project>);
              }}
              className="w-full"
            >
              <option value="public">Listed — codename shown on homepage</option>
              <option value="hidden">Hidden — not listed anywhere</option>
            </Select>
            <p className="text-[10px] text-[#6B665C]">
              Only the codename is ever shown publicly. The client name never leaves this admin portal.
            </p>
          </div>
        </Panel>

        {/* ── Modules & deliverables ─────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Modules & deliverables</Label>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="New module name"
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addModule()}
            />
            <Button onClick={addModule} disabled={!newModule.trim()}>
              Add
            </Button>
          </div>

          {modules.length === 0 && (
            <Panel>
              <EmptyState title="No modules yet." hint="Add the first workstream above." />
            </Panel>
          )}

          {modules.map((m) => {
            const items = deliverables.filter((d) => d.module_id === m.id);
            const doneCount = items.filter((d) => d.done).length;
            const computed = items.length ? Math.round((doneCount / items.length) * 100) : m.progress_pct;

            return (
              <Panel key={m.id} className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <StatusChip status={m.status} />
                    <Select
                      value={m.status}
                      onChange={(e) => updateModule(m.id, { status: e.target.value })}
                      className="text-xs"
                    >
                      {MODULE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-[#6B665C]">
                      {items.length ? `${doneCount} of ${items.length} complete` : "No checklist items"}
                    </span>
                    <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tabular-nums text-[#948E80]">
                      {computed}%
                    </span>
                  </div>
                  <ProgressBar value={computed} />
                </div>

                <ul className="space-y-1.5 pt-1">
                  {items.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={d.done}
                        onChange={(e) => toggleDeliverable(d.id, e.target.checked)}
                        className="accent-[#B8F0FF]"
                      />
                      <span className={d.done ? "text-[#6B665C] line-through" : "text-[#EDE9E2]"}>
                        {d.title}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Add checklist item"
                    className="text-xs"
                    value={newDeliverable[m.id] ?? ""}
                    onChange={(e) => setNewDeliverable((s) => ({ ...s, [m.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addDeliverable(m.id)}
                  />
                  <Button variant="secondary" onClick={() => addDeliverable(m.id)}>
                    Add
                  </Button>
                </div>
              </Panel>
            );
          })}
        </section>

        {/* ── Access ────────────────────────────────────── */}
        <section className="space-y-3">
          <Label>Client access</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="new.client@company.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
            />
            <Button onClick={addMember} disabled={!newMemberEmail.includes("@")}>
              Grant
            </Button>
          </div>
          <Panel className="divide-y divide-[#1F1E1B]">
            {members.length === 0 && <EmptyState title="No one has access yet." />}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm">{m.email}</p>
                  <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                    {m.role.replace("_", " ")} · {m.totp_enabled ? "2FA enrolled" : "not yet signed in"}
                  </p>
                </div>
                <Button variant="danger" onClick={() => removeMember(m.id)}>
                  Revoke
                </Button>
              </div>
            ))}
          </Panel>
        </section>

        {/* ── Issues ────────────────────────────────────── */}
        <section className="space-y-3">
          <Label>Issues</Label>
          <Panel className="divide-y divide-[#1F1E1B]">
            {issues.length === 0 && <EmptyState title="No issues reported." />}
            {issues.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-4">
                <span className="text-sm">
                  #{i.number} {i.title}
                </span>
                <StatusChip status={i.status} />
              </div>
            ))}
          </Panel>
        </section>
        {/* ── Danger zone ───────────────────────────────── */}
        <Panel className="space-y-3 border-[#4A2B26] p-6">
          <Label>Danger zone</Label>
          <p className="text-xs text-[#948E80]">
            Deleting removes the project, all member access, issues, documents, invoices, and history.
            This cannot be undone. Type the codename to confirm.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder={project.codename ?? "CODENAME"}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
            />
            <Button
              variant="danger"
              disabled={!project.codename || deleteConfirm !== project.codename}
              onClick={async () => {
                const res = await fetch(`/api/admin-portal/projects/${id}`, {
                  method: "DELETE",
                  headers: authHeaders(),
                });
                if (res.ok) router.push("/admin");
                else setError((await res.json()).error ?? "Delete failed");
              }}
            >
              Delete project
            </Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}
