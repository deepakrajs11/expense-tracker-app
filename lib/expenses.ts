import { createHash } from "crypto";

export type NewExpenseInput = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

export type ExpenseRow = {
  id: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  created_at: string;
};

export class ValidationError extends Error {}

const amountPattern = /^\d+(\.\d{1,2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const parseAmount = (value: unknown): string => {
  const amountRaw = String(value ?? "").trim();
  if (!amountPattern.test(amountRaw)) {
    throw new ValidationError("Amount must be a positive number with up to 2 decimals.");
  }

  const [wholePart, fractionPart = ""] = amountRaw.split(".");
  const whole = Number.parseInt(wholePart, 10);
  const normalized = `${whole}.${fractionPart.padEnd(2, "0")}`;
  const asNumber = Number(normalized);

  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    throw new ValidationError("Amount must be greater than zero.");
  }

  return normalized;
};

export const validateDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!datePattern.test(raw)) {
    throw new ValidationError("Date must be in YYYY-MM-DD format.");
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new ValidationError("Date is invalid.");
  }

  return raw;
};

export const validateText = (value: unknown, fieldName: string, maxLength: number): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new ValidationError(`${fieldName} is required.`);
  }
  if (raw.length > maxLength) {
    throw new ValidationError(`${fieldName} must be ${maxLength} characters or less.`);
  }
  return raw;
};

export const parseNewExpense = (payload: unknown): NewExpenseInput => {
  const body = payload as Record<string, unknown>;

  return {
    amount: parseAmount(body.amount),
    category: validateText(body.category, "Category", 60),
    description: validateText(body.description, "Description", 250),
    date: validateDate(body.date),
  };
};

export const buildRequestHash = (input: NewExpenseInput): string => {
  const canonical = JSON.stringify({
    amount: input.amount,
    category: input.category,
    description: input.description,
    date: input.date,
  });
  return createHash("sha256").update(canonical).digest("hex");
};

export const formatRupeesFromPaise = (paise: number): string => {
  return (paise / 100).toFixed(2);
};

export const normalizeExpense = (row: ExpenseRow) => {
  const normalizedAmount = parseAmount(row.amount);
  const [wholePart, fractionPart] = normalizedAmount.split(".");
  const amountPaise = Number.parseInt(wholePart, 10) * 100 + Number.parseInt(fractionPart, 10);

  return {
    id: row.id,
    amount: normalizedAmount,
    amountPaise,
    category: row.category,
    description: row.description,
    date: row.date,
    created_at: row.created_at,
  };
};
