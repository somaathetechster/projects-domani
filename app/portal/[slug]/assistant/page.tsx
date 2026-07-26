"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's the current status of my project?",
  "How do I report an issue?",
  "What's awaiting my approval?",
  "How do I download a document?",
];

export default function AssistantPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    tokenRef.current = t;
  }, [slug, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!tokenRef.current || !text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ messages: next }),
    });
    const d = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(d.error ?? "Assistant unavailable");
      return;
    }
    setMessages([...next, { role: "assistant", content: d.reply }]);
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Assistant</h1>
        <p className="mt-1 text-sm text-[#948E80]">
          Ask about your project&apos;s status or how to do anything in this portal.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#1F1E1B] bg-[#111110] p-4">
        {messages.length === 0 && (
          <div className="space-y-2 py-6">
            <Label>Try asking</Label>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-lg border border-[#1F1E1B] bg-[#0D0C0A] px-3 py-2 text-left text-sm text-[#948E80] transition-colors hover:border-[#2A2825] hover:text-[#EDE9E2]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[#B8F0FF] text-[#080706]"
                : "bg-[#0D0C0A] text-[#EDE9E2] border border-[#1F1E1B]"
            }`}
          >
            {m.content}
          </div>
        ))}

        {busy && (
          <div className="max-w-[85%] rounded-xl border border-[#1F1E1B] bg-[#0D0C0A] px-4 py-2.5 text-sm text-[#6B665C]">
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-[#E88B7D]">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask anything about your project or this portal…"
        />
        <Button onClick={() => send(input)} disabled={busy || !input.trim()}>
          Send
        </Button>
      </div>
    </main>
  );
}
