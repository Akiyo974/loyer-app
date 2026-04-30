"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, Check, X, Eye, EyeOff } from "lucide-react";
import { updateDisplayName, updateSavingsGoal, updatePassword } from "@/actions/settings-actions";
import { formatCurrency } from "@/lib/calc";

interface ProfileFormProps {
  displayName: string;
  savingsGoal: number;
}

function InlineEdit({
  value,
  onSave,
  isPending,
  type = "text",
  prefix,
  suffix,
  min,
  step,
}: {
  value: string;
  onSave: (v: string) => void;
  isPending: boolean;
  type?: string;
  prefix?: string;
  suffix?: string;
  min?: string;
  step?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {prefix}{current}{suffix}
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1" onClick={() => setEditing(true)}>
          <Pencil className="h-3 w-3" /> Modifier
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={current}
        type={type}
        min={min}
        step={step}
        onChange={(e) => setCurrent(e.target.value)}
        className="h-7 text-sm w-40"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(current); setEditing(false); }
          if (e.key === "Escape") { setEditing(false); setCurrent(value); }
        }}
      />
      <Button size="sm" className="h-7 px-2" disabled={isPending} onClick={() => { onSave(current); setEditing(false); }}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditing(false); setCurrent(value); }}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ProfileForm({ displayName, savingsGoal }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ---- Mot de passe ----
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  function handleDisplayName(v: string) {
    startTransition(async () => {
      const res = await updateDisplayName(v);
      if (res.success) { flash("Prénom mis à jour.", true); router.refresh(); }
      else flash(res.error, false);
    });
  }

  function handleSavingsGoal(v: string) {
    const num = parseFloat(v);
    startTransition(async () => {
      const res = await updateSavingsGoal(isNaN(num) ? 0 : num);
      if (res.success) { flash("Objectif d'épargne mis à jour.", true); router.refresh(); }
      else flash(res.error, false);
    });
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { flash("Les mots de passe ne correspondent pas.", false); return; }
    startTransition(async () => {
      const res = await updatePassword(currentPwd, newPwd);
      if (res.success) {
        flash("Mot de passe changé.", true);
        setShowPasswordForm(false);
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        flash(res.error, false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <Alert variant={msg.ok ? "default" : "destructive"} className="py-2">
          <AlertDescription className="text-sm">{msg.ok ? "✓ " : ""}{msg.text}</AlertDescription>
        </Alert>
      )}

      {/* Prénom */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Prénom d'affichage</span>
        <InlineEdit
          value={displayName}
          onSave={handleDisplayName}
          isPending={isPending}
        />
      </div>

      {/* Objectif d'épargne */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">Objectif d'épargne mensuel</span>
          <p className="text-xs text-muted-foreground">Montant à mettre de côté chaque mois</p>
        </div>
        <InlineEdit
          value={String(savingsGoal)}
          onSave={handleSavingsGoal}
          isPending={isPending}
          type="number"
          min="0"
          step="0.01"
          suffix=" $"
        />
      </div>

      {/* Mot de passe */}
      <div className="border-t pt-3">
        {!showPasswordForm ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setShowPasswordForm(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Changer le mot de passe
          </Button>
        ) : (
          <form onSubmit={handlePassword} className="space-y-3">
            <p className="text-sm font-medium">Changer le mot de passe</p>

            <div className="space-y-1.5">
              <Label htmlFor="cur-pwd" className="text-xs">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="cur-pwd"
                  type={showPwd ? "text" : "password"}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="h-8 text-sm pr-9"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1.5 text-muted-foreground"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pwd" className="text-xs">Nouveau mot de passe</Label>
              <Input
                id="new-pwd"
                type={showPwd ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="h-8 text-sm"
                minLength={6}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pwd" className="text-xs">Confirmer le mot de passe</Label>
              <Input
                id="confirm-pwd"
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="h-8 text-sm"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "…" : "Sauvegarder"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowPasswordForm(false); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
