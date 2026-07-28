import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY env var");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Domani Portal <portal@domanimedia.com>";
const ADMIN_FROM = "Domani Workspace <workspace@domanimedia.com>";

// ── BRANDED HTML WRAPPER ─────────────────────────────────────────────────────
function html(codename: string, subject: string, body: string, cta?: { label: string; url: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080706;font-family:-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111110;border:1px solid #1F1E1B;border-radius:12px;overflow:hidden;" role="presentation">
        <!-- header -->
        <tr style="background:#0D0C0A;">
          <td style="padding:20px 32px;">
            <span style="font-family:monospace;font-size:10px;letter-spacing:0.35em;color:#B8F0FF;">DOMANI</span>
            <span style="font-family:monospace;font-size:10px;letter-spacing:0.2em;color:#6B665C;margin-left:16px;">· ${codename.toUpperCase()}</span>
          </td>
        </tr>
        <!-- body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#EDE9E2;line-height:1.3;">${subject}</h1>
          <div style="font-size:14px;color:#948E80;line-height:1.7;">${body}</div>
          ${cta ? `
          <div style="margin-top:28px;">
            <a href="${cta.url}" style="display:inline-block;background:#B8F0FF;color:#080706;font-family:monospace;font-size:11px;letter-spacing:0.15em;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;">
              ${cta.label}
            </a>
          </div>` : ""}
        </td></tr>
        <!-- footer -->
        <tr style="background:#0A0908;">
          <td style="padding:16px 32px;">
            <p style="margin:0;font-family:monospace;font-size:9px;letter-spacing:0.2em;color:#3A3530;">
              DOMANI · ABUJA / WORLDWIDE · DOMANIMEDIA.COM
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── OTP ───────────────────────────────────────────────────────────────────────
export async function sendOtpEmail(to: string, code: string, projectSlug: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${code} — your Domani verification code`,
    html: html(
      projectSlug,
      "Verification code",
      `<p>Use this code to sign in to your workspace. It expires in <strong style="color:#EDE9E2;">10 minutes</strong>.</p>
       <p style="font-family:monospace;font-size:36px;letter-spacing:0.25em;color:#EDE9E2;margin:20px 0;">${code}</p>
       <p style="font-size:12px;color:#6B665C;">If you didn't request this, you can safely ignore it.</p>`
    ),
  });
}

// ── CLIENT NOTIFICATIONS ─────────────────────────────────────────────────────
export async function sendProjectEmail(
  to: string | string[],
  {
    codename,
    subject,
    body,
    cta,
  }: { codename: string; subject: string; body: string; cta?: { label: string; url: string } }
) {
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length) return;

  await resend.emails.send({
    from: FROM,
    to: recipients,
    subject,
    html: html(codename, subject, body, cta),
  });
}

// ── ADMIN NOTIFICATIONS ───────────────────────────────────────────────────────
export async function sendAdminEmail(
  to: string | string[],
  {
    subject,
    body,
    cta,
  }: { subject: string; body: string; cta?: { label: string; url: string } }
) {
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length) return;

  await resend.emails.send({
    from: ADMIN_FROM,
    to: recipients,
    subject,
    html: html("Admin", subject, body, cta),
  });
}
