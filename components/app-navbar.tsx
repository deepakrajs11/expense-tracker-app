"use client";

import Link from "next/link";

type AppNavbarProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  onLogout?: () => void;
};

export default function AppNavbar({
  theme,
  onToggleTheme,
  isAuthenticated,
  onLogout,
}: AppNavbarProps) {
  return (
    <header className="panel sticky top-0 z-40 mb-4 px-4 py-3 sm:px-5">
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between">
        <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
            ₹
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">FinTrack</p>
            <p className="text-xs muted leading-tight">Personal Finance Tracker</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`theme-switch ${theme === "dark" ? "is-dark" : ""}`}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="theme-icon sun" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
              </svg>
            </span>
            <span className="theme-icon moon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
              </svg>
            </span>
            <span className="theme-knob" />
          </button>

          {isAuthenticated ? (
            <button type="button" onClick={onLogout} className="btn-secondary px-4 text-sm">
              Logout
            </button>
          ) : (
            <Link href="/login" className="btn-secondary inline-flex items-center px-4 text-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

