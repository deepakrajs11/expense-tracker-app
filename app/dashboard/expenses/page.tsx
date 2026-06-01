"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCategoryOptions } from "@/lib/useCategoryOptions";

type Expense = {
  id: string;
  amountPaise: number;
  category: string;
  description: string;
  date: string;
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

const escapeCsv = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export default function ExpenseListPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/expenses?sort=date_desc", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch expenses.");

      const data = await readJson<{ expenses: Expense[] }>(response);
      setItems(data.expenses);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch expenses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const { categories } = useCategoryOptions(items.map((item) => item.category));

  const filteredItems = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const minPaise = amountMin ? Math.round(Number.parseFloat(amountMin) * 100) : null;
    const maxPaise = amountMax ? Math.round(Number.parseFloat(amountMax) * 100) : null;

    const base = items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      if (Number.isFinite(minPaise) && minPaise !== null && item.amountPaise < minPaise) return false;
      if (Number.isFinite(maxPaise) && maxPaise !== null && item.amountPaise > maxPaise) return false;
      if (search) {
        const haystack = `${item.category} ${item.description}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sort === "date_asc") return a.date.localeCompare(b.date);
      if (sort === "amount_desc") return b.amountPaise - a.amountPaise;
      if (sort === "amount_asc") return a.amountPaise - b.amountPaise;
      return b.date.localeCompare(a.date);
    });
    return sorted;
  }, [amountMax, amountMin, categoryFilter, dateFrom, dateTo, items, searchText, sort]);

  const total = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.amountPaise, 0),
    [filteredItems],
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safePage - 1) * rowsPerPage;
  const paginatedItems = filteredItems.slice(pageStartIndex, pageStartIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, sort, searchText, dateFrom, dateTo, amountMin, amountMax, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startEdit = (item: Expense) => {
    setEditExpenseId(item.id);
    setEditAmount((item.amountPaise / 100).toFixed(2));
    setEditCategory(item.category);
    setEditDescription(item.description);
    setEditDate(item.date);
    setError(null);
  };

  const cancelEdit = () => {
    setEditExpenseId(null);
    setEditAmount("");
    setEditCategory("");
    setEditDescription("");
    setEditDate("");
  };

  const saveEdit = async () => {
    if (!editExpenseId) return;
    setIsActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/expenses/${editExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: editAmount,
          category: editCategory,
          description: editDescription,
          date: editDate,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to update expense.");

      cancelEdit();
      await fetchExpenses();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update expense.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    const shouldDelete = window.confirm("Delete this expense entry?");
    if (!shouldDelete) return;

    setIsActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to delete expense.");

      if (editExpenseId === id) {
        cancelEdit();
      }
      await fetchExpenses();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to delete expense.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportVisibleAsCsv = () => {
    if (!filteredItems.length) {
      setError("No visible expenses to export.");
      return;
    }

    const header = ["Date", "Category", "Description", "Amount_INR"];
    const rows = filteredItems.map((item) => [
      item.date,
      item.category,
      item.description,
      (item.amountPaise / 100).toFixed(2),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fintrack-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Expense List</h2>
        <p className="mt-1 text-sm muted">
          Filter by category, keep sort by newest date, and review total for visible expenses.
        </p>
      </header>

      <section className="panel p-5">
        {editExpenseId ? (
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="text-sm font-semibold">Edit Expense</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editAmount}
                  onChange={(event) => setEditAmount(event.target.value)}
                  className="input-control"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Category
                <input
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  className="input-control"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Description
                <input
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="input-control"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Date
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  className="input-control"
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={saveEdit} disabled={isActionLoading} className="btn-primary px-4 text-sm disabled:opacity-70">
                {isActionLoading ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary px-4 text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Search
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="input-control"
              placeholder="Search category or description"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Filter by Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input-control"
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="input-control"
            >
              <option value="date_desc">Date (Newest first)</option>
              <option value="date_asc">Date (Oldest first)</option>
              <option value="amount_desc">Amount (High to low)</option>
              <option value="amount_asc">Amount (Low to high)</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-[180px_180px_180px_180px_1fr_auto]">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Date From
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="input-control"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Date To
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="input-control"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Min Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountMin}
              onChange={(event) => setAmountMin(event.target.value)}
              className="input-control"
              placeholder="0.00"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Max Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountMax}
              onChange={(event) => setAmountMax(event.target.value)}
              className="input-control"
              placeholder="5000.00"
            />
          </label>

          <div className="panel-muted grid place-items-center px-4 py-2 text-sm sm:mt-6 xl:mt-0">
            <p>
              Total: <span className="font-semibold">{formatInr(total)}</span>
            </p>
          </div>

          <div className="grid items-end gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={exportVisibleAsCsv}
              className="btn-secondary w-full text-sm"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("");
                setSearchText("");
                setDateFrom("");
                setDateTo("");
                setAmountMin("");
                setAmountMax("");
                setSort("date_desc");
                setRowsPerPage(10);
                setCurrentPage(1);
              }}
              className="btn-secondary w-full text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm muted">
            Showing {filteredItems.length ? pageStartIndex + 1 : 0}-
            {Math.min(pageStartIndex + rowsPerPage, filteredItems.length)} of {filteredItems.length}
          </p>
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Rows / page
              <select
                value={rowsPerPage}
                onChange={(event) => setRowsPerPage(Number.parseInt(event.target.value, 10))}
                className="input-control"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="btn-secondary h-[42px] px-4 text-sm disabled:opacity-60"
            >
              Prev
            </button>
            <div className="panel-muted grid h-[42px] min-w-[110px] place-items-center px-3 text-sm">
              Page {safePage} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
              className="btn-secondary h-[42px] px-4 text-sm disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

        <div className="sm:hidden mt-4 p-2 space-y-3">
          {isLoading ? (
            [...Array.from({ length: 4 })].map((_, index) => (
              <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="skeleton h-4 w-32 mb-3" />
                <div className="skeleton h-3 w-24 mb-2" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center muted">
              No expenses found for the selected filters.
            </div>
          ) : (
            paginatedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="font-semibold">{item.category}</div>
                    <div className="text-[var(--text-muted)] text-xs">{formatDate(item.date)}</div>
                  </div>
                  <div className="font-semibold text-[var(--danger)]">{formatInr(item.amountPaise)}</div>
                </div>
                <div className="mt-2 text-sm text-[var(--text-muted)]">{item.description}</div>
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:block mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-muted)]">
                <tr>
                  <th className="px-3 py-3 font-semibold muted">Date</th>
                  <th className="px-3 py-3 font-semibold muted">Category</th>
                  <th className="px-3 py-3 font-semibold muted">Description</th>
                  <th className="px-3 py-3 text-right font-semibold muted">Amount</th>
                  <th className="px-3 py-3 text-right font-semibold muted">Actions</th>
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
                ) : filteredItems.length === 0 ? (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={5} className="px-3 py-7 text-center muted">
                      No expenses found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-3">{formatDate(item.date)}</td>
                      <td className="px-3 py-3">{item.category}</td>
                      <td className="px-3 py-3 muted">{item.description}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatInr(item.amountPaise)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => startEdit(item)} className="btn-secondary h-8 px-3 text-xs">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpense(item.id)}
                            disabled={isActionLoading}
                            className="h-8 rounded-md border border-[var(--danger)] px-3 text-xs font-semibold text-[var(--danger)] disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
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
