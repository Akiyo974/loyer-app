"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WifiOff, Calendar } from "lucide-react";

interface CachedMonth {
  slug: string;
  label: string;
}

const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function slugToLabel(slug: string) {
  const [year, month] = slug.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

export default function OfflinePage() {
  const [cachedMonths, setCachedMonths] = useState<CachedMonth[]>([]);

  useEffect(() => {
    async function loadCache() {
      if (!("caches" in window)) return;
      try {
        const cache = await caches.open("foyer-v1");
        const keys = await cache.keys();
        const months: CachedMonth[] = keys
          .map((req) => {
            const url = new URL(req.url);
            const m = url.pathname.match(/^\/month\/(\d{4}-\d{2})$/);
            return m ? { slug: m[1], label: slugToLabel(m[1]) } : null;
          })
          .filter(Boolean)
          .sort((a, b) => (b!.slug > a!.slug ? 1 : -1)) as CachedMonth[];
        setCachedMonths(months);
      } catch {
        // Cache non accessible
      }
    }
    loadCache();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <WifiOff className="w-14 h-14 text-muted-foreground" strokeWidth={1.5} />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Vous êtes hors-ligne</h1>
          <p className="text-sm text-muted-foreground">
            Reconnectez-vous pour voir les données à jour.
          </p>
        </div>
      </div>

      {cachedMonths.length > 0 && (
        <div className="w-full max-w-xs space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">
            Mois disponibles hors-ligne
          </p>
          <div className="flex flex-col gap-1.5">
            {cachedMonths.map((m) => (
              <Link
                key={m.slug}
                href={`/month/${m.slug}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
              >
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/dashboard"
        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}

