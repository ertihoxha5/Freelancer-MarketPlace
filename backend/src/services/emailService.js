import nodemailer from "nodemailer";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function baseTemplate({ title, bodyHtml, ctaLabel, ctaUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:#2f4f2f;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Freelancer Marketplace</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:24px;color:#0f172a;">${title}</h1>
              ${bodyHtml}
              ${
                ctaUrl
                  ? `<p style="margin:28px 0 0;">
                <a href="${ctaUrl}" style="display:inline-block;background:#2f4f2f;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;">${ctaLabel}</a>
              </p>`
                  : ""
              }
              <p style="margin:28px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
                If you did not request this email, you can safely ignore it. This link expires in 24 hours.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">© Freelancer Marketplace</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMail({ to, subject, html }) {
  const transport = createTransport();
  if (!transport) {
    console.warn(
      "[emailService] SMTP not configured — set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env",
    );
    return false;
  }

  await transport.sendMail({
    from: `"Freelancer Marketplace" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  return true;
}

/**
 * @param {string} email
 * @param {string} fullName
 * @param {string} token Raw verification token (sent in link, stored hashed in DB)
 */
export async function sendVerificationEmail(email, fullName, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const html = baseTemplate({
    title: "Verify your email",
    bodyHtml: `<p style="margin:0 0 12px;font-size:16px;color:#334155;line-height:1.6;">
        Hi ${fullName},</p>
      <p style="margin:0;font-size:16px;color:#334155;line-height:1.6;">
        Thanks for joining Freelancer Marketplace. Please confirm your email address to activate your account and sign in.
      </p>`,
    ctaLabel: "Verify email",
    ctaUrl: verifyUrl,
  });

  return sendMail({
    to: email,
    subject: "Verify your Freelancer Marketplace account",
    html,
  });
}

/**
 * @param {string} email
 * @param {string} token Raw reset token
 */
export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = baseTemplate({
    title: "Reset your password",
    bodyHtml: `<p style="margin:0;font-size:16px;color:#334155;line-height:1.6;">
        We received a request to reset the password for your account. Click the button below to choose a new password. This link works only once.
      </p>`,
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
  });

  return sendMail({
    to: email,
    subject: "Reset your Freelancer Marketplace password",
    html,
  });
}
