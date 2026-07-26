"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Msg = { id: string; body: string; sender_id: string; created_at: string; project_members: { email: string; role: string; display_name: string | null } | null };

export default function ChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const tokenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
    load(t);
    const interval = setInterval(() => load(t), 5000); // simple polling until realtime is wired
    return () => clearInterval(interval);
  }, [slug, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function load(t: string) {
    const res = await fetch("/api/messages", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    const data = await res.json();
    setMessages(data.messages ?? []);
    setSelfId(data.selfId ?? null);
  }

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
    <main className="max-w-2xl mx-auto px-6 py-10 flex flex-col h-[calc(100vh-64px)]">
      <h1 className="text-2xl font-semibold mb-4">Chat</h1>
      <div className="flex-1 overflow-y-auto space-y-2 border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
              m.sender_id === selfId ? "ml-auto bg-[#B8F0FF] text-[#080706]" : "border border-[#1F1E1B] bg-[#0D0C0A] text-[#EDE9E2]"
            }`}
          >
            <p>{m.body}</p>
            <p className={`mt-0.5 font-[family-name:var(--font-dm-mono)] text-[9px] ${m.sender_id === selfId ? "text-[#080706]/60" : "text-[#6B665C]"}`}>
              {m.project_members?.display_name ?? m.project_members?.email ?? "unknown"}
              {m.project_members?.role === "domani_staff" ? " · Domani" : ""}
              {" · "}{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 border border-[#ECECEC] dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm bg-transparent"
        />
        <button onClick={send} className="bg-black text-white rounded-lg px-4 py-2 text-sm">
          Send
        </button>
      </div>
    </main>
  );
}
