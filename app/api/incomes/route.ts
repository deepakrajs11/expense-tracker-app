import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { getPool } from "@/lib/db";
import {
  buildRequestHash,
  normalizeIncome,
  parseNewIncome,
  ValidationError,
} from "@/lib/incomes";

export const runtime = "nodejs";

const getIdempotencyKey = (request: Request): string => {
  return (
    request.headers.get("idempotency-key")?.trim() ||
    request.headers.get("x-idempotency-key")?.trim() ||
    randomUUID()
  );
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const input = parseNewIncome(payload);
    const idempotencyKey = getIdempotencyKey(request);
    const requestHash = buildRequestHash(input);
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query<{
        idempotency_key: string;
        request_hash: string;
        income_id: string;
      }>(
        `
          SELECT idempotency_key, request_hash, income_id
          FROM income_idempotency
          WHERE user_id = $1 AND idempotency_key = $2
          FOR UPDATE
        `,
        [user.id, idempotencyKey],
      );

      if (existing.rowCount && existing.rows[0].request_hash !== requestHash) {
        await client.query("ROLLBACK");
        return Response.json(
          { error: "Idempotency key already used with a different payload." },
          { status: 409 },
        );
      }

      if (existing.rowCount) {
        const priorIncome = await client.query(
          `
            SELECT id, amount::text AS amount, place, source, income_date::text AS date, created_at::text
            FROM incomes
            WHERE id = $1 AND user_id = $2
          `,
          [existing.rows[0].income_id, user.id],
        );

        await client.query("COMMIT");
        if (!priorIncome.rowCount) {
          return Response.json({ error: "Unable to resolve prior request." }, { status: 409 });
        }
        return Response.json({ income: normalizeIncome(priorIncome.rows[0]) }, { status: 200 });
      }

      const inserted = await client.query(
        `
          INSERT INTO incomes (id, user_id, amount, place, source, income_date)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, amount::text AS amount, place, source, income_date::text AS date, created_at::text
        `,
        [randomUUID(), user.id, input.amount, input.place, input.source, input.date],
      );

      await client.query(
        `
          INSERT INTO income_idempotency (user_id, idempotency_key, request_hash, income_id)
          VALUES ($1, $2, $3, $4)
        `,
        [user.id, idempotencyKey, requestHash, inserted.rows[0].id],
      );

      await client.query("COMMIT");
      return Response.json({ income: normalizeIncome(inserted.rows[0]) }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ error: "Failed to create income." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const pool = getPool();
    const { searchParams } = new URL(request.url);
    const place = searchParams.get("place")?.trim();
    const sort = searchParams.get("sort");

    const clauses: string[] = [];
    const values: (string | number)[] = [];

    values.push(user.id);
    clauses.push(`user_id = $${values.length}`);

    if (place) {
      values.push(place);
      clauses.push(`place = $${values.length}`);
    }

    const where = `WHERE ${clauses.join(" AND ")}`;
    const orderBy = sort === "date_desc" || !sort ? "ORDER BY income_date DESC, created_at DESC" : "";

    const query = `
      SELECT id, amount::text AS amount, place, source, income_date::text AS date, created_at::text
      FROM incomes
      ${where}
      ${orderBy}
    `;

    const result = await pool.query(query, values);
    return Response.json({ incomes: result.rows.map(normalizeIncome) });
  } catch {
    return Response.json({ error: "Failed to fetch incomes." }, { status: 500 });
  }
}
