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
    "sticky top-0 z-40 border-b border-[#4b2d20]/15 bg-[#f8f1e8]/82 backdrop-blur-xl",
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
            className="group flex items-center gap-3 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f240e]/45"
          >
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-[#7f240e]/28 bg-[#fff8ef] shadow-lg shadow-[#5f2f1d]/20 transition group-hover:brightness-105">
              <img src="/logo.png" alt="Orquesta logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-base font-semibold tracking-tight text-stone-900 sm:text-lg">{brandLabel}</span>
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
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f240e]/45 ${
                    isActive
                      ? "border-[#2a160f]/85 bg-[#2a160f] text-[#fff7ea] shadow-[0_10px_24px_rgba(45,22,12,0.24)]"
                      : "border-transparent text-stone-600 hover:border-[#7f240e]/25 hover:bg-white/70 hover:text-stone-900"
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
                className="relative rounded-lg border border-transparent p-2 text-stone-600 transition hover:border-[#7f240e]/25 hover:bg-white/70 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f240e]/45"
                aria-label="Notifications"
              >
                <BsBell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
              </button>
            ) : null}
            <div className="h-8 w-8 rounded-full border border-[#7f240e]/30 bg-gradient-to-br from-[#dfb48b] to-[#8f3a1a]" />
          </div>
        </div>
      </div>

      <div className="border-t border-[#4b2d20]/10 md:hidden">
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
                    ? "border-[#2a160f]/85 bg-[#2a160f] text-[#fff7ea]"
                    : "border-[#7f240e]/20 bg-white/70 text-stone-700"
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
