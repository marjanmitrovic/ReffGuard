import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delegace rozhodčích",
  description: "Jednoduchá aplikace pro delegování a přihlašování rozhodčích.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}