import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY env var");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(to: string, code: string, projectSlug: string) {
  await resend.emails.send({
    from: "Domani Projects <projects@domanimedia.com>",
    to,
    subject: `Your verification code: ${code}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <p style="color:#666; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;">Domani Projects · ${projectSlug}</p>
        <h1 style="font-size: 32px; letter-spacing: 0.1em; margin: 16px 0;">${code}</h1>
        <p style="color:#666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
