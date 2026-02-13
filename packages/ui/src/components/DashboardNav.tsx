"use client";

import { useEffect, useState } from "react";
import {
  BsBell,
  BsCashStack,
  BsCreditCard,
  BsFileText,
  BsGear,
  BsGraphUp,
  BsPeople,
  BsPercent,
} from "react-icons/bs";

const navItems = [
  { href: "/", label: "Dashboard", icon: BsGraphUp },
  { href: "/sellers", label: "Sellers", icon: BsPeople },
  { href: "/payments", label: "Payments", icon: BsCreditCard },
  { href: "/fees", label: "Fees", icon: BsPercent },
  { href: "/payouts", label: "Payouts", icon: BsCashStack },
  { href: "/tax", label: "Tax", icon: BsFileText },
  { href: "/settings", label: "Settings", icon: BsGear },
];

export interface DashboardNavProps {
  className?: string;
  brandLabel?: string;
  showNotifications?: boolean;
}

export function DashboardNav({
  className,
  brandLabel = "Orquesta",
  showNotifications = true,
}: DashboardNavProps = {}) {
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncPath = () => setPathname(window.location.pathname);
    syncPath();

    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  const wrapperClass = [
    "sticky top-0 z-40 border-b border-cyan-400/20 bg-[#050b18]/86 backdrop-blur-xl",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <nav className={wrapperClass}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a
            href="/"
            className="group flex items-center gap-3 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/35 bg-gradient-to-br from-cyan-200 to-sky-400 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition group-hover:brightness-105">
              O
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">{brandLabel}</span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
                    isActive
                      ? "border-cyan-300/45 bg-cyan-400/14 text-cyan-100 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                      : "border-transparent text-slate-400 hover:border-slate-600/80 hover:bg-slate-900/65 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {showNotifications ? (
              <button
                type="button"
                className="relative rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:bg-slate-900/70 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                aria-label="Notifications"
              >
                <BsBell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
              </button>
            ) : null}
            <div className="h-8 w-8 rounded-full border border-cyan-400/30 bg-gradient-to-br from-slate-700 to-slate-900" />
          </div>
        </div>
      </div>

      <div className="border-t border-cyan-400/12 md:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <a
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-cyan-300/45 bg-cyan-400/14 text-cyan-100"
                    : "border-slate-700/70 bg-slate-900/60 text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
