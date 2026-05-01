"use client";

import { useState, useTransition } from "react";
import { updateBudgetMode } from "@/actions/settings-actions";
import { Button } from "@/components/ui/button";

interface BudgetModeFormProps {
  currentMode: "CURRENT" | "SHIFTED";
}

export function BudgetModeForm({ currentMode }: BudgetModeFormProps) {
  const [mode, setMode] = useState<"CURRENT" | "SHIFTED">(currentMode);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(m: "CURRENT" | "SHIFTED") {
    if (m === mode) return;
    setMode(m);
    setMessage(null);
    startTransition(async () => {
      const res = await updateBudgetMode(m);
      if (res.success) {
        setMessage({ type: "ok", text: "Mode mis à jour." });
      } else {
        setMode(currentMode);
        setMessage({ type: "err", text: res.error ?? "Erreur." });
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Mode Courant */}
      <button
        type="button"
        onClick={() => handleSelect("CURRENT")}
        disabled={isPending}
        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
          mode === "CURRENT"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm">Mode courant</span>
          {mode === "CURRENT" && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Actif
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Les revenus d'un mois financent les dépenses du <strong>même mois</strong>.
          <br />
          Exemple : payes d'avril → dépenses d'avril.
        </p>
      </button>

      {/* Mode Décalé */}
      <button
        type="button"
        onClick={() => handleSelect("SHIFTED")}
        disabled={isPending}
        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
          mode === "SHIFTED"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm">Mode décalé (enveloppe)</span>
          {mode === "SHIFTED" && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Actif
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Les revenus d'un mois financent les dépenses du <strong>mois suivant</strong>.
          <br />
          Exemple : payes d'avril → dépenses de mai. Zéro surprise en cas de paye basse.
        </p>
      </button>

      {message && (
        <p className={`text-xs ${message.type === "ok" ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
