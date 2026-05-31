"use client";

import { FormEvent, useEffect, useState } from "react";
import { useDashboardShell } from "@/components/dashboard-shell";
import { useCategoryOptions } from "@/lib/useCategoryOptions";

type PendingSubmission = {
  key: string;
  payload: {
    amount: string;
    place: string;
    source: string;
    date: string;
  };
};

const createIdempotencyKey = (): string => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function AddIncomePage() {
  const { session } = useDashboardShell();
  const pendingStorageKey = `expense-tracker:pending-income:${session.id}`;
  const { addCategory: addPlace } = useCategoryOptions();

  const USER_PLACES_KEY = "expense-tracker:category-options";
  const [userPlaces, setUserPlaces] = useState<string[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(USER_PLACES_KEY) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  });

  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [customPlace, setCustomPlace] = useState("");
  const [source, setSource] = useState("");
  const [date, setDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitIncome = async (payload: PendingSubmission["payload"], key: string) => {
    const response = await fetch("/api/incomes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Failed to save income.");
  };

  useEffect(() => {
    const raw = localStorage.getItem(pendingStorageKey);
    if (!raw) return;

    const restore = async () => {
      try {
        const pending = JSON.parse(raw) as PendingSubmission;
        setIsSubmitting(true);
        await submitIncome(pending.payload, pending.key);
        localStorage.removeItem(pendingStorageKey);
        setSuccess("Recovered and submitted a pending income.");
      } catch {
        setSuccess("A pending income is saved locally and can be retried safely.");
      } finally {
        setIsSubmitting(false);
      }
    };

    restore();
  }, [pendingStorageKey]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const chosenPlace = place === "__custom__" ? customPlace.trim() : place.trim();
    if (!chosenPlace) {
      setError("Please select or enter a place.");
      setIsSubmitting(false);
      return;
    }

    if (place === "__custom__") {
      addPlace(chosenPlace);
      setUserPlaces((prev) => {
        if (prev.includes(chosenPlace)) return prev;
        return [...prev, chosenPlace];
      });
    }
    const payload = { amount, place: chosenPlace, source, date };
    const pending: PendingSubmission = {
      key: createIdempotencyKey(),
      payload,
    };

    localStorage.setItem(pendingStorageKey, JSON.stringify(pending));

    try {
      await submitIncome(payload, pending.key);
      localStorage.removeItem(pendingStorageKey);
      setAmount("");
      setPlace("");
      setCustomPlace("");
      setSource("");
      setDate("");
      setSuccess("Income saved successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save income.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <header className="panel px-5 py-4 sm:px-6">
        <h2 className="text-2xl font-semibold">Add Income</h2>
        <p className="mt-1 text-sm muted">Record incoming amounts. Idempotency prevents duplicates.</p>
      </header>

      <section className="panel max-w-3xl p-5">

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
              placeholder="e.g. 5000.00"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Place
            <select
              required
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              className="input-control"
            >
              <option value="">Select place</option>
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
              {userPlaces
                .filter((p) => p !== "Bank" && p !== "Cash")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              <option value="__custom__">+ Add custom place</option>
            </select>
          </label>

          {place === "__custom__" ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Custom Place
                <input
                  type="text"
                  value={customPlace}
                  onChange={(event) => setCustomPlace(event.target.value)}
                  className="input-control"
                  placeholder="e.g. Company XYZ"
                  maxLength={60}
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const added = addPlace(customPlace);
                  if (added) {
                    setPlace(added);
                    setCustomPlace("");
                    setUserPlaces((prev) => {
                      if (prev.includes(added)) return prev;
                      return [...prev, added];
                    });
                  }
                }}
                className="btn-secondary px-4 text-sm"
              >
                Add & Use
              </button>
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Source
            <input
              type="text"
              required
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="input-control"
              placeholder="e.g. June salary"
              maxLength={250}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Income Date
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input-control"
            />
          </label>

          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-70">
            {isSubmitting ? "Saving..." : "Save Income"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-medium text-[var(--primary)]">{success}</p> : null}
      </section>
    </div>
  );
}
