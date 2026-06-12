"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createExpense } from "@/actions/expense-actions";
import { getHouseholdMembers } from "@/actions/month-actions";
import { CATEGORY_LABELS } from "@/lib/validations";

interface Member { id: string; name: string }

interface QuickAddButtonProps {
  /** Slug du mois courant (YYYY-MM) passé par le layout serveur */
  defaultSlug: string;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function QuickAddButton({ defaultSlug }: QuickAddButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // Formulaire
  const [category, setCategory] = useState("AUTRE");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("VARIABLE");
  const [paidById, setPaidById] = useState("none");

  // Détecte le mois depuis l'URL courante, sinon utilise le mois par défaut
  const monthMatch = pathname.match(/\/month\/(\d{4}-\d{2})/);
  const slug = monthMatch ? monthMatch[1] : defaultSlug;

  function handleOpen() {
    setError(null);
    setLabel("");
    setAmount("");
    setCategory("AUTRE");
    setType("VARIABLE");
    setPaidById("none");
    setOpen(true);
    // Charger les membres à l'ouverture
    getHouseholdMembers().then(setMembers).catch(() => setMembers([]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(amount);
    if (!label.trim() || isNaN(parsed) || parsed <= 0) {
      setError("Libellé et montant valides requis.");
      return;
    }
    startTransition(async () => {
      const res = await createExpense(slug, {
        category: category as never,
        label: label.trim(),
        amount: parsed,
        type: type as never,
        paidById: paidById === "none" ? undefined : paidById,
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={handleOpen}
        aria-label="Ajouter une dépense"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center md:bottom-8 md:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Ajout rapide — {slugToLabel(slug)}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Libellé */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-label">Libellé</Label>
              <Input
                id="qa-label"
                placeholder="Ex : Épicerie IGA"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Montant */}
            <div className="space-y-1.5">
              <Label htmlFor="qa-amount">Montant ($)</Label>
              <Input
                id="qa-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Catégorie + Type sur la même ligne */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VARIABLE">Variable</SelectItem>
                    <SelectItem value="FIXED">Fixe mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payé par */}
            {members.length > 0 && (
              <div className="space-y-1.5">
                <Label>Payé par (optionnel)</Label>
                <Select value={paidById} onValueChange={setPaidById}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Choisir —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────
const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
function slugToLabel(slug: string) {
  const [year, month] = slug.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}
