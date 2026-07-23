"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then(setResults);
  }, [slug, q, router]);

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Results for &ldquo;{q}&rdquo;</h1>

      {!results && <p className="text-sm text-[#666] dark:text-[#888]">Searching…</p>}

      {results && (
        <>
          <Section title="Issues">
            {results.issues.map((i) => (
              <Row key={i.id}>#{i.number} {i.title} — <span className="text-[#666] dark:text-[#888]">{i.status}</span></Row>
            ))}
          </Section>
          <Section title="Documents">
            {results.documents.map((d) => (
              <Row key={d.id}>{d.title} — <span className="text-[#666] dark:text-[#888]">{d.doc_type}</span></Row>
            ))}
          </Section>
          <Section title="Modules">
            {results.modules.map((m) => (
              <Row key={m.id}>{m.name} — <span className="text-[#666] dark:text-[#888]">{m.status}</span></Row>
            ))}
          </Section>
          {results.issues.length + results.documents.length + results.modules.length === 0 && (
            <p className="text-sm text-[#666] dark:text-[#888]">Nothing found.</p>
          )}
        </>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-[#666] dark:text-[#888] mb-2">{title}</h2>
      <div className="border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl divide-y divide-[#ECECEC] dark:divide-[#2A2A2A]">
        {children}
      </div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="p-3 text-sm">{children}</div>;
}