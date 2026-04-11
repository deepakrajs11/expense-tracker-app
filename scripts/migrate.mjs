import { Pool } from "pg";

const parsePort = (value, fallback) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shouldUseSsl = () => {
  const value = process.env.DB_SSL?.trim().toLowerCase();
  return value !== "false";
};

const createPool = () => {
  if (process.env.DATABASE_URL?.trim()) {
    return new Pool({
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    });
  }

  const host = process.env.DB_POOLER_HOST?.trim() || process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();
  const database = process.env.DB_NAME?.trim();

  if (!host || !user || !password || !database) {
    throw new Error(
      "Missing DB env vars. Set DATABASE_URL or DB_HOST/DB_POOLER_HOST + DB_USER + DB_PASSWORD + DB_NAME.",
    );
  }

  return new Pool({
    host,
    user,
    password,
    database,
    port: parsePort(process.env.DB_PORT, 5432),
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });
};

const migrationSql = `
  CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(60) NOT NULL,
    description VARCHAR(250) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'expenses'
        AND column_name = 'amount_paise'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'expenses'
        AND column_name = 'amount'
    ) THEN
      ALTER TABLE expenses ADD COLUMN amount NUMERIC(12,2);
      UPDATE expenses SET amount = (amount_paise::numeric / 100);
      ALTER TABLE expenses ALTER COLUMN amount SET NOT NULL;
      ALTER TABLE expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);
      ALTER TABLE expenses DROP COLUMN amount_paise;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses (expense_date DESC);
  CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses (category);

  CREATE TABLE IF NOT EXISTS expense_idempotency (
    idempotency_key VARCHAR(200) PRIMARY KEY,
    request_hash CHAR(64) NOT NULL,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const run = async () => {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(migrationSql);
    await client.query("COMMIT");
    console.log("Migration completed: expenses + expense_idempotency tables are ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
