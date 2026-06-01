import { Pool } from "pg";
import "dotenv/config";

const parsePort = (value, fallback) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shouldUseSsl = () => {
  const value = process.env.DB_SSL?.trim().toLowerCase();
  return value !== "false" && !!process.env.DATABASE_URL;
};

const createPool = () => {
  if (process.env.DATABASE_URL?.trim()) {
    let conn = process.env.DATABASE_URL.trim();
    if (shouldUseSsl() && !/sslmode=/i.test(conn)) {
      conn += (conn.includes("?") ? "&" : "?") + "sslmode=require";
    }
    return new Pool({
      connectionString: conn,
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

const run = async () => {
  const pool = createPool();
  const client = await pool.connect();
  try {
    console.log("Dropping public schema (this will remove ALL objects in the database)...");
    await client.query("DROP SCHEMA public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    console.log("Schema dropped and recreated.");
  } catch (err) {
    console.error("Failed to drop schema:", err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
