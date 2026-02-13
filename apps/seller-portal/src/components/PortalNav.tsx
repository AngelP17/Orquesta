"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { messages } from '@/lib/i18n';

const links = [
  { href: '/', key: 'overview' as const },
  { href: '/transactions', key: 'transactions' as const },
  { href: '/payouts', key: 'payouts' as const },
  { href: '/settings', key: 'settings' as const }
];

export function PortalNav() {
  const pathname = usePathname();
  const { locale } = useLocale();

  return (
    <nav className="border-b border-sky-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <p className="font-semibold tracking-tight text-slate-900">{messages[locale].appTitle}</p>
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {messages[locale][link.key]}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
