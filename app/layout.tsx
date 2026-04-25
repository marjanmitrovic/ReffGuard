import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "ReffGuard – Delegace rozhodčích",
  description: "Jednoduchá aplikace pro delegování a přihlašování rozhodčích.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "ReffGuard – Delegace rozhodčích",
    description:
      "Aplikace pro přihlašování rozhodčích, schvalování delegací a správu zápasů.",
    images: ["/reffguard-icon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReffGuard – Delegace rozhodčích",
    description:
      "Aplikace pro přihlašování rozhodčích, schvalování delegací a správu zápasů.",
    images: ["/reffguard-icon.png"],
  },
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