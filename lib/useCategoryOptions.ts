"use client";

import { useMemo, useState } from "react";

const CATEGORY_STORAGE_KEY = "expense-tracker:category-options";

const DEFAULT_CATEGORIES = [
  "Groceries",
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Travel",
  "Bills",
] as const;

const normalizeCategory = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const uniqueCategories = (values: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeCategory(value);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  });

  return output.sort((a, b) => a.localeCompare(b));
};

export const useCategoryOptions = (extraCategories: string[] = []) => {
  const [savedCategories, setSavedCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [...DEFAULT_CATEGORIES];
    }

    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) return [...DEFAULT_CATEGORIES];

    try {
      const parsed = JSON.parse(raw) as string[];
      return uniqueCategories([...DEFAULT_CATEGORIES, ...parsed]);
    } catch {
      return [...DEFAULT_CATEGORIES];
    }
  });

  const categories = useMemo(() => {
    return uniqueCategories([...savedCategories, ...extraCategories]);
  }, [savedCategories, extraCategories]);

  const persist = (next: string[]) => {
    const normalized = uniqueCategories(next);
    setSavedCategories(normalized);
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(normalized));
  };

  const addCategory = (name: string): string | null => {
    const normalized = normalizeCategory(name);
    if (!normalized) return null;

    persist([...savedCategories, normalized]);
    return normalized;
  };

  return { categories, addCategory };
};
