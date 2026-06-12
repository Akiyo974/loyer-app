"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HouseholdSelector } from "./household-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HouseholdOption {
  id: string;
  name: string;
}

interface NavbarProps {
  userName: string;
  households: HouseholdOption[];
  activeHouseholdId: string;
  currentMonthSlug: string;
}

export function Navbar({ userName, households, activeHouseholdId, currentMonthSlug: monthSlug }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Tableau de bord" },
    { href: `/month/${monthSlug}`, label: "Mois en cours" },

    { href: "/settings", label: "Paramètres" },
  ];

  async function handleLogout() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex h-16 items-center justify-between">
          {/* Sélecteur de foyer */}
          <HouseholdSelector households={households} activeHouseholdId={activeHouseholdId} />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="hidden md:flex items-center gap-1">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground px-2">{userName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground w-full"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion ({userName})
            </button>
            <div className="px-3 py-1">
              <ThemeToggle />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
