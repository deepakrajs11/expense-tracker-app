import { Pool } from "pg";

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pickHost = (): string => {
  const pooler = process.env.DB_POOLER_HOST?.trim();
  const host = process.env.DB_HOST?.trim();
  const value = pooler || host;

  if (!value) {
    throw new Error("Missing DB host. Set DB_POOLER_HOST or DB_HOST.");
  }

  return value;
};

const pickUser = (): string => {
  const value = process.env.DB_USER?.trim();
  if (!value) throw new Error("Missing DB_USER.");
  return value;
};

const pickDatabase = (): string => {
  const value = process.env.DB_NAME?.trim();
  if (!value) throw new Error("Missing DB_NAME.");
  return value;
};

const pickPassword = (): string => {
  const value = process.env.DB_PASSWORD?.trim();
  if (!value) throw new Error("Missing DB_PASSWORD.");
  return value;
};

const shouldUseSsl = (): boolean => {
  const value = process.env.DB_SSL?.trim().toLowerCase();
  return value !== "false";
};

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (pool) return pool;

  if (process.env.DATABASE_URL?.trim()) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    });
    return pool;
  }

  pool = new Pool({
    host: pickHost(),
    port: parsePort(process.env.DB_PORT, 5432),
    user: pickUser(),
    password: pickPassword(),
    database: pickDatabase(),
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
};

