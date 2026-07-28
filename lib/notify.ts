import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendProjectEmail, sendAdminEmail } from "@/lib/email";

// Resolves the codename for a project — used in email subjects so clients
// know which engagement is talking to them without exposing the client name.
async function getCodename(projectId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("codename")
    .eq("id", projectId)
    .single();
  return data?.codename ?? "Portal";
}

// Gets all platform admin emails (to be notified on client actions).
async function getAdminEmails(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("platform_admins")
    .select("email");
  return (data ?? []).map((a) => a.email);
}

// Notify all project members in-app and by email. Optionally exclude one
// member (the sender) and optionally also notify admins.
export async function notifyProject(
  projectId: string,
  title: string,
  body: string,
  linkPath: string,
  excludeMemberId?: string,
  { notifyAdmins = false, emailCta }: { notifyAdmins?: boolean; emailCta?: { label: string; url: string } } = {}
) {
  const [{ data: members }, codename] = await Promise.all([
    supabaseAdmin.from("project_members").select("id, email").eq("project_id", projectId),
    getCodename(projectId),
  ]);

  const eligible = (members ?? []).filter((m) => m.id !== excludeMemberId);

  // In-app notifications
  if (eligible.length) {
    await supabaseAdmin.from("notifications").insert(
      eligible.map((m) => ({
        member_id: m.id,
        project_id: projectId,
        title,
        body,
        link_path: linkPath,
      }))
    );
  }

  // Email — fire-and-forget, never blocks the API response
  const memberEmails = eligible.map((m) => m.email);
  if (memberEmails.length) {
    sendProjectEmail(memberEmails, {
      codename,
      subject: title,
      body: `<p>${body}</p>`,
      cta: emailCta,
    }).catch(console.error);
  }

  if (notifyAdmins) {
    getAdminEmails()
      .then((adminEmails) =>
        sendAdminEmail(adminEmails, {
          subject: `[${codename}] ${title}`,
          body: `<p>${body}</p>`,
        })
      )
      .catch(console.error);
  }
}
