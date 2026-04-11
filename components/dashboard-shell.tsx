"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AppNavbar from "@/components/app-navbar";
import LoadingPanel from "@/components/loading-panel";
import { useTheme } from "@/lib/useTheme";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};

type DashboardShellContextValue = {
  session: SessionUser;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

const readJson = async <T,>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

const NavItem = ({ href, label, active }: { href: string; label: string; active: boolean }) => {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm ${
        active ? "bg-[var(--surface)] font-semibold" : "muted"
      }`}
    >
      {label}
    </Link>
  );
};

export function useDashboardShell() {
  const value = useContext(DashboardShellContext);
  if (!value) {
    throw new Error("useDashboardShell must be used inside DashboardShell.");
  }
  return value;
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const [session, setSession] = useState<SessionUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchSession = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await readJson<{ user: SessionUser | null }>(response);
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

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const contextValue = useMemo(() => {
    if (!session) return null;
    return { session };
  }, [session]);

  if (isChecking || !session || !contextValue) {
    return (
      <main className="app-shell grid min-h-screen place-items-center px-4">
        <LoadingPanel
          title="Loading workspace"
          subtitle="Checking session and preparing your dashboard..."
        />
      </main>
    );
  }

  return (
    <DashboardShellContext.Provider value={contextValue}>
      <main className="app-shell min-h-screen">
        <div className="app-canvas">
          <AppNavbar
            theme={theme}
            onToggleTheme={toggleTheme}
            isAuthenticated={true}
            onLogout={handleLogout}
            onLogoClick={() => setSidebarOpen((prev) => !prev)}
          />

          <div className="workspace-frame">
            <div className="workspace-body">
              {sidebarOpen ? (
                <aside className="workspace-sidebar h-full w-full p-4 lg:w-[250px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] muted">Workspace</p>
                  <h1 className="mt-2 text-lg font-semibold">{session.name}</h1>
                  <p className="text-sm muted">{session.email}</p>

                  <nav className="mt-5 grid gap-2">
                    <NavItem href="/dashboard" label="Overview" active={pathname === "/dashboard"} />
                    <NavItem href="/dashboard/add" label="Add Expense" active={pathname === "/dashboard/add"} />
                    <NavItem
                      href="/dashboard/expenses"
                      label="Expense List"
                      active={pathname === "/dashboard/expenses"}
                    />
                    <NavItem href="/dashboard/trends" label="Trends" active={pathname === "/dashboard/trends"} />
                  </nav>
                </aside>
              ) : null}

              <section className="workspace-content min-w-0 p-4 sm:p-5">
                <div className={sidebarOpen ? "" : "mx-auto w-full max-w-[1100px]"}>{children}</div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </DashboardShellContext.Provider>
  );
}
