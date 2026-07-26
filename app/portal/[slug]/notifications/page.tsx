"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Panel, Skeleton } from "@/components/ui";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [items, setItems] = useState<Notification[] | null>(null);

  const load = useCallback(async (t: string) => {
    const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const d = await res.json();
      setItems(d.notifications);
    }
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

  async function markAll() {
    if (!tokenRef.current) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ all: true }),
    });
    load(tokenRef.current);
  }

  async function open(n: Notification) {
    if (tokenRef.current && !n.read_at) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ id: n.id }),
      });
    }
    if (n.link_path) router.push(`/portal/${slug}${n.link_path}`);
  }

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-[#948E80]">{unread ? `${unread} unread` : "All caught up"}</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>

      {!items && <Skeleton className="h-32 w-full" />}
      {items?.length === 0 && (
        <Panel>
          <EmptyState title="Nothing yet." hint="Updates about your project will appear here." />
        </Panel>
      )}

      {items && items.length > 0 && (
        <Panel className="divide-y divide-[#1F1E1B]">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[#161513]"
            >
              <span
                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.read_at ? "bg-[#1F1E1B]" : "bg-[#B8F0FF]"}`}
              />
              <span className="flex-1">
                <span className={`block text-sm ${n.read_at ? "text-[#948E80]" : "text-[#EDE9E2]"}`}>{n.title}</span>
                {n.body && <span className="mt-0.5 block text-xs text-[#6B665C]">{n.body}</span>}
                <span className="mt-1 block font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </span>
            </button>
          ))}
        </Panel>
      )}
    </main>
  );
}
