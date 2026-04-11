import { getPool } from "@/lib/db";
import { hashPassword, validateStrongPassword } from "@/lib/auth";
import { hashPasswordResetToken } from "@/lib/password-reset";

export const runtime = "nodejs";

const isResetTokenValid = async (rawToken: string): Promise<boolean> => {
  const pool = getPool();
  const tokenHash = hashPasswordResetToken(rawToken);

  const result = await pool.query(
    `
      SELECT 1
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );

  return Boolean(result.rowCount);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return Response.json({ valid: false }, { status: 200 });
  }

  const valid = await isResetTokenValid(token);
  return Response.json({ valid }, { status: 200 });
}

export async function POST(request: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const token = String(payload.token ?? "").trim();
    const password = validateStrongPassword(payload.password);

    if (!token) {
      return Response.json({ error: "Token is required." }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(token);
    const passwordHash = hashPassword(password);

    await client.query("BEGIN");

    const tokenResult = await client.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      `,
      [tokenHash],
    );

    if (!tokenResult.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Token is invalid or expired." }, { status: 400 });
    }

    const userId = tokenResult.rows[0].user_id;

    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`, [tokenHash]);
    await client.query(
      `
        DELETE FROM password_reset_tokens
        WHERE user_id = $1
          AND used_at IS NULL
      `,
      [userId],
    );

    await client.query("COMMIT");
    return Response.json({ message: "Password updated successfully." }, { status: 200 });
  } catch (error) {
    await client.query("ROLLBACK");
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    return Response.json({ error: message }, { status: 400 });
  } finally {
    client.release();
  }
}

