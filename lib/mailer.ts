import nodemailer from "nodemailer";

const hasSmtpConfig = (): boolean => {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
};

export const sendPasswordResetEmail = async (toEmail: string, resetLink: string): Promise<void> => {
  if (!hasSmtpConfig()) {
    console.log(`[password-reset] SMTP not configured. Reset link for ${toEmail}: ${resetLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port: Number.parseInt(process.env.SMTP_PORT?.trim() || "587", 10),
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
    },
  });

  const fromAddress = process.env.SMTP_FROM?.trim() || "no-reply@expense-tracker.app";

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: "Reset your Expense Tracker password",
    text: `You requested a password reset. Use this link to set a new password: ${resetLink}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p>
        Click this link to set a new password:<br />
        <a href="${resetLink}">${resetLink}</a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
};

