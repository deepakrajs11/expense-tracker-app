import { createHash, randomBytes } from "crypto";

export const createPasswordResetToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const hashPasswordResetToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const getWebBaseUrl = (): string => {
  const configured = process.env.WEB_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "http://localhost:3000";
};

