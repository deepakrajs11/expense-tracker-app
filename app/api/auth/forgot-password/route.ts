import { getPool } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { createPasswordResetToken, getWebBaseUrl, hashPasswordResetToken } from "@/lib/password-reset";
import { normalizeEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(payload.email);
    const pool = getPool();

    const userResult = await pool.query<{ id: string; email: string }>(
      `
        SELECT id, email
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    if (userResult.rowCount) {
      const user = userResult.rows[0];
      const rawToken = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);

      await pool.query(
        `
          INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
          VALUES ($1, $2, NOW() + INTERVAL '1 hour')
        `,
        [user.id, tokenHash],
      );

      const resetLink = `${getWebBaseUrl()}/forget-password?token=${encodeURIComponent(rawToken)}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }

    return Response.json(
      {
        message: "If the email is registered, a reset link has been sent.",
      },
      { status: 200 },
    );
  } catch {
    return Response.json({ error: "Failed to process forgot password request." }, { status: 500 });
  }
}

