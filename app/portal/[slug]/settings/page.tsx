"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Label, Panel } from "@/components/ui";

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    fetch("/api/settings", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setTheme(d.settings.theme_preference);
          setDisplayName(d.settings.display_name ?? "");
          setEmail(d.settings.email ?? "");
        }
      });
  }, [slug, router]);

  async function patch(body: Record<string, unknown>) {
    const t = tokenRef.current;
    if (!t) return null;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json() };
  }

  return (
    <main className="mx-auto max-w-lg space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        {email && (
          <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">{email}</p>
        )}
      </div>

      {/* Display name */}
      <Panel className="space-y-3 p-6">
        <Label>Display name</Label>
        <p className="text-xs text-[#6B665C]">
          Shown on your messages, uploads, and signatures. Without one, your email is used.
        </p>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setNameSaved(false);
            }}
            placeholder="e.g. Somaa"
          />
          <Button
            disabled={!displayName.trim()}
            onClick={async () => {
              const r = await patch({ display_name: displayName });
              if (r?.ok) setNameSaved(true);
            }}
          >
            Save
          </Button>
        </div>
        {nameSaved && <p className="text-xs text-[#7FD1A8]">Saved.</p>}
      </Panel>

      {/* Appearance */}
      <Panel className="space-y-3 p-6">
        <Label>Appearance</Label>
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              onClick={async () => {
                setTheme(mode);
                await patch({ theme_preference: mode });
                router.refresh();
              }}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm capitalize transition-colors ${
                theme === mode
                  ? "border-[#B8F0FF] bg-[#B8F0FF]/10 text-[#B8F0FF]"
                  : "border-[#1F1E1B] text-[#948E80] hover:border-[#2A2825]"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </Panel>

      {/* Password */}
      <Panel className="space-y-3 p-6">
        <Label>Change password</Label>
        {error && <p className="text-xs text-[#E88B7D]">{error}</p>}
        {message && <p className="text-xs text-[#7FD1A8]">{message}</p>}
        <Input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="New password (min 10 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button
          disabled={saving || !currentPassword || newPassword.length < 10}
          onClick={async () => {
            setSaving(true);
            setError(null);
            setMessage(null);
            const r = await patch({ current_password: currentPassword, new_password: newPassword });
            setSaving(false);
            if (!r?.ok) {
              setError(r?.data.error ?? "Failed to change password");
              return;
            }
            setMessage("Password updated.");
            setCurrentPassword("");
            setNewPassword("");
          }}
        >
          {saving ? "Saving…" : "Update password"}
        </Button>
      </Panel>

      <Panel className="space-y-2 p-6">
        <Label>Two-factor authentication</Label>
        <p className="text-xs text-[#6B665C]">
          Enrolled. Required on every sign-in. To re-enrol a new device, contact the Domani team via Chat.
        </p>
      </Panel>
    </main>
  );
}
