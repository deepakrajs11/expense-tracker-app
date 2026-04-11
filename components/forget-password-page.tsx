"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppNavbar from "@/components/app-navbar";
import { useTheme } from "@/lib/useTheme";

type ForgetPasswordPageProps = {
  token: string;
};

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

export default function ForgetPasswordPage({ token }: ForgetPasswordPageProps) {
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await readJson<{ valid: boolean }>(response);
        setIsTokenValid(Boolean(data.valid));
      } catch {
        setIsTokenValid(false);
      }
    };

    validateToken();
  }, [token]);

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await readJson<{ message?: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Failed to request reset.");

      setMessage(data.message || "If your email exists, a reset link has been sent.");
      setEmail("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to request reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await readJson<{ message?: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Failed to reset password.");

      setMessage(data.message || "Password updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isResetMode = Boolean(token);

  return (
    <main className="app-shell min-h-screen px-3 py-3 sm:px-4">
      <AppNavbar theme={theme} onToggleTheme={toggleTheme} isAuthenticated={false} />

      <div className="mx-auto mt-2 w-full max-w-xl px-1">
        <section className="panel p-6 sm:p-7">
          <h1 className="text-2xl font-semibold">{isResetMode ? "Set New Password" : "Forgot Password"}</h1>
          <p className="mt-2 text-sm muted">
            {isResetMode
              ? "Set a strong new password for your account."
              : "Enter your registered email to receive a password reset link."}
          </p>

          {!isResetMode ? (
            <form className="mt-5 grid gap-4" onSubmit={handleRequestReset}>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Email
                <input
                  className="input-control"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-70">
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : isTokenValid === false ? (
            <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm">
              This reset link is invalid or expired. Please request a new one.
            </div>
          ) : isTokenValid === null ? (
            <div className="mt-5 text-sm muted">Validating token...</div>
          ) : (
            <form className="mt-5 grid gap-4" onSubmit={handleSetPassword}>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                New Password
                <input
                  className="input-control"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 chars with upper/lower/number/symbol"
                  minLength={8}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}"
                  title="At least 8 characters with uppercase, lowercase, number, and symbol."
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Confirm Password
                <input
                  className="input-control"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-70">
                {isSubmitting ? "Updating..." : "Set Password"}
              </button>
            </form>
          )}

          {message ? <p className="mt-4 text-sm font-medium text-[var(--primary)]">{message}</p> : null}
          {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

          <p className="mt-5 text-sm muted">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-[var(--text)] underline">
              Back to login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

