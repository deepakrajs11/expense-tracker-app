"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCategoryOptions } from "@/lib/useCategoryOptions";

type Transaction = {
  id: string;
  amountPaise: number;
  type: "expense" | "income";
  category?: string;
  description?: string;
  place?: string;
  source?: string;
  date: string;
};

type ChartType = "line" | "bar";

const formatInr = (amountPaise: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amountPaise / 100);
};

const formatAxisInr = (amountPaise: number): string => {
  const value = amountPaise / 100;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
};

const formatDate = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(parsed);
};

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

const buildTrendSeries = (items: Transaction[], widthOverride?: number) => {
  const grouped = new Map<string, { income: number; expense: number }>();
  items.forEach((item) => {
    const dateKey = item.date;
    const current = grouped.get(dateKey) ?? { income: 0, expense: 0 };
    if (item.type === "income") {
      current.income += item.amountPaise;
    } else {
      current.expense += item.amountPaise;
    }
    grouped.set(dateKey, current);
  });

  const entries = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const width = widthOverride ?? 920;
  const height = 290;
  // padding scales with width so chart fits smaller screens better
  const padX = Math.min(98, Math.max(24, Math.round(width * 0.08)));
  const padY = 24;

  if (!entries.length) {
    return {
      points: [],
      incomePath: "",
      expensePath: "",
      width,
      height,
      padX,
      padY,
      yTicks: [] as { value: number; y: number }[],
      baselineY: padY,
    };
  }

  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  const points = entries.map(([date, values], index) => {
    const x =
      entries.length === 1 ? padX + innerWidth / 2 : padX + (index / (entries.length - 1)) * innerWidth;
    return {
      date,
      x,
      income: values.income,
      expense: values.expense,
      net: values.income - values.expense,
    };
  });

  const maxIncome = Math.max(0, ...points.map((point) => point.income));
  const maxExpense = Math.max(0, ...points.map((point) => point.expense));
  const max = maxIncome;
  const min = -maxExpense;
  const range = Math.max(max - min, 1);

  const pointsWithCoords = points.map((point) => {
    const incomeY = padY + (1 - (point.income - min) / range) * innerHeight;
    const expenseY = padY + (1 - (-point.expense - min) / range) * innerHeight;
    const netY = padY + (1 - (point.net - min) / range) * innerHeight;
    return { ...point, incomeY, expenseY, netY };
  });

  const incomePath = pointsWithCoords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.incomeY.toFixed(2)}`)
    .join(" ");
  const expensePath = pointsWithCoords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.expenseY.toFixed(2)}`)
    .join(" ");

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }).map((_, i) => {
    const ratio = i / ticks; // 0..1 from top to bottom
    const value = Math.round(max - ratio * (max - min));
    const y = padY + (1 - (value - min) / range) * innerHeight;
    return { value, y };
  });

  const baselineY = padY + (1 - (0 - min) / range) * innerHeight;

  return {
    points: pointsWithCoords,
    incomePath,
    expensePath,
    width,
    height,
    padX,
    padY,
    yTicks,
    baselineY,
  };
};

