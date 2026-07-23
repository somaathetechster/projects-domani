export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#666] dark:text-[#888]">Domani Media</p>
        <h1 className="text-2xl font-semibold mt-1">We build tomorrow.</h1>
        <p className="text-sm text-[#666] dark:text-[#888] mt-2">
          Domani — Italian for &ldquo;tomorrow&rdquo; — is a design, engineering, and AI studio building
          brand identity, product engineering, and strategic infrastructure for clients, alongside
          in-house ventures. This portal is where that work lives: transparent, documented, and built
          to last past any single conversation.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-[#666] dark:text-[#888] mb-3">What we do</h2>
        <div className="border border-[#ECECEC] dark:border-[#2A2A2A] rounded-xl divide-y divide-[#ECECEC] dark:divide-[#2A2A2A]">
          {[
            "Strategy & Consulting",
            "Creative Direction & Branding",
            "Copywriting & Content",
            "Design & Visual Production",
            "Technology & Engineering",
            "AI Systems & Automation",
            "Marketing & Campaigns",
          ].map((s) => (
            <div key={s} className="p-4 text-sm">{s}</div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[#666] dark:text-[#888] mb-3">Contact</h2>
        <p className="text-sm">
          <a href="https://www.domanimedia.com" className="underline">domanimedia.com</a>
        </p>
      </section>
    </main>
  );
}