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
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  INSERT INTO users (id, email, name, password_hash)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'legacy@expense-tracker.local',
    'Legacy Owner',
    'legacy:legacy'
  )
  ON CONFLICT (email) DO NOTHING;

  CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(60) NOT NULL,
    description VARCHAR(250) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'expenses'
        AND column_name = 'user_id'
    ) THEN
      ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;

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

  UPDATE expenses
  SET user_id = '00000000-0000-0000-0000-000000000001'
  WHERE user_id IS NULL;

  ALTER TABLE expenses
  ALTER COLUMN user_id SET NOT NULL;

  CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses (expense_date DESC);
  CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses (category);
  CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses (user_id);
  CREATE INDEX IF NOT EXISTS expenses_user_id_date_idx ON expenses (user_id, expense_date DESC, created_at DESC);

  CREATE TABLE IF NOT EXISTS expense_idempotency (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(200) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, idempotency_key)
  );

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'expense_idempotency'
        AND column_name = 'user_id'
    ) THEN
      ALTER TABLE expense_idempotency ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END $$;

  UPDATE expense_idempotency ei
  SET user_id = e.user_id
  FROM expenses e
  WHERE ei.expense_id = e.id
    AND ei.user_id IS NULL;

  ALTER TABLE expense_idempotency
  ALTER COLUMN user_id SET NOT NULL;

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'expense_idempotency'
        AND constraint_name = 'expense_idempotency_pkey'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE expense_idempotency DROP CONSTRAINT expense_idempotency_pkey;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'expense_idempotency'
        AND constraint_name = 'expense_idempotency_pkey'
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE expense_idempotency
      ADD CONSTRAINT expense_idempotency_pkey PRIMARY KEY (user_id, idempotency_key);
    END IF;
  END $$;

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);
  CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens (expires_at);
`;

const run = async () => {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(migrationSql);
    await client.query("COMMIT");
    console.log(
      "Migration completed: users, expenses, idempotency, and password reset tables are ready.",
    );
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
