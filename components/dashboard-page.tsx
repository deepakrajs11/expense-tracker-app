"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/app-navbar";
import { useTheme } from "@/lib/useTheme";

type UserSession = {
  id: string;
  email: string;
  name: string;
};

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

const formatInr = (amountPaise: number): string => {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
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

const createIdempotencyKey = (): string => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const pendingKeyForUser = (userId: string): string => `expense-tracker:pending-submission:${userId}`;

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [session, setSession] = useState<UserSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("date_desc");

  const fetchSession = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await readJson<{ user: UserSession | null }>(response);
      if (!response.ok || !data.user) {
        router.replace("/login");
        return;
      }
      setSession(data.user);
    } catch {
      router.replace("/login");
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  const fetchExpenses = useCallback(
    async (nextCategory = categoryFilter, nextSort = sort) => {
      if (!session) return;
      setIsLoading(true);
      setExpenseError(null);

      try {
        const params = new URLSearchParams();
        if (nextCategory) params.set("category", nextCategory);
        if (nextSort) params.set("sort", nextSort);

        const response = await fetch(`/api/expenses?${params.toString()}`, {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) throw new Error("Could not load expenses.");

        const data = await readJson<{ expenses: Expense[] }>(response);
        setItems(data.expenses);
      } catch (fetchError) {
        setExpenseError(fetchError instanceof Error ? fetchError.message : "Failed to load expenses.");
      } finally {
        setIsLoading(false);
      }
    },
    [categoryFilter, router, session, sort],
  );

  const submitExpense = useCallback(
    async (payload: PendingSubmission["payload"], key: string) => {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.replace("/login");
        throw new Error("Session expired. Please login again.");
      }

      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Failed to save expense.");
    },
    [router],
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const onSubmitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    setIsSubmitting(true);
    setExpenseError(null);
    setRetryNotice(null);

    const payload = { amount, category, description, date };
    const pending: PendingSubmission = {
      key: createIdempotencyKey(),
      payload,
    };

    localStorage.setItem(pendingKeyForUser(session.id), JSON.stringify(pending));

    try {
      await submitExpense(payload, pending.key);
      localStorage.removeItem(pendingKeyForUser(session.id));

      setAmount("");
      setCategory("");
      setDescription("");
      setDate("");
      await fetchExpenses();
    } catch (submitError) {
      setExpenseError(submitError instanceof Error ? submitError.message : "Failed to save expense.");
      setRetryNotice("Submission saved locally. You can retry safely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!session) return;
    fetchExpenses();
  }, [fetchExpenses, session]);

  useEffect(() => {
    if (!session) return;

    const raw = localStorage.getItem(pendingKeyForUser(session.id));
    if (!raw) return;

    const retryPending = async () => {
      try {
        const pending = JSON.parse(raw) as PendingSubmission;
        setIsSubmitting(true);
        await submitExpense(pending.payload, pending.key);
        localStorage.removeItem(pendingKeyForUser(session.id));
        setRetryNotice("Recovered one pending submission after reconnect.");
        await fetchExpenses();
      } catch {
        setRetryNotice("Pending submission is stored locally. Retry after network recovery.");
      } finally {
        setIsSubmitting(false);
      }
    };

    retryPending();
  }, [fetchExpenses, session, submitExpense]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [items]);

  const totalPaise = useMemo(() => items.reduce((sum, item) => sum + item.amountPaise, 0), [items]);

  if (isChecking || !session) {
    return (
      <main className="app-shell grid min-h-screen place-items-center px-4">
        <div className="panel px-6 py-4 text-sm">Loading your dashboard...</div>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen w-full px-3 py-3 sm:px-4">
      <AppNavbar
        theme={theme}
        onToggleTheme={toggleTheme}
        isAuthenticated={true}
        onLogout={handleLogout}
      />

      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-4 px-1 py-2 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="panel h-fit p-4 lg:sticky lg:top-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] muted">Workspace</p>
          <h1 className="mt-2 text-lg font-semibold">{session.name}</h1>
          <p className="text-sm muted">{session.email}</p>

          <nav className="mt-5 grid gap-2 text-sm">
            <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 font-semibold">Dashboard</div>
            <div className="rounded-lg px-3 py-2 muted">Expenses</div>
            <div className="rounded-lg px-3 py-2 muted">Filters</div>
          </nav>
        </aside>

        <section className="grid min-w-0 grid-cols-1 gap-4">
          <header className="panel px-5 py-4 sm:px-6">
            <h2 className="text-2xl font-semibold">Expense Dashboard</h2>
            <p className="mt-1 text-sm muted">Track, filter, and review your expenses with reliable request handling.</p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] muted">Current Total</p>
              <p className="mt-2 text-xl font-semibold">{formatInr(totalPaise)}</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] muted">Visible Expenses</p>
              <p className="mt-2 text-xl font-semibold">{items.length}</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] muted">Categories</p>
              <p className="mt-2 text-xl font-semibold">{categories.length}</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <article className="panel p-5">
              <h3 className="text-lg font-semibold">Add Expense</h3>
              <p className="mt-1 text-sm muted">Submissions are idempotent and safe to retry.</p>

              <form className="mt-4 grid gap-4" onSubmit={onSubmitExpense}>
                <label className="text-sm font-medium">
                  Amount (INR)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="input-control mt-1.5"
                    placeholder="e.g. 249.99"
                  />
                </label>

                <label className="text-sm font-medium">
                  Category
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="input-control mt-1.5"
                    placeholder="e.g. Groceries"
                    maxLength={60}
                  />
                </label>

                <label className="text-sm font-medium">
                  Description
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="input-control mt-1.5"
                    placeholder="e.g. Weekly vegetables"
                    maxLength={250}
                  />
                </label>

                <label className="text-sm font-medium">
                  Expense Date
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="input-control mt-1.5"
                  />
                </label>

                <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-70">
                  {isSubmitting ? "Saving..." : "Save Expense"}
                </button>
              </form>

              {expenseError ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{expenseError}</p> : null}
              {retryNotice ? <p className="mt-2 text-sm muted">{retryNotice}</p> : null}
            </article>

            <article className="panel min-w-0 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Expense List</h3>
                  <p className="text-sm muted">Sorted by newest date first.</p>
                </div>
                <button type="button" onClick={() => fetchExpenses()} className="btn-secondary px-3 text-sm">
                  Refresh
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Filter by category
                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCategoryFilter(value);
                      fetchExpenses(value, sort);
                    }}
                    className="input-control mt-1.5"
                  >
                    <option value="">All categories</option>
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Sort
                  <select
                    value={sort}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSort(value);
                      fetchExpenses(categoryFilter, value);
                    }}
                    className="input-control mt-1.5"
                  >
                    <option value="date_desc">Date (Newest first)</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
                <div className="max-h-[490px] overflow-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead className="bg-[var(--surface-muted)]">
                      <tr>
                        <th className="px-3 py-3 font-semibold muted">Date</th>
                        <th className="px-3 py-3 font-semibold muted">Category</th>
                        <th className="px-3 py-3 font-semibold muted">Description</th>
                        <th className="px-3 py-3 text-right font-semibold muted">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        [...Array.from({ length: 5 })].map((_, index) => (
                          <tr key={`loading-${index}`} className="border-t border-[var(--border)]">
                            <td colSpan={4} className="px-3 py-3">
                              <div className="h-3 animate-pulse rounded bg-[var(--surface-muted)]" />
                            </td>
                          </tr>
                        ))
                      ) : items.length === 0 ? (
                        <tr className="border-t border-[var(--border)]">
                          <td colSpan={4} className="px-3 py-7 text-center muted">
                            No expenses found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="border-t border-[var(--border)]">
                            <td className="px-3 py-3">{formatDate(item.date)}</td>
                            <td className="px-3 py-3">{item.category}</td>
                            <td className="px-3 py-3 muted">{item.description}</td>
                            <td className="px-3 py-3 text-right font-semibold">{formatInr(item.amountPaise)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
