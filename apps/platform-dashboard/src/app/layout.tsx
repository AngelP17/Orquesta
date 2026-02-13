import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const instrumentSerif = localFont({
  src: "../fonts/InstrumentSerif-Italic.woff2",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orquesta Control Center",
  description: "High-fidelity operations workspace for Panama payment orchestration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
