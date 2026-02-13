import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { LocaleProvider } from '@/components/LocaleProvider';

const instrumentSerif = localFont({
  src: '../fonts/InstrumentSerif-Italic.woff2',
  variable: '--font-instrument-serif',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Orquesta - Portal de Vendedores',
  description: 'Portal para vendedores de la plataforma Orquesta'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={instrumentSerif.variable}>
      <body className="font-serif antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
