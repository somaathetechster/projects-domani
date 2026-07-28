"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, EmptyState, Input, Panel } from "@/components/ui";

type Msg = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  project_members: { email: string; role: string; display_name: string | null } | null;
};

export default function ChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const tokenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (t: string) => {
      const res = await fetch("/api/messages", { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401) {
        router.push(`/portal/${slug}/login`);
        return;
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setSelfId(data.selfId ?? null);
    },
    [slug, router]
  );

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    load(t);
    const interval = setInterval(() => load(t), 5000);
    return () => clearInterval(interval);
  }, [slug, router, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const t = tokenRef.current;
    if (!t || !text.trim()) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ body: text.trim() }),
    });
    setText("");
    load(t);
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="mt-1 text-sm text-[#948E80]">Direct line to the Domani team.</p>
      </div>

      <Panel className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <EmptyState title="No messages yet." hint="Say hello — we're listening." />}
        {messages.map((m) => {
          const mine = m.sender_id === selfId;
          const who = m.project_members?.display_name ?? m.project_members?.email ?? "unknown";
          const isStaff = m.project_members?.role === "domani_staff";
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
                mine ? "ml-auto bg-[#B8F0FF] text-[#080706]" : "border border-[#1F1E1B] bg-[#0D0C0A] text-[#EDE9E2]"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p
                className={`mt-1 font-[family-name:var(--font-dm-mono)] text-[9px] ${
                  mine ? "text-[#080706]/60" : "text-[#6B665C]"
                }`}
              >
                {mine ? "You" : who}
                {isStaff && !mine ? " · Domani" : ""} ·{" "}
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </Panel>

      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the Domani team…"
        />
        <Button onClick={send} disabled={!text.trim()}>
          Send
        </Button>
      </div>
    </main>
  );
}
