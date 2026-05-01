import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterSW } from "@/components/pwa/register-sw";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Foyer — Gestion des dépenses du couple",
  description: "Répartissez équitablement les dépenses de votre foyer au prorata de vos revenus.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Foyer",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
