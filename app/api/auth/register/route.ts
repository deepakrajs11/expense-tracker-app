import { randomUUID } from "crypto";
import { getPool } from "@/lib/db";
import {
  AuthError,
  buildSessionCookie,
  createJwtForUser,
  hashPassword,
  normalizeEmail,
  validateName,
  validateStrongPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = validateName(payload.name);
    const email = normalizeEmail(payload.email);
    const password = validateStrongPassword(payload.password);
    const passwordHash = hashPassword(password);

    await client.query("BEGIN");

    const existing = await client.query<{ id: string }>(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [
      email,
    ]);
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Email is already registered." }, { status: 409 });
    }

    const userId = randomUUID();
    await client.query(
      `
        INSERT INTO users (id, email, name, password_hash)
        VALUES ($1, $2, $3, $4)
      `,
      [userId, email, name, passwordHash],
    );

    await client.query("COMMIT");

    const sessionToken = createJwtForUser({ id: userId, email, name });

    return Response.json(
      {
        user: { id: userId, email, name },
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": buildSessionCookie(sessionToken),
        },
      },
    );
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Failed to register account." }, { status: 500 });
  } finally {
    client.release();
  }
}
