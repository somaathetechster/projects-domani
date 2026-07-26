import { supabaseAdmin } from "@/lib/supabase-admin";

// Creates one in-app notification per project member. Fire-and-forget from
// mutation routes; a failed fanout never blocks the underlying write.
export async function notifyProject(
  projectId: string,
  title: string,
  body: string,
  linkPath: string,
  excludeMemberId?: string
) {
  const { data: members } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", projectId);

  if (!members?.length) return;

  const rows = members
    .filter((m) => m.id !== excludeMemberId)
    .map((m) => ({
      member_id: m.id,
      project_id: projectId,
      title,
      body,
      link_path: linkPath,
    }));

  if (rows.length) await supabaseAdmin.from("notifications").insert(rows);
}
