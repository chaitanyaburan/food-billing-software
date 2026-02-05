"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ToastProvider } from "@/lib/client/toast";

type Role = "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN";

type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

function decodeJwtClaims(token: string): { role?: Role } {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json ?? {};
  } catch {
    return {};
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const claims = decodeJwtClaims(token);
    setRole((claims.role as Role) ?? null);
  }, [router]);

  const nav = useMemo<NavItem[]>(
    () => [
      { href: "/app", label: "Dashboard", roles: ["OWNER", "MANAGER", "CASHIER", "KITCHEN"] },
      { href: "/app/pos", label: "POS", roles: ["OWNER", "MANAGER", "CASHIER"] },
      { href: "/app/kds", label: "KDS", roles: ["OWNER", "MANAGER", "KITCHEN", "CASHIER"] },
      { href: "/app/menu", label: "Menu", roles: ["OWNER", "MANAGER"] },
      { href: "/app/tables", label: "Tables", roles: ["OWNER", "MANAGER"] },
      { href: "/app/reports", label: "Reports", roles: ["OWNER", "MANAGER"] },
      { href: "/app/settings", label: "Settings", roles: ["OWNER", "MANAGER"] }
    ],
    []
  );

  const visibleNav = useMemo(() => {
    if (!role) return nav;
    return nav.filter((n) => n.roles.includes(role));
  }, [nav, role]);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/auth/login");
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="px-4 py-4">
            <div className="text-sm font-semibold">Restaurant POS</div>
            <div className="mt-1 text-xs text-slate-600">{role ? `Role: ${role}` : ""}</div>
          </div>

          <nav className="px-2 pb-4">
            {visibleNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-1 block rounded px-3 py-2 text-sm ${
                    active ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pb-4">
            <button className="w-full rounded border border-slate-300 px-3 py-2 text-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-sm font-semibold">&nbsp;</div>
              <div className="flex items-center gap-2">
                {role ? <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{role}</span> : null}
                <button className="rounded border border-slate-300 px-3 py-2 text-sm md:hidden" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
        </div>
      </div>
    </ToastProvider>
  );
}
