import { getSessionUser } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { parseAmount, validateDate, validateText, ValidationError } from "@/lib/expenses";

export const runtime = "nodejs";

type ExpenseRouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: ExpenseRouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

    const { id } = await params;
    if (!id) return Response.json({ error: "Expense id is required." }, { status: 400 });

    const payload = (await request.json()) as Record<string, unknown>;
    const sets: string[] = [];
    const values: string[] = [];

    if ("amount" in payload) {
      values.push(parseAmount(payload.amount));
      sets.push(`amount = $${values.length}`);
    }

    if ("category" in payload) {
      values.push(validateText(payload.category, "Category", 60));
      sets.push(`category = $${values.length}`);
    }

    if ("description" in payload) {
      values.push(validateText(payload.description, "Description", 250));
      sets.push(`description = $${values.length}`);
    }

    if ("date" in payload) {
      values.push(validateDate(payload.date));
      sets.push(`expense_date = $${values.length}`);
    }

    if (!sets.length) {
      return Response.json({ error: "No valid fields provided for update." }, { status: 400 });
    }

    values.push(user.id);
    values.push(id);

    const pool = getPool();
    const result = await pool.query(
      `
        UPDATE expenses
        SET ${sets.join(", ")}
        WHERE user_id = $${values.length - 1}
          AND id = $${values.length}
        RETURNING id, amount::text AS amount, category, description, expense_date::text AS date, created_at::text
      `,
      values,
    );

    if (!result.rowCount) {
      return Response.json({ error: "Expense not found." }, { status: 404 });
    }

    return Response.json({ expense: result.rows[0] }, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Failed to update expense." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: ExpenseRouteParams) {
  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

    const { id } = await params;
    if (!id) return Response.json({ error: "Expense id is required." }, { status: 400 });

    const pool = getPool();
    const result = await pool.query(
      `
        DELETE FROM expenses
        WHERE user_id = $1
          AND id = $2
      `,
      [user.id, id],
    );

    if (!result.rowCount) {
      return Response.json({ error: "Expense not found." }, { status: 404 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return Response.json({ error: "Failed to delete expense." }, { status: 500 });
  }
}

