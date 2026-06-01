"use client";

import { FormEvent, useEffect, useState } from "react";
import { useDashboardShell } from "@/components/dashboard-shell";
import { useCategoryOptions } from "@/lib/useCategoryOptions";

type PendingSubmission = {
  key: string;
  payload: {
    amount: string;
    category: string;
    description: string;
    place: string;
    date: string;
  };
};

const createIdempotencyKey = (): string => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function AddExpensePage() {
  const { session } = useDashboardShell();
  const pendingStorageKey = `expense-tracker:pending-submission:${session.id}`;
  const { categories, addCategory } = useCategoryOptions();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [places, setPlaces] = useState<string[]>([]);
  const [date, setDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitExpense = async (payload: PendingSubmission["payload"], key: string) => {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Failed to save expense.");
  };

  useEffect(() => {
    const raw = localStorage.getItem(pendingStorageKey);
    if (!raw) return;

    const restore = async () => {
      try {
        const pending = JSON.parse(raw) as PendingSubmission;
        setIsSubmitting(true);
        await submitExpense(pending.payload, pending.key);
        localStorage.removeItem(pendingStorageKey);
        setSuccess("Recovered and submitted a pending expense.");
      } catch {
        setSuccess("A pending expense is saved locally and can be retried safely.");
      } finally {
        setIsSubmitting(false);
      }
    };

    restore();
  }, [pendingStorageKey]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch("/api/incomes?sort=date_desc", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { incomes: Array<{ place: string }> };
          const uniquePlaces = Array.from(new Set(data.incomes.map((i) => i.place)));
          setPlaces(uniquePlaces);
        }
      } catch {
        // Silently fail, places won't be available
      }
    };

    fetchPlaces();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const chosenCategory = category === "__custom__" ? customCategory.trim() : category.trim();
    if (!chosenCategory) {
      setError("Please select or enter a category.");
      setIsSubmitting(false);
      return;
    }

    if (!place.trim()) {
      setError("Please select a place/source.");
      setIsSubmitting(false);
      return;
    }

    if (category === "__custom__") {
      addCategory(chosenCategory);
    }

    const payload = { amount, category: chosenCategory, description, place, date };
    const pending: PendingSubmission = {
      key: createIdempotencyKey(),
      payload,
    };

    localStorage.setItem(pendingStorageKey, JSON.stringify(pending));

    try {
      await submitExpense(payload, pending.key);
      localStorage.removeItem(pendingStorageKey);
      setAmount("");
      setCategory("");
      setCustomCategory("");
      setDescription("");
      setPlace("");
      setDate("");
      setSuccess("Expense saved successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Add Expense</h2>
        <p className="mt-1 text-sm muted">
          Fill the form below. Duplicate retries are handled safely with idempotency.
        </p>
      </header>

      <section className="panel max-w-3xl p-5">
        <div className="mb-4">
          <p className="text-sm font-medium">Quick Categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.slice(0, 10).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  category === item
                    ? "border-[var(--primary)] bg-[var(--surface-muted)] font-semibold"
                    : "border-[var(--border)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Amount (INR)
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="input-control"
              placeholder="e.g. 249.99"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Category
            <select
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="input-control"
            >
              <option value="">Select category</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="__custom__">+ Add custom category</option>
            </select>
          </label>

          {category === "__custom__" ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Custom Category
                <input
                  type="text"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  className="input-control"
                  placeholder="e.g. Subscriptions"
                  maxLength={60}
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const added = addCategory(customCategory);
                  if (added) {
                    setCategory(added);
                    setCustomCategory("");
                  }
                }}
                className="btn-secondary px-4 text-sm"
              >
                Add & Use
              </button>
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Description
            <input
              type="text"
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="input-control"
              placeholder="e.g. Weekly vegetables"
              maxLength={250}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Source / Place
            <select
              required
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              className="input-control"
            >
              <option value="">Select place/source</option>
              {places.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Expense Date
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input-control"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-70">
            {isSubmitting ? "Saving..." : "Save Expense"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-medium text-[var(--primary)]">{success}</p> : null}
      </section>
    </div>
  );
}
