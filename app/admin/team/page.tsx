"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Input, Label, Panel, Skeleton } from "@/components/ui";

type Admin = {
  id: string;
  email: string;
  name: string | null;
  totp_enabled: boolean;
  created_at: string;
};

export default function AdminTeamPage() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [self, setSelf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/admin-portal/admins", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const d = await res.json();
    setAdmins(d.admins ?? []);
  }, [router]);

  useEffect(() => {
    const t = sessionStorage.getItem("domani_admin_session");
    if (!t) {
      router.push("/admin/login");
      return;
    }
    tokenRef.current = t;
    // Read self email from the session by calling any authed endpoint
    fetch("/api/admin-portal/projects", { headers: { Authorization: `Bearer ${t}` } }).then(async (r) => {
      // We don't have a /me endpoint; we determine self from the session
      // indirectly — the admins list will mark the current user's email.
      // For now we store it when we see the admin who can't delete themselves.
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load(t);
  }, [router, load]);

  async function addAdmin() {
    const t = tokenRef.current;
    if (!t || !newEmail.includes("@")) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/admin-portal/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ email: newEmail.trim(), name: newName.trim() || undefined }),
    });
    const d = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(d.error ?? "Could not add admin");
      return;
    }
    setNewEmail("");
    setNewName("");
    load(t);
  }

  async function removeAdmin(id: string) {
    const t = tokenRef.current;
    if (!t) return;
    setError(null);
    const res = await fetch(`/api/admin-portal/admins?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? "Could not remove admin");
      return;
    }
    load(t);
  }

  return (
    <main className="min-h-screen bg-[#080706] text-[#EDE9E2]">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        <button
          onClick={() => router.push("/admin")}
          className="font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C] hover:text-[#948E80]"
        >
          ← All engagements
        </button>

        <div>
          <h1 className="text-2xl font-semibold">Admin team</h1>
          <p className="mt-1 text-sm text-[#948E80]">
            Add anyone who should have full Domani Workspace access. They set their own password and
            authenticator on first sign-in — no credentials are shared.
          </p>
        </div>

        {error && <p className="text-sm text-[#E88B7D]">{error}</p>}

        <Panel className="space-y-3 p-6">
          <Label>Add admin</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="email"
              placeholder="email@domanimedia.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            />
            <Input
              placeholder="Name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAdmin()}
            />
          </div>
          <Button onClick={addAdmin} disabled={adding || !newEmail.includes("@")}>
            {adding ? "Adding…" : "Add admin"}
          </Button>
          <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
            They will be prompted to set a password and enrol an authenticator app on first sign-in.
          </p>
        </Panel>

        <section className="space-y-3">
          <Label>Current admins</Label>
          {!admins && <Skeleton className="h-32 w-full" />}
          {admins?.length === 0 && (
            <Panel>
              <EmptyState title="No admins listed." />
            </Panel>
          )}
          {admins && admins.length > 0 && (
            <Panel className="divide-y divide-[#1F1E1B]">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm text-[#EDE9E2]">{a.name ?? a.email}</p>
                    {a.name && (
                      <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                        {a.email}
                      </p>
                    )}
                    <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                      {a.totp_enabled ? "2FA enrolled" : "awaiting first sign-in"} ·{" "}
                      Added {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => removeAdmin(a.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </Panel>
          )}
        </section>
      </div>
    </main>
  );
}
