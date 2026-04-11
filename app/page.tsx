"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Expense = {
  id: string;
  amount: string;
  amountPaise: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
};

type PendingSubmission = {
  key: string;
  payload: {
    amount: string;
    category: string;
    description: string;
    date: string;
  };
};

const PENDING_STORAGE_KEY = "expense-tracker:pending-submission";

const formatInr = (amountPaise: number): string => {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
};

const createIdempotencyKey = (): string => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function Home() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("date_desc");

  const fetchExpenses = useCallback(
    async (nextCategory = categoryFilter, nextSort = sort) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (nextCategory) params.set("category", nextCategory);
        if (nextSort) params.set("sort", nextSort);

        const response = await fetch(`/api/expenses?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load expenses.");
        }

        const data = (await response.json()) as { expenses: Expense[] };
        setItems(data.expenses);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load expenses.");
      } finally {
        setIsLoading(false);
      }
    },
    [categoryFilter, sort],
  );

  const submitExpense = useCallback(async (payload: PendingSubmission["payload"], key: string) => {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error || "Failed to save expense.");
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    const pendingRaw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!pendingRaw) return;

    const restoreAndRetry = async () => {
      try {
        const pending = JSON.parse(pendingRaw) as PendingSubmission;
        setIsSubmitting(true);
        await submitExpense(pending.payload, pending.key);
        localStorage.removeItem(PENDING_STORAGE_KEY);
        await fetchExpenses();
      } catch {
        // Keep the pending payload so users can retry after network recovery.
      } finally {
        setIsSubmitting(false);
      }
    };

    restoreAndRetry();
  }, [fetchExpenses, submitExpense]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [items]);

  const totalPaise = useMemo(() => items.reduce((sum, item) => sum + item.amountPaise, 0), [items]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = { amount, category, description, date };
    const pending: PendingSubmission = {
      key: createIdempotencyKey(),
      payload,
    };

    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));

    try {
      await submitExpense(payload, pending.key);
      localStorage.removeItem(PENDING_STORAGE_KEY);

      setAmount("");
      setCategory("");
      setDescription("");
      setDate("");
      await fetchExpenses();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:px-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Expense Tracker</h1>
        <p className="mt-1 text-sm text-gray-600">
          Add expenses, filter by category, and track your total spend.
        </p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Amount (INR)
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g. 249.99"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Category
            <input
              type="text"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g. Groceries"
              maxLength={60}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700 sm:col-span-2">
            Description
            <input
              type="text"
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g. Weekly vegetables"
              maxLength={250}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Date
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-md bg-gray-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Add Expense"}
            </button>
          </div>
        </form>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Filter by category
              <select
                value={categoryFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategoryFilter(value);
                  fetchExpenses(value, sort);
                }}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">All categories</option>
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Sort
              <select
                value={sort}
                onChange={(event) => {
                  const value = event.target.value;
                  setSort(value);
                  fetchExpenses(categoryFilter, value);
                }}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="date_desc">Date (Newest first)</option>
              </select>
            </label>
          </div>

          <p className="text-lg font-semibold text-gray-900">Total: {formatInr(totalPaise)}</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-700">
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-gray-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-gray-500">
                    No expenses found for this view.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-2 py-2">{item.date}</td>
                    <td className="px-2 py-2">{item.category}</td>
                    <td className="px-2 py-2">{item.description}</td>
                    <td className="px-2 py-2 text-right">{formatInr(item.amountPaise)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
