import { supabaseAdmin } from "@/lib/supabase-admin";

// Resolves a URL handle to a project. Accepts the internal slug OR the public
// codename (case-insensitive), so the homepage can link with codenames and
// never expose a client name in a URL. Clients who know their real slug can
// still use it.
export async function resolveProject(handle: string): Promise<{ id: string } | null> {
  const h = handle.trim();
  const { data } = await supabaseAdmin
    .from("projects")
    .select("id")
    .or(`slug.eq.${h.toLowerCase()},codename.ilike.${h}`)
    .maybeSingle();
  return data ?? null;
}
