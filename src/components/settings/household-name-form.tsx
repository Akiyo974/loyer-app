"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pencil, Check, X } from "lucide-react";
import { updateHouseholdName } from "@/actions/settings-actions";

export function HouseholdNameForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateHouseholdName(value);
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(true);
        setEditing(false);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{value}</span>
          {success && <span className="ml-2 text-xs text-green-600">✓ Sauvegardé</span>}
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
        <Button size="sm" className="h-8 px-2" onClick={handleSave} disabled={isPending}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditing(false); setValue(currentName); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
