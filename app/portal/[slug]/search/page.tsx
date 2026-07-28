"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, Label, Panel, Skeleton, StatusChip } from "@/components/ui";

type Results = {
  issues: { id: string; number: number; title: string; status: string }[];
  documents: { id: string; title: string; doc_type: string; status: string }[];
  modules: { id: string; name: string; status: string }[];
};

export default function SearchPage() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    if (!q) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when the query changes
    setResults(null);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then(setResults);
  }, [slug, q, router]);

  const total = results ? results.issues.length + results.documents.length + results.modules.length : 0;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <Label>Search</Label>
        <h1 className="mt-1.5 text-2xl font-semibold">&ldquo;{q}&rdquo;</h1>
        {results && (
          <p className="mt-1 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#6B665C]">
            {total} result{total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {!results && q && <Skeleton className="h-32 w-full" />}
      {results && total === 0 && (
        <Panel>
          <EmptyState title="Nothing found." hint="Try a different term." />
        </Panel>
      )}

      {results && results.issues.length > 0 && (
        <section className="space-y-2">
          <Label>Issues</Label>
          <Panel className="divide-y divide-[#1F1E1B]">
            {results.issues.map((i) => (
              <a
                key={i.id}
                href={`/portal/${slug}/issues`}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-[#161513]"
              >
                <span className="text-sm">
                  <span className="font-[family-name:var(--font-dm-mono)] text-[#6B665C]">#{i.number}</span> {i.title}
                </span>
                <StatusChip status={i.status} />
              </a>
            ))}
          </Panel>
        </section>
      )}

      {results && results.documents.length > 0 && (
        <section className="space-y-2">
          <Label>Documents</Label>
          <Panel className="divide-y divide-[#1F1E1B]">
            {results.documents.map((d) => (
              <a
                key={d.id}
                href={`/portal/${slug}/documents`}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-[#161513]"
              >
                <span className="text-sm">{d.title}</span>
                <span className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
                  {d.doc_type.replace(/_/g, " ")}
                </span>
              </a>
            ))}
          </Panel>
        </section>
      )}

      {results && results.modules.length > 0 && (
        <section className="space-y-2">
          <Label>Modules</Label>
          <Panel className="divide-y divide-[#1F1E1B]">
            {results.modules.map((m) => (
              <a
                key={m.id}
                href={`/portal/${slug}/dashboard`}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-[#161513]"
              >
                <span className="text-sm">{m.name}</span>
                <StatusChip status={m.status} />
              </a>
            ))}
          </Panel>
        </section>
      )}
    </main>
  );
}
