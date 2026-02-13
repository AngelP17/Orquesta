"use client";

import { useLocale } from '@/components/LocaleProvider';

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-white p-1">
      <button
        className={`rounded px-2 py-1 text-xs font-semibold ${locale === 'es' ? 'bg-sky-600 text-white' : 'text-gray-600'}`}
        onClick={() => setLocale('es')}
        type="button"
      >
        ES
      </button>
      <button
        className={`rounded px-2 py-1 text-xs font-semibold ${locale === 'en' ? 'bg-sky-600 text-white' : 'text-gray-600'}`}
        onClick={() => setLocale('en')}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
