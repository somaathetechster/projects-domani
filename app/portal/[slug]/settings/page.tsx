"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">("light");
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
      .then((d) => d.settings && setTheme(d.settings.theme_preference));
  }, [slug, router]);

  async function updateTheme(next: "light" | "dark") {
    const t = tokenRef.current;
    if (!t) return;
    setTheme(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ theme_preference: next }),
    });
    // Reload so the shared layout picks up the new theme immediately.
    router.refresh();
  }

  async function changePassword() {
    const t = tokenRef.current;
    if (!t) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to change password");
      return;
    }
    setMessage("Password updated.");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[#666] dark:text-[#888]">Appearance</h2>
        <div className="flex gap-2">
          <button
            onClick={() => updateTheme("light")}
            className={`text-sm rounded-lg px-4 py-2 border ${theme === "light" ? "bg-black text-white" : "border-[#ECECEC] dark:border-[#2A2A2A]"}`}
          >
            Light
          </button>
          <button
            onClick={() => updateTheme("dark")}
            className={`text-sm rounded-lg px-4 py-2 border ${theme === "dark" ? "bg-black text-white" : "border-[#ECECEC] dark:border-[#2A2A2A]"}`}
          >
            Dark
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-[#666] dark:text-[#888]">Change password</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <input
          type="password"
          placeholder="Current password"
          className="w-full border border-[#ECECEC] dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm bg-transparent"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New password (min 10 characters)"
          className="w-full border border-[#ECECEC] dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm bg-transparent"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button
          onClick={changePassword}
          disabled={saving || !currentPassword || newPassword.length < 10}
          className="bg-black text-white text-sm rounded-lg px-4 py-2 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Update password"}
        </button>
      </section>
    </main>
  );
}