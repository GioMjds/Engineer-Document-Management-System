import { Resend } from 'resend';

// Initialize Resend client using server-side environment key.
const resendApiKey = process.env.RESEND_API_KEY;

export const resend = new Resend(resendApiKey);

export const EMAIL_FROM =
  process.env.EMAIL_FROM || 'CVTEC EDMS <onboarding@resend.dev>';
