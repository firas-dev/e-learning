import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendWarningEmail(
  toEmail: string,
  fullName: string,
  warningNumber: number,
  reason: string
) {
  const remaining = 3 - warningNumber;
  await transporter.sendMail({
    from: `"EduVerse AI" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `⚠️ Warning ${warningNumber}/3 — Community Guidelines Violation`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#f59e0b;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px">⚠️ Warning ${warningNumber} of 3</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#374151;font-size:15px">Hi <strong>${fullName}</strong>,</p>
          <p style="color:#374151;font-size:15px">
            One of your comments in a lesson was flagged as inappropriate and reviewed by our admin team.
          </p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#92400e;margin:0;font-size:14px"><strong>Reason:</strong> ${reason}</p>
          </div>
          <p style="color:#374151;font-size:15px">
            You have <strong style="color:#dc2626">${remaining} warning${remaining !== 1 ? 's' : ''}</strong> remaining before your account is automatically suspended for 7 days.
          </p>
          <p style="color:#6b7280;font-size:14px">Please review our community guidelines and ensure your contributions are respectful.</p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
          <p style="color:#9ca3af;font-size:12px;margin:0">EduVerse AI — Community Guidelines Team</p>
        </div>
      </div>
    `,
  });
}

export async function sendBanEmail(
  toEmail: string,
  fullName: string,
  reason: string,
  banExpiresAt: Date
) {
  const expiry = banExpiresAt.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  await transporter.sendMail({
    from: `"EduVerse AI" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🚫 Account Suspended — EduVerse AI`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#dc2626;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px">🚫 Account Suspended</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#374151;font-size:15px">Hi <strong>${fullName}</strong>,</p>
          <p style="color:#374151;font-size:15px">
            Your account has been suspended due to repeated violations of our community guidelines.
          </p>
          <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#991b1b;margin:0;font-size:14px"><strong>Reason:</strong> ${reason}</p>
          </div>
          <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
            <p style="color:#374151;margin:0 0 4px 0;font-size:14px">Your account will be automatically restored on:</p>
            <p style="color:#1d4ed8;font-size:18px;font-weight:bold;margin:0">${expiry}</p>
          </div>
          <p style="color:#6b7280;font-size:14px">
            After this period, your access will be automatically restored. Please ensure future interactions follow our community guidelines.
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
          <p style="color:#9ca3af;font-size:12px;margin:0">EduVerse AI — Community Guidelines Team</p>
        </div>
      </div>
    `,
  });
}