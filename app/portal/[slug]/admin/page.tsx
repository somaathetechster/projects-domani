"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Label, Panel } from "@/components/ui";

// The per-project staff admin screen from an earlier phase is superseded by
// the platform admin portal at /admin, which manages every engagement from one
// place. Keeping two authoring surfaces invites them to drift apart, so this
// page now points to the real one rather than duplicating it.
export default function LegacyProjectAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) {
      router.push(`/portal/${slug}/login`);
      return;
    }
    fetch("/api/settings", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => setAllowed(d.settings?.role === "domani_staff"))
      .catch(() => setAllowed(false));
  }, [slug, router]);

  if (allowed === false) {
    return <main className="p-10 text-sm text-[#E88B7D]">Staff access only.</main>;
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 px-6 py-14">
      <div>
        <Label>Staff</Label>
        <h1 className="mt-1.5 text-2xl font-semibold">Project administration</h1>
      </div>

      <Panel className="space-y-4 p-6">
        <p className="text-sm text-[#948E80]">
          Project authoring now lives in the Domani admin portal, where every engagement is managed
          from one place — status, modules, deliverables, documents, invoices, approvals, access, and
          client chat.
        </p>
        <Button onClick={() => router.push("/admin")}>Open admin portal →</Button>
        <p className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#6B665C]">
          Requires a separate admin sign-in.
        </p>
      </Panel>
    </main>
  );
}
