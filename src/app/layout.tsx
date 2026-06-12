import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterSW } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ThemeProvider } from "@/components/providers/theme-provider";
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
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <RegisterSW />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
