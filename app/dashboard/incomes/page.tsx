"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCategoryOptions } from "@/lib/useCategoryOptions";

type Income = {
  id: string;
  amountPaise: number;
  place?: string;
  source?: string;
  category?: string;
  description?: string;
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

export default function IncomeListPage() {
  const [items, setItems] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [searchText, setSearchText] = useState("");

  const fetchIncomes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/incomes?sort=date_desc", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch incomes.");

      const data = await readJson<{ incomes: Income[] }>(response);
      setItems(data.incomes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch incomes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const { categories: places } = useCategoryOptions(items.map((item) => item.place ?? item.category ?? ""));

  const filteredItems = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    const base = items.filter((item) => {
      const place = item.place ?? item.category ?? "";
      const source = item.source ?? item.description ?? "";
      if (categoryFilter && place !== categoryFilter) return false;
      if (search) {
        const haystack = `${place} ${source}`.toLowerCase();
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
  }, [categoryFilter, items, searchText, sort]);

  const total = useMemo(() => filteredItems.reduce((sum, item) => sum + item.amountPaise, 0), [filteredItems]);

  const exportVisibleAsCsv = () => {
    if (!filteredItems.length) {
      setError("No visible incomes to export.");
      return;
    }

    const escapeCsv = (value: string): string => {
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const header = ["Date", "Place", "Source", "Amount_INR"];
    const rows = filteredItems.map((item) => [item.date, item.place ?? item.category ?? "", item.source ?? item.description ?? "", (item.amountPaise / 100).toFixed(2)]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fintrack-incomes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Income List</h2>
        <p className="mt-1 text-sm muted">Browse and filter recorded incomes (place + source).</p>
      </header>

      <section className="panel p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Search
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="input-control"
              placeholder="Search place or source"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Filter by Place
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input-control"
            >
              <option value="">All places</option>
              {places.map((option) => (
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

        <div className="mt-3 grid gap-3 sm:grid-cols-2 items-center">
          <div className="panel-muted px-4 py-2 text-sm">
            <p>
              Total: <span className="font-semibold">{formatInr(total)}</span>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={exportVisibleAsCsv} className="btn-secondary w-full text-sm">
              Export CSV
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

        <div className="sm:hidden mt-4 p-2 space-y-3">
          {isLoading ? (
            [...Array.from({ length: 4 })].map((_, index) => (
              <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <div className="skeleton h-4 w-32 mb-3" />
                <div className="skeleton h-3 w-24 mb-2" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center muted">
              No incomes found for the selected filters.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{formatDate(item.date)}</span>
                  <span>{formatInr(item.amountPaise)}</span>
                </div>
                <div className="mt-2 text-sm text-[var(--text-muted)]">
                  <div>{item.place || item.category}</div>
                  <div>{item.source || item.description}</div>
                </div>
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
                  <th className="px-3 py-3 font-semibold muted">Place</th>
                  <th className="px-3 py-3 font-semibold muted">Source</th>
                  <th className="px-3 py-3 text-right font-semibold muted">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array.from({ length: 6 })].map((_, index) => (
                    <tr key={`loading-${index}`} className="border-t border-[var(--border)]">
                      <td colSpan={4} className="px-3 py-3">
                        <div className="skeleton h-3 w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={4} className="px-3 py-7 text-center muted">
                      No incomes found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-3">{formatDate(item.date)}</td>
                      <td className="px-3 py-3">{item.place || item.category}</td>
                      <td className="px-3 py-3 muted">{item.source || item.description}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatInr(item.amountPaise)}</td>
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
