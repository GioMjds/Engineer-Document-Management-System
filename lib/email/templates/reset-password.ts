export interface ResetPasswordEmailProps {
  fullName: string;
  resetLink: string;
}

// Generate HTML template for the self-service password reset email.
export function renderResetPasswordEmail({
  fullName,
  resetLink,
}: ResetPasswordEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CVTEC EDMS Password Reset</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
    <tr>
      <td style="padding: 24px; background-color: #0f172a; color: #ffffff;">
        <div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; font-weight: 600;">CVTEC Engineering Consultancy</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px; letter-spacing: -0.01em;">Document Management System</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a;">Password Reset Request</h1>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; color: #334155;">
          Hello <strong>${fullName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 28px 0; color: #334155;">
          We received a request to reset your CVTEC EDMS password. Use the link below to choose a new one. The link expires soon and works once.
        </p>
        <div style="margin-bottom: 28px;">
          <a href="${resetLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 4px;">
            Reset Password &rarr;
          </a>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b; line-height: 1.5;">
          If the button does not work, copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        If you did not request this reset, ignore this email. Your password stays unchanged.
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
