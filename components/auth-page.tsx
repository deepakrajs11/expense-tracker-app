"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AppNavbar from "@/components/app-navbar";
import LoadingPanel from "@/components/loading-panel";
import { useTheme } from "@/lib/useTheme";

type AuthMode = "login" | "register";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

type AuthPageProps = {
  mode: AuthMode;
};

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

export default function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [isChecking, setIsChecking] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await readJson<{ user: SessionUser | null }>(response);
      if (response.ok && data.user) {
        router.replace("/dashboard");
        return;
      }
    } finally {
      setIsChecking(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body: Record<string, string> = {
        email,
        password,
      };
      if (isRegister) body.name = name;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await readJson<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.replace("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <main className="app-shell grid min-h-screen place-items-center px-4">
        <LoadingPanel
          title="Loading auth"
          subtitle="Checking if you are already signed in..."
        />
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="app-canvas">
        <AppNavbar theme={theme} onToggleTheme={toggleTheme} isAuthenticated={false} />

        <section className="workspace-frame grid overflow-hidden lg:grid-cols-[1.08fr_0.92fr]">
          <div className="workspace-sidebar p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] muted">FinTrack Platform</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight lg:text-4xl">
              Reliable personal expense tracking.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] muted">
              Built for real-world behavior: retries, refreshes, network delays, and secure authentication.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] muted">Accuracy</p>
                <p className="mt-1 text-sm">Exact decimal money type</p>
              </div>
              <div className="panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] muted">Reliability</p>
                <p className="mt-1 text-sm">Idempotent expense create</p>
              </div>
              <div className="panel p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] muted">Security</p>
                <p className="mt-1 text-sm">JWT + hashed passwords</p>
              </div>
            </div>
          </div>

          <div className="workspace-content border-t border-[var(--border)] p-6 sm:p-7 lg:border-l lg:border-t-0">
            <div className="mb-5 flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
              <Link
                href="/login"
                className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
                  !isRegister ? "bg-[var(--surface)]" : "muted"
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
                  isRegister ? "bg-[var(--surface)]" : "muted"
                }`}
              >
                Register
              </Link>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              {isRegister ? (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Full Name
                  <input
                    className="input-control"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Deepakraj S"
                    required
                  />
                </label>
              ) : null}

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

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Password
                <input
                  className="input-control"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  pattern={isRegister ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}" : undefined}
                  title={
                    isRegister
                      ? "At least 8 characters with uppercase, lowercase, number, and symbol."
                      : undefined
                  }
                  required
                />
                {isRegister ? (
                  <span className="text-xs muted">
                    Must include uppercase, lowercase, number, and symbol.
                  </span>
                ) : null}
              </label>

              <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-70">
                {isSubmitting ? "Please wait..." : isRegister ? "Create Account" : "Login"}
              </button>
            </form>

            {!isRegister ? (
              <p className="mt-3 text-sm muted">
                Forgot password?{" "}
                <Link href="/forget-password" className="font-semibold text-[var(--text)] underline">
                  Reset it
                </Link>
              </p>
            ) : null}

            {error ? <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
