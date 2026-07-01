"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";
import { OrgSwitcher } from "./OrgSwitcher";
import { can, type Role } from "@/lib/rbac";

interface Props {
  user: { id: string; name: string; email: string };
  org: { id: string; name: string; slug: string };
  role: Role;
  orgs: { id: string; name: string; role: string }[];
  children: React.ReactNode;
}

export function AppShell({ user, org, role, orgs, children }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const nav: { href: string; label: string; show: boolean }[] = [
    { href: "/dashboard", label: t.nav.dashboard, show: true },
    { href: "/projects", label: t.nav.projects, show: true },
    { href: "/members", label: t.nav.members, show: can(role, "members:manage") },
    { href: "/audit", label: t.nav.audit, show: can(role, "members:manage") },
    { href: "/settings", label: t.nav.settings, show: can(role, "org:manage") },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const sidebar = (
    <>
      <div className="p-3 pb-0">
        <OrgSwitcher current={{ id: org.id, name: org.name, role }} orgs={orgs} />
      </div>
      <nav className="flex flex-col gap-1 p-3">
      {nav
        .filter((n) => n.show)
        .map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-brand-50 text-brand-700" : "hover:bg-[var(--color-bg)]"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (desktop) */}
      <aside
        className="hidden md:flex md:flex-col w-60 shrink-0 border-e bg-[var(--color-surface)]"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <Logo size={24} />
        </div>
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside
            className="absolute top-0 bottom-0 start-0 w-64 bg-[var(--color-surface)] shadow-xl"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <Logo size={24} />
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 border-b bg-[var(--color-surface)]"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost md:hidden px-2 py-1.5" onClick={() => setOpen(true)} aria-label="Menu">
              <span className="text-lg">☰</span>
            </button>
            <span className="font-bold md:hidden">
              <Logo size={20} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserMenu((m) => !m)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--color-bg)]"
              >
                <span
                  className="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--color-brand-600)" }}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:block text-sm font-semibold">{user.name}</span>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  ▾
                </span>
              </button>
              {userMenu && (
                <div
                  className="absolute end-0 z-40 mt-1 w-48 rounded-lg border bg-[var(--color-surface)] shadow-lg py-1"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: "var(--color-border)" }}>
                    <div className="text-sm font-semibold truncate">{user.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
                      {user.email}
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setUserMenu(false)}
                    className="block px-3 py-2 text-sm hover:bg-[var(--color-bg)]"
                  >
                    {t.nav.settings}
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-start px-3 py-2 text-sm text-red-600 hover:bg-[var(--color-bg)]"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
