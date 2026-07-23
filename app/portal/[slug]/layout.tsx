"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "dashboard", label: "Overview" },
  { href: "issues", label: "Issues" },
  { href: "documents", label: "Documents" },
  { href: "chat", label: "Chat" },
  { href: "about", label: "About Domani" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [role, setRole] = useState<"client" | "domani_staff" | null>(null);
  const [query, setQuery] = useState("");
  const [projectInfo, setProjectInfo] = useState<{ displayName: string; logoUrl: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/public/project/${slug}`)
      .then((r) => r.json())
      .then((d) => d.displayName && setProjectInfo(d))
      .catch(() => {});
  }, [slug]);

  // Login page has no nav — render children bare.
  const isLoginPage = pathname.endsWith("/login");

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
          <span className="font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[0.25em] flex items-center gap-2">
            {projectInfo?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={projectInfo.logoUrl} alt="" className="h-5 w-5 rounded object-contain" />
            )}
            DOMANI · {String(slug).toUpperCase()}
          </span>
          <nav className="flex gap-4 text-sm flex-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={`/portal/${slug}/${item.href}`}
                className={
                  pathname.endsWith(item.href)
                    ? dark ? "text-[#B8F0FF]" : "text-[#080706] font-medium"
                    : dark ? "text-[#948E80]" : "text-[#6B665C]"
                }
              >
                {item.label}
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
        </div>
      </header>
      {children}
    </div>
  );
}