export default function TrendsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chartType, setChartType] = useState<ChartType>("line");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("date_desc");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [expResponse, incResponse] = await Promise.all([
        fetch("/api/expenses?sort=date_desc", { cache: "no-store" }),
        fetch("/api/incomes?sort=date_desc", { cache: "no-store" }),
      ]);

      if (!expResponse.ok || !incResponse.ok) {
        throw new Error("Failed to fetch transactions.");
      }

      const [expData, incData] = await Promise.all([
        readJson<{ expenses: Transaction[] }>(expResponse),
        readJson<{ incomes: Transaction[] }>(incResponse),
      ]);

      const expenseItems = expData.expenses.map((item) => ({ ...item, type: "expense" as const }));
      const incomeItems = incData.incomes.map((item) => ({ ...item, type: "income" as const }));
      setItems([...expenseItems, ...incomeItems].sort((a, b) => b.date.localeCompare(a.date)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch transactions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const { categories } = useCategoryOptions(
    items.map((item) => (item.type === "income" ? item.place : item.category) ?? ""),
  );

  const filteredItems = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    const minPaise = amountMin ? Math.round(Number.parseFloat(amountMin) * 100) : null;
    const maxPaise = amountMax ? Math.round(Number.parseFloat(amountMax) * 100) : null;

    const base = items.filter((item) => {
      const placeOrCategory = item.type === "income" ? item.place ?? "" : item.category ?? "";
      const sourceOrDescription = item.type === "income" ? item.source ?? "" : item.description ?? "";
      if (categoryFilter && placeOrCategory !== categoryFilter) return false;
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      if (Number.isFinite(minPaise) && minPaise !== null && item.amountPaise < minPaise) return false;
      if (Number.isFinite(maxPaise) && maxPaise !== null && item.amountPaise > maxPaise) return false;
      if (search) {
        const haystack = `${placeOrCategory} ${sourceOrDescription}`.toLowerCase();
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
    () => filteredItems.reduce((sum, item) => sum + (item.type === "income" ? item.amountPaise : -item.amountPaise), 0),
    [filteredItems],
  );
  // responsive container for the chart
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        setContainerWidth(w);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => buildTrendSeries(filteredItems, containerWidth ?? 920), [filteredItems, containerWidth]);

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Trends</h2>
        <p className="mt-1 text-sm muted">
          Analyze income and expense trends together with line or bar chart view.
        </p>
      </header>

      <section className="panel p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Chart Type
            <select
              value={chartType}
              onChange={(event) => setChartType(event.target.value as ChartType)}
              className="input-control"
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Search
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="input-control"
              placeholder="Category or description"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Place / Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input-control"
            >
              <option value="">All places / categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="input-control">
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
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="input-control" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Date To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="input-control" />
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
            />
          </label>

          <div className="panel-muted grid place-items-center px-4 py-2 text-sm sm:mt-6 xl:mt-0">
            <p className="mb-3">
              Net: <span className="font-semibold">{formatInr(total)}</span>
            </p>

            <div className="flex items-end w-full">
              <button
                type="button"
                className="btn-secondary w-full text-sm"
                onClick={() => {
                  setChartType("line");
                  setCategoryFilter("");
                  setSort("date_desc");
                  setSearchText("");
                  setDateFrom("");
                  setDateTo("");
                  setAmountMin("");
                  setAmountMax("");
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          {isLoading ? (
            <div className="grid h-[220px] sm:h-[290px] gap-3 p-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-full w-full" />
            </div>
          ) : series.points.length === 0 ? (
            <div className="grid h-[220px] sm:h-[290px] place-items-center text-sm muted">
              Add more transactions to view cash flow trend.
            </div>
          ) : (
            <div>
              <div ref={containerRef} className="w-full">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" /> Income
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" /> Expense
                  </span>
                </div>
                <svg viewBox={`0 0 ${series.width} ${series.height}`} className="h-[220px] sm:h-[290px] w-full">
                  {series.yTicks.map((tick, idx) => (
                    <g key={`tick-${idx}`}>
                      <line
                        x1={series.padX}
                        y1={tick.y}
                        x2={series.width - series.padX}
                        y2={tick.y}
                        stroke="var(--border)"
                        strokeDasharray="3 4"
                        opacity={0.6}
                      />
                      <text
                        x={series.padX - 8}
                        y={tick.y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="var(--text-muted)"
                      >
                        {formatAxisInr(tick.value)}
                      </text>
                    </g>
                  ))}
                  <line
                    x1={series.padX}
                    y1={series.baselineY}
                    x2={series.width - series.padX}
                    y2={series.baselineY}
                    stroke="var(--border)"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={series.padX}
                    y1={series.padY}
                    x2={series.padX}
                    y2={series.height - series.padY}
                    stroke="var(--border)"
                  />
                  {chartType === "line" ? (
                    <>
                      <path
                        d={series.incomePath}
                        fill="none"
                        stroke="var(--success)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d={series.expensePath}
                        fill="none"
                        stroke="var(--danger)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {series.points.map((point) => (
                        <g key={`${point.date}-${point.x}`}>
                          <circle cx={point.x} cy={point.incomeY} r={3} fill="var(--success)" />
                          <circle cx={point.x} cy={point.expenseY} r={3} fill="var(--danger)" />
                        </g>
                      ))}
                    </>
                  ) : (
                    <>
                      {series.points.map((point) => {
                        const available = Math.max(1, series.points.length);
                        const barSlot = (series.width - series.padX * 2) / available;
                        const barWidth = Math.max(6, barSlot * 0.36);
                        return (
                          <g key={`${point.date}-${point.x}`}>
                            <rect
                              x={point.x - barSlot / 2 - barWidth / 2}
                              y={point.incomeY}
                              width={barWidth}
                              height={series.baselineY - point.incomeY}
                              rx={2}
                              fill="var(--success)"
                              opacity={0.9}
                            />
                            <rect
                              x={point.x + barSlot / 2 - barWidth / 2}
                              y={series.baselineY}
                              width={barWidth}
                              height={point.expenseY - series.baselineY}
                              rx={2}
                              fill="var(--danger)"
                              opacity={0.9}
                            />
                          </g>
                        );
                      })}
                    </>
                  )}
                  <text
                    x={series.width / 2}
                    y={series.height - 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-muted)"
                  >
                    Date
                  </text>
                  <text
                    x="20"
                    y={series.height / 2}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-muted)"
                    transform={`rotate(-90 20 ${series.height / 2})`}
                  >
                    Cash Flow (INR)
                  </text>
                </svg>
              </div>
              <div className="mt-1 flex items-center justify-between px-2 text-xs muted">
                <span>{series.points[0] ? formatDate(series.points[0].date) : "-"}</span>
                <span>{series.points.at(-1) ? formatDate(series.points.at(-1)!.date) : "-"}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
