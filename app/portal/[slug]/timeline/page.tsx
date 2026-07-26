"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmptyState, Panel, Skeleton } from "@/components/ui";

type Event = {
  id: string;
  actor_label: string | null;
  event_type: string;
  summary: string;
  created_at: string;
};

const TYPE_DOTS: Record<string, string> = {
  approval_granted: "bg-[#7FD1A8]",
  invoice_paid: "bg-[#7FD1A8]",
  deliverable_completed: "bg-[#7FD1A8]",
  module_status_changed: "bg-[#B8F0FF]",
  document_uploaded: "bg-[#B8F0FF]",
  invoice_issued: "bg-[#E8C07D]",
  approval_requested: "bg-[#E8C07D]",
  changes_requested: "bg-[#E88B7D]",
};

export default function TimelinePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    fetch("/api/activity", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => setEvents(d.events ?? []));
  }, [slug, router]);

  // Group by calendar day
  const groups: { day: string; items: Event[] }[] = [];
  for (const e of events ?? []) {
    const day = new Date(e.created_at).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const g = groups.find((x) => x.day === day);
    if (g) g.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="mt-1 text-sm text-[#948E80]">Everything that has happened on this engagement.</p>
      </div>

      {!events && <Skeleton className="h-40 w-full" />}
      {events?.length === 0 && (
        <Panel>
          <EmptyState title="No activity recorded yet." hint="Events appear here as work progresses." />
        </Panel>
      )}

      {groups.map((g) => (
        <section key={g.day}>
          <h2 className="mb-3 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.25em] text-[#6B665C]">
            {g.day}
          </h2>
          <div className="relative space-y-4 border-l border-[#1F1E1B] pl-6">
            {g.items.map((e) => (
              <div key={e.id} className="relative">
                <span
                  className={`absolute -left-[27.5px] top-1.5 h-2 w-2 rounded-full ${
                    TYPE_DOTS[e.event_type] ?? "bg-[#948E80]"
                  }`}
                />
                <p className="text-sm text-[#EDE9E2]">{e.summary}</p>
                <p className="mt-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                  {e.actor_label ?? "System"} ·{" "}
                  {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
