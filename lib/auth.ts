import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";
import { getPool } from "@/lib/db";

const SESSION_COOKIE = "expense_session";
const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
};

const getJwtSecret = (): string => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "dev-only-secret-change-in-production";
  throw new Error("Missing JWT_SECRET in production.");
};

export const normalizeEmail = (value: unknown): string => {
  const email = String(value ?? "").trim().toLowerCase();
  if (!emailPattern.test(email)) {
    throw new AuthError("Enter a valid email address.");
  }
  return email;
};

export const validateName = (value: unknown): string => {
  const name = String(value ?? "").trim();
  if (!name) {
    throw new AuthError("Name is required.");
  }
  if (name.length > 80) {
    throw new AuthError("Name must be 80 characters or less.");
  }
  return name;
};

export const validatePassword = (value: unknown): string => {
  const password = String(value ?? "");
  if (!password) throw new AuthError("Password is required.");
  if (password.length > 120) throw new AuthError("Password is too long.");
  return password;
};

export const validateStrongPassword = (value: unknown): string => {
  const password = validatePassword(value);
  if (password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new AuthError("Password must include at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    throw new AuthError("Password must include at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    throw new AuthError("Password must include at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new AuthError("Password must include at least one symbol.");
  }
  return password;
};

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
  const [salt, existingHash] = stored.split(":");
  if (!salt || !existingHash) return false;

  const candidate = scryptSync(password, salt, 64);
  const existing = Buffer.from(existingHash, "hex");
  if (candidate.length !== existing.length) return false;
  return timingSafeEqual(candidate, existing);
};

const parseCookieHeader = (header: string | null): Record<string, string> => {
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rest] = chunk.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
};

const getSessionTokenFromRequest = (request: Request): string | null => {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies[SESSION_COOKIE] || null;
};

export const createJwtForUser = (user: SessionUser): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    getJwtSecret(),
    {
      algorithm: "HS256",
      expiresIn: SESSION_DURATION_SECONDS,
      issuer: "expense-tracker-app",
    },
  );
};

export const buildSessionCookie = (token: string): string => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${secure}`;
};

export const clearSessionCookie = (): string => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
};

export const getSessionUser = async (request: Request): Promise<SessionUser | null> => {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "expense-tracker-app",
    }) as AuthTokenPayload;

    const userId = payload.sub;
    if (!userId) return null;

    const pool = getPool();
    const result = await pool.query<SessionUser>(
      `
        SELECT id, email, name
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    if (!result.rowCount) return null;
    return result.rows[0];
  } catch {
    return null;
  }
};
