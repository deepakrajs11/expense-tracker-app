import { randomUUID, randomBytes, scryptSync } from "crypto";
import { Pool } from "pg";

const DEMO_EMAIL = "test@sample.com";
const DEMO_PASSWORD = "test@123";
const DEMO_NAME = "Demo User";

const CATEGORY_POOL = [
  "Groceries",
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Subscriptions",
];

const DESCRIPTION_POOL = {
  Groceries: "Weekly groceries",
  Food: "Lunch and snacks",
  Transport: "Ride and fuel expense",
  Utilities: "Electricity and internet bill",
  Shopping: "Household shopping",
  Health: "Pharmacy purchase",
  Entertainment: "Movie and streaming",
  Subscriptions: "Monthly app subscription",
};

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

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

const toYmd = (date) => {
  return date.toISOString().slice(0, 10);
};

const randomInRange = (min, max) => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

const buildExpenseRows = (userId) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 60);

  const rows = [];
  const cursor = new Date(start);
  let index = 0;

  while (cursor <= now) {
    const category = CATEGORY_POOL[index % CATEGORY_POOL.length];
    const amountByCategory = {
      Groceries: randomInRange(350, 1800),
      Food: randomInRange(120, 700),
      Transport: randomInRange(90, 600),
      Utilities: randomInRange(500, 2500),
      Shopping: randomInRange(250, 2200),
      Health: randomInRange(150, 1200),
      Entertainment: randomInRange(180, 1000),
      Subscriptions: randomInRange(99, 799),
    };

    rows.push({
      id: randomUUID(),
      user_id: userId,
      amount: amountByCategory[category].toFixed(2),
      category,
      description: DESCRIPTION_POOL[category],
      expense_date: toYmd(cursor),
      created_at: new Date(cursor.getTime() + 10 * 60 * 60 * 1000).toISOString(),
    });

    cursor.setDate(cursor.getDate() + 3);
    index += 1;
  }

  return rows;
};

const run = async () => {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [DEMO_EMAIL],
    );

    const userId = existing.rowCount ? existing.rows[0].id : randomUUID();
    const passwordHash = hashPassword(DEMO_PASSWORD);

    if (existing.rowCount) {
      await client.query(
        `
          UPDATE users
          SET name = $1, password_hash = $2
          WHERE id = $3
        `,
        [DEMO_NAME, passwordHash, userId],
      );
    } else {
      await client.query(
        `
          INSERT INTO users (id, email, name, password_hash)
          VALUES ($1, $2, $3, $4)
        `,
        [userId, DEMO_EMAIL, DEMO_NAME, passwordHash],
      );
    }

    await client.query(`DELETE FROM expense_idempotency WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM expenses WHERE user_id = $1`, [userId]);

    const rows = buildExpenseRows(userId);
    for (const row of rows) {
      await client.query(
        `
          INSERT INTO expenses (id, user_id, amount, category, description, expense_date, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [row.id, row.user_id, row.amount, row.category, row.description, row.expense_date, row.created_at],
      );
    }

    await client.query("COMMIT");

    console.log("Demo seed completed.");
    console.log(`Login email: ${DEMO_EMAIL}`);
    console.log(`Login password: ${DEMO_PASSWORD}`);
    console.log(`Inserted ${rows.length} expense rows covering ~last 60 days.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Demo seed failed:", error.message);
  process.exit(1);
});

