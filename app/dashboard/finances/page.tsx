"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  amountPaise: number;
  category?: string;
  description?: string;
  place?: string;
  source?: string;
  date: string;
  kind: "income" | "expense";
};

const formatInr = (amountPaise: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amountPaise / 100);
};

const formatDate = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

export default function FinancesPage() {
  const [incomes, setIncomes] = useState<Entry[]>([]);
  const [expenses, setExpenses] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [incRes, expRes] = await Promise.all([
        fetch("/api/incomes?sort=date_desc", { cache: "no-store" }),
        fetch("/api/expenses?sort=date_desc", { cache: "no-store" }),
      ]);

      if (!incRes.ok) throw new Error("Failed to fetch incomes.");
      if (!expRes.ok) throw new Error("Failed to fetch expenses.");

      const incJson = await readJson<{ incomes: Omit<Entry, "kind">[] }>(incRes);
      const expJson = await readJson<{ expenses: Omit<Entry, "kind">[] }>(expRes);

      setIncomes(incJson.incomes.map((i) => ({ ...i, kind: "income" })));
      setExpenses(expJson.expenses.map((e) => ({ ...e, kind: "expense" })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoth();
  }, [fetchBoth]);

  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.amountPaise, 0), [incomes]);
  const totalExpense = useMemo(() => expenses.reduce((s, e) => s + e.amountPaise, 0), [expenses]);
  const balance = totalIncome - totalExpense;

  const merged = useMemo(() => {
    const combined: Entry[] = [...incomes, ...expenses];
    combined.sort((a, b) => b.date.localeCompare(a.date));
    return combined;
  }, [incomes, expenses]);

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Finances</h2>
        <p className="mt-1 text-sm muted">Overview of total income, expenses, and current balance.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-sm muted">Total Income</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--positive)]">{formatInr(totalIncome)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm muted">Total Expense</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--danger)]">{formatInr(totalExpense)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm muted">Current Balance</p>
          <p className="mt-2 text-2xl font-semibold">{formatInr(balance)}</p>
        </div>
      </section>

      <section className="panel p-5">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="mt-1 text-sm muted">Income shown as +, expenses as -</p>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold muted">Date</th>
                  <th className="px-3 py-3 font-semibold muted">Type</th>
                  <th className="px-3 py-3 font-semibold muted">Category</th>
                  <th className="px-3 py-3 font-semibold muted">Description</th>
                  <th className="px-3 py-3 text-right font-semibold muted">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array.from({ length: 6 })].map((_, index) => (
                    <tr key={`loading-${index}`} className="border-t border-[var(--border)]">
                      <td colSpan={5} className="px-3 py-3">
                        <div className="skeleton h-3 w-full" />
                      </td>
                    </tr>
                  ))
                ) : merged.length === 0 ? (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={5} className="px-3 py-7 text-center muted">
                      No financial activity found.
                    </td>
                  </tr>
                ) : (
                  merged.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-3">{formatDate(item.date)}</td>
                      <td className="px-3 py-3">{item.kind === "income" ? "+" : "-"}</td>
                      <td className="px-3 py-3">{item.place || item.category}</td>
                      <td className="px-3 py-3 muted">{item.source || item.description}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${item.kind === "income" ? "text-[var(--positive)]" : "text-[var(--danger)]"}`}>
                        {item.kind === "income" ? "+" : "-"}{formatInr(item.amountPaise)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
