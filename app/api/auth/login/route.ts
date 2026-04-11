import { getPool } from "@/lib/db";
import {
  AuthError,
  buildSessionCookie,
  createJwtForUser,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const pool = getPool();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(payload.email);
    const password = validatePassword(payload.password);

    const userResult = await pool.query<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
    }>(
      `
        SELECT id, email, name, password_hash
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    if (!userResult.rowCount || !verifyPassword(password, userResult.rows[0].password_hash)) {
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = userResult.rows[0];
    const sessionToken = createJwtForUser({ id: user.id, email: user.email, name: user.name });

    return Response.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildSessionCookie(sessionToken),
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Failed to login." }, { status: 500 });
  }
}
