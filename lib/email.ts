import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, body: string) {
  // Convert plain text body to simple HTML (preserve line breaks, no other formatting)
  const html = body
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 1em 0;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return resend.emails.send({
    from: process.env.SENDER_EMAIL ?? 'onboarding@resend.dev',
    to,
    subject,
    text: body,
    html,
  });
}
