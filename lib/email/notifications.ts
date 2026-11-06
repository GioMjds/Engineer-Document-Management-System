import { sendMail } from './client';
import { renderInviteEmail } from './templates/invite-user';

export interface EmailDetailItem {
  label: string;
  value: string;
}

export interface EdmsAlertPayload {
  to: string[];
  subject: string;
  headline: string;
  details: EmailDetailItem[];
  actionLabel?: string;
  actionUrl?: string;
}

// Send structured transactional notification email to internal or external recipients.
export async function sendEdmsAlert(
  payload: EdmsAlertPayload,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const detailsRows = payload.details
    .map(
      (d) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 500; width: 140px;">${d.label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 600;">${d.value}</td>
      </tr>
    `,
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${payload.subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
    <tr>
      <td style="padding: 20px 24px; background-color: #0f172a; color: #ffffff;">
        <div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; font-weight: 600;">CVTEC EDMS &bull; Engineering Alert</div>
        <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">${payload.headline}</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-collapse: collapse; border: 1px solid #e2e8f0;">
          ${detailsRows}
        </table>
        ${
          payload.actionUrl
            ? `
          <div>
            <a href="${payload.actionUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 4px;">
              ${payload.actionLabel ?? 'View Details in EDMS'} &rarr;
            </a>
          </div>
        `
            : ''
        }
      </td>
    </tr>
    <tr>
      <td style="padding: 14px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        Automated alert from CVTEC Engineering Document Management System.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendMail({ to: payload.to, subject: payload.subject, html });
}

// Send custom account invitation email containing password setup activation link.
export async function sendUserInviteEmail(params: {
  email: string;
  fullName: string;
  role: string;
  actionLink: string;
}): Promise<{ ok: boolean; error?: string }> {
  const roleLabels = {
    admin: 'Administrator',
    ceo: 'Executive / CEO',
    area_manager: 'Area Manager',
    resident_engineer: 'Resident Engineer',
    authority_engineer: 'Authority Engineer',
    engineer: 'Discipline Engineer',
    dc: 'Document Controller',
  } satisfies Record<string, string>;

  const html = renderInviteEmail({
    fullName: params.fullName,
    roleName: roleLabels[params.role as keyof typeof roleLabels],
    inviteLink: params.actionLink,
  });

  return sendMail({
    to: [params.email],
    subject: 'Invitation to CVTEC Engineering Document System',
    html,
  });
}
