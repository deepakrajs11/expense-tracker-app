"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

const buildTrendPoints = (items: Expense[]) => {
  const grouped = new Map<string, number>();
  items.forEach((item) => {
    grouped.set(item.date, (grouped.get(item.date) ?? 0) + item.amountPaise);
  });

  const entries = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-16);

  if (!entries.length)
    return {
      path: "",
      points: [],
      labels: [] as string[],
      yTicks: [] as { value: number; y: number }[],
      width: 760,
      height: 210,
      padX: 84,
      padY: 20,
    };

  const values = entries.map(([, value]) => value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const width = 760;
  const height = 210;
  const padX = 84;
  const padY = 20;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  const points = entries.map(([date, value], index) => {
    const x =
      entries.length === 1 ? padX + innerWidth / 2 : padX + (index / (entries.length - 1)) * innerWidth;
    const y = padY + (1 - (value - min) / range) * innerHeight;
    return {
      x,
      y,
      value,
      date,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const labels = [
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(
      new Date(`${entries[0][0]}T00:00:00`),
    ),
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(
      new Date(`${entries[entries.length - 1][0]}T00:00:00`),
    ),
  ];

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = min + (1 - ratio) * range;
    const y = padY + ratio * innerHeight;
    return { value, y };
  });

  return { path, points, labels, yTicks, width, height, padX, padY };
};

export default function DashboardOverviewPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/expenses?sort=date_desc", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load dashboard summary.");
        const data = await readJson<{ expenses: Expense[] }>(response);
        setItems(data.expenses);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard summary.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.amountPaise, 0), [items]);
  const recent = useMemo(() => items.slice(0, 5), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).length, [items]);
  const trend = useMemo(() => buildTrendPoints(items), [items]);

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="mt-1 text-sm muted">
          Quick summary of your current expenses. Use navigation for add and full list pages.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] muted">Total Spend</p>
          {isLoading ? (
            <div className="skeleton mt-2 h-7 w-28" />
          ) : (
            <p className="mt-2 text-xl font-semibold">{formatInr(total)}</p>
          )}
        </div>
        <div className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] muted">Expenses</p>
          {isLoading ? (
            <div className="skeleton mt-2 h-7 w-16" />
          ) : (
            <p className="mt-2 text-xl font-semibold">{items.length}</p>
          )}
        </div>
        <div className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] muted">Categories</p>
          {isLoading ? (
            <div className="skeleton mt-2 h-7 w-16" />
          ) : (
            <p className="mt-2 text-xl font-semibold">{categories}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="panel p-5">
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-lg font-semibold">2-Month Spending Trend</h3>
            <Link href="/dashboard/trends" className="text-sm font-semibold underline">
              More options
            </Link>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            {isLoading ? (
              <div className="grid h-[210px] gap-3 p-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-full w-full" />
              </div>
            ) : trend.points.length < 2 ? (
              <div className="grid h-[210px] place-items-center text-sm muted">
                Add more expenses to view spending trend.
              </div>
            ) : (
              <div>
                <svg viewBox={`0 0 ${trend.width} ${trend.height}`} className="h-[210px] w-full">
                  {trend.yTicks.map((tick) => (
                    <g key={`tick-${tick.y}`}>
                      <line
                        x1={trend.padX}
                        y1={tick.y}
                        x2={trend.width - trend.padX}
                        y2={tick.y}
                        stroke="var(--border)"
                        strokeDasharray="3 4"
                        opacity={0.6}
                      />
                  <text
                    x={trend.padX - 8}
                    y={tick.y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="var(--text-muted)"
                      >
                        {formatAxisInr(Math.round(tick.value))}
                      </text>
                    </g>
                  ))}
                  <line
                    x1={trend.padX}
                    y1={trend.height - trend.padY}
                    x2={trend.width - trend.padX}
                    y2={trend.height - trend.padY}
                    stroke="var(--border)"
                  />
                  <line
                    x1={trend.padX}
                    y1={trend.padY}
                    x2={trend.padX}
                    y2={trend.height - trend.padY}
                    stroke="var(--border)"
                  />
                  <path d={trend.path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                  {trend.points.map((point) => (
                    <circle
                      key={`${point.date}-${point.x}`}
                      cx={point.x}
                      cy={point.y}
                      r={3.3}
                      fill="var(--primary)"
                    />
                  ))}
                  <text
                    x={trend.width / 2}
                    y={trend.height - 2}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-muted)"
                  >
                    Date
                  </text>
                  <text
                    x="16"
                    y={trend.height / 2}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-muted)"
                    transform={`rotate(-90 16 ${trend.height / 2})`}
                  >
                    Spend (INR)
                  </text>
                </svg>
                <div className="mt-1 flex items-center justify-between px-2 text-xs muted">
                  <span>{trend.labels[0]}</span>
                  <span>{trend.labels[1]}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse text-left text-sm">
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
                  [...Array.from({ length: 4 })].map((_, index) => (
                    <tr key={`overview-loading-${index}`} className="border-t border-[var(--border)]">
                      <td colSpan={4} className="px-3 py-3">
                        <div className="skeleton h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : recent.length === 0 ? (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={4} className="px-3 py-6 muted">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  recent.map((item) => (
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
        </section>

        <aside className="panel p-5">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <div className="mt-4 grid gap-2">
            <Link href="/dashboard/add" className="btn-primary inline-flex items-center justify-center">
              Add Expense
            </Link>
            <Link
              href="/dashboard/expenses"
              className="btn-secondary inline-flex items-center justify-center text-sm"
            >
              Go to Expense List
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
