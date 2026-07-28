import { Label, Panel } from "@/components/ui";

const SERVICES = [
  "Strategy & Consulting",
  "Creative Direction & Branding",
  "Copywriting & Content",
  "Design & Visual Production",
  "Technology & Engineering",
  "AI Systems & Automation",
  "Marketing & Campaigns",
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-10 px-6 py-14">
      <div className="space-y-4">
        <Label>Domani</Label>
        <h1 className="font-[family-name:var(--font-display)] text-4xl italic">We build tomorrow.</h1>
        <p className="text-sm leading-relaxed text-[#948E80]">
          Domani — Italian for <span className="italic">tomorrow</span> — is a design, engineering, and
          AI studio. We build brand identity, product engineering, and strategic infrastructure for the
          organisations shaping what comes next, alongside our own ventures.
        </p>
        <p className="text-sm leading-relaxed text-[#948E80]">
          This workspace is where that work lives: every decision documented, every deliverable signed,
          every conversation retrievable. Built to outlast the conversation that started it.
        </p>
      </div>

      <section className="space-y-3">
        <Label>Practice</Label>
        <Panel className="divide-y divide-[#1F1E1B]">
          {SERVICES.map((s) => (
            <div key={s} className="p-4 text-sm text-[#EDE9E2]">
              {s}
            </div>
          ))}
        </Panel>
      </section>

      <section className="space-y-3">
        <Label>Studio</Label>
        <Panel className="space-y-2 p-6">
          <p className="font-[family-name:var(--font-dm-mono)] text-[11px] tracking-wide text-[#948E80]">
            ABUJA, NIGERIA · OPERATING WORLDWIDE
          </p>
          <a
            href="https://www.domanimedia.com"
            className="block font-[family-name:var(--font-dm-mono)] text-[11px] tracking-wide text-[#B8F0FF] hover:underline"
          >
            DOMANIMEDIA.COM ↗
          </a>
        </Panel>
      </section>
    </main>
  );
}
