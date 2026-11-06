import nodemailer from 'nodemailer';

export const EMAIL_FROM =
  process.env.EMAIL_FROM || 'CVTEC EDMS <no-reply@localhost>';

// True when SMTP credentials are present.
export const isEmailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Send one email through the configured SMTP relay (Brevo).
export async function sendMail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: 'SMTP is not configured.' };
  }

  try {
    const info = await transporter.sendMail({ from: EMAIL_FROM, ...params });
    return { ok: true, id: info.messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown send error';
    return { ok: false, error: message };
  }
}
