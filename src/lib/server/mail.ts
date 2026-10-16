import nodemailer from "nodemailer";

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Sends a plain mail with one call-to-action link. Returns false when SMTP is not configured. */
export async function sendMail(opts: { to: string; subject: string; text: string; linkLabel: string; link: string }) {
  if (!mailConfigured()) return false;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
<h2 style="color:#166534;margin:0 0 16px">🎾 WinterTennis</h2>
<p style="white-space:pre-line;line-height:1.5">${escapeHtml(opts.text)}</p>
<p><a href="${escapeHtml(opts.link)}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(opts.linkLabel)}</a></p>
<p style="color:#6b7280;font-size:13px">Werkt de knop niet? Kopieer deze link:<br>${escapeHtml(opts.link)}</p></div>`;
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    text: `${opts.text}\n\n${opts.linkLabel}: ${opts.link}`,
    html,
  });
  return true;
}

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
