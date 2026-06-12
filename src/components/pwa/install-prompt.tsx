"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Ne pas montrer si déjà installé en mode standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Ne pas montrer si l'utilisateur a déjà refusé
    if (localStorage.getItem("pwa-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Installer Foyer</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Accès rapide depuis votre écran d&apos;accueil, même hors-ligne.
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" onClick={handleInstall} className="gap-1.5 h-8">
          <Download className="h-3.5 w-3.5" />
          Installer
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
