"use client";

import { LocaleToggle } from '@/components/LocaleToggle';
import { PortalNav } from '@/components/PortalNav';
import { useLocale } from '@/components/LocaleProvider';

export default function PortalSettingsPage() {
  const { locale } = useLocale();

  return (
    <main className="min-h-screen bg-gray-50">
      <PortalNav />
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{locale === 'es' ? 'Configuracion' : 'Settings'}</h1>
          <LocaleToggle />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">{locale === 'es' ? 'Cuenta bancaria' : 'Bank account'}</h2>
            <p className="mt-2 text-sm text-gray-600">{locale === 'es' ? 'Banco General • ****9012 • ACH habilitado' : 'Banco General • ****9012 • ACH enabled'}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">{locale === 'es' ? 'Notificaciones' : 'Notifications'}</h2>
            <p className="mt-2 text-sm text-gray-600">{locale === 'es' ? 'Alertas de pago por correo y webhook activas.' : 'Payment alerts by email and webhook enabled.'}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
