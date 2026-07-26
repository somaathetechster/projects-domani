"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "dashboard", label: "Overview" },
  { href: "issues", label: "Issues" },
  { href: "documents", label: "Documents" },
  { href: "approvals", label: "Approvals" },
  { href: "invoices", label: "Invoices" },
  { href: "chat", label: "Chat" },
  { href: "assistant", label: "Assistant" },
  { href: "notifications", label: "Alerts" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [role, setRole] = useState<"client" | "domani_staff" | null>(null);
  const [query, setQuery] = useState("");
  const [codename, setCodename] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  // Login page has no nav — render children bare.
  const isLoginPage = pathname.endsWith("/login");

  useEffect(() => {
    fetch(`/api/public/project/${slug}`)
      .then((r) => r.json())
      .then((d) => d.codename && setCodename(d.codename))
      .catch(() => {});
  }, [slug]);

  // Unread alert count, refreshed every 30s.
  useEffect(() => {
    if (isLoginPage) return;
    const t = sessionStorage.getItem(`domani_session_${slug}`);
    if (!t) return;
    const poll = () =>
      fetch("/api/notifications", { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setUnread(d.unread ?? 0))
        .catch(() => {});
    poll();
    const iv = setInterval(poll, 30000);
    return () => clearInterval(iv);
  }, [slug, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    const token = sessionStorage.getItem(`domani_session_${slug}`);
    if (!token) return;

    fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setTheme(d.settings.theme_preference);
          setRole(d.settings.role);
        }
      })
      .catch(() => {});
  }, [slug, isLoginPage]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/portal/${slug}/search?q=${encodeURIComponent(query.trim())}`);
  }

  if (isLoginPage) return <>{children}</>;

  const dark = theme === "dark";

  return (
    <div className={dark ? "dark min-h-screen bg-[#080706] text-[#EDE9E2]" : "min-h-screen bg-[#EDE9E2] text-[#080706]"}>
      <header className={`border-b ${dark ? "border-[#1F1E1B]" : "border-[#E0DCD3]"} sticky top-0 z-10 ${dark ? "bg-[#080706]" : "bg-[#EDE9E2]"}`}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
          <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.25em]">
            DOMANI · {codename ?? String(slug).toUpperCase()}
          </span>
          <nav className="flex gap-4 text-sm flex-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={`/portal/${slug}/${item.href}`}
                className={`relative ${
                  pathname.endsWith(item.href)
                    ? dark ? "text-[#B8F0FF]" : "text-[#080706] font-medium"
                    : dark ? "text-[#948E80]" : "text-[#6B665C]"
                }`}
              >
                {item.label}
                {item.href === "notifications" && unread > 0 && (
                  <span className="absolute -right-3 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B8F0FF] px-1 font-[family-name:var(--font-dm-mono)] text-[9px] tabular-nums text-[#080706]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </a>
            ))}
            {role === "domani_staff" && (
              <a
                href={`/portal/${slug}/admin`}
                className={
                  pathname.endsWith("/admin")
                    ? dark ? "text-[#B8F0FF]" : "text-[#080706] font-medium"
                    : dark ? "text-[#948E80]" : "text-[#6B665C]"
                }
              >
                Admin
              </a>
            )}
          </nav>
          <form onSubmit={runSearch} className="flex-shrink-0">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className={`text-xs rounded-lg px-3 py-1.5 border ${dark ? "border-[#1F1E1B] bg-[#0D0C0A] text-[#EDE9E2]" : "border-[#E0DCD3] bg-white"}`}
            />
          </form>
          <a href={`/portal/${slug}/settings`} className={`text-sm ${dark ? "text-[#948E80]" : "text-[#6B665C]"}`}>
            Settings
          </a>
          <button
            onClick={() => {
              sessionStorage.removeItem(`domani_session_${slug}`);
              router.push(`/portal/${slug}/login`);
            }}
            className={`text-sm ${dark ? "text-[#6B665C] hover:text-[#948E80]" : "text-[#6B665C] hover:text-[#080706]"}`}
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
