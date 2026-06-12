"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, ShoppingCart, Wallet, ChevronLeft } from "lucide-react";
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
import { createPaycheck } from "@/actions/paycheck-actions";
import { getHouseholdMembers } from "@/actions/month-actions";
import { CATEGORY_LABELS } from "@/lib/validations";

interface Member { id: string; name: string }

interface QuickAddButtonProps {
  defaultSlug: string;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value, label,
}));

type Mode = "menu" | "expense" | "paycheck";

export function QuickAddButton({ defaultSlug }: QuickAddButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // Champs dépense
  const [eCategory, setECategory] = useState("AUTRE");
  const [eLabel, setELabel] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eType, setEType] = useState("VARIABLE");
  const [ePaidById, setEPaidById] = useState("none");

  // Champs paie
  const [pMemberId, setPMemberId] = useState("");
  const [pDate, setPDate] = useState("");
  const [pGross, setPGross] = useState("");
  const [pVacation, setPVacation] = useState("0");

  // Détecte le mois depuis l'URL courante
  const monthMatch = pathname.match(/\/month\/(\d{4}-\d{2})/);
  const slug = monthMatch ? monthMatch[1] : defaultSlug;

  function handleOpen() {
    setMode("menu");
    setError(null);
    setOpen(true);
    getHouseholdMembers().then((m) => {
      setMembers(m);
      if (m.length > 0) {
        setPMemberId(m[0].id);
      }
    }).catch(() => setMembers([]));
    // Reset expense form
    setELabel(""); setEAmount(""); setECategory("AUTRE");
    setEType("VARIABLE"); setEPaidById("none");
    // Reset paycheck form
    setPDate(`${slug}-01`); setPGross(""); setPVacation("0");
  }

  function goTo(m: Mode) {
    setError(null);
    // Pré-remplir la date de paie avec le 1er du mois
    if (m === "paycheck") setPDate(`${slug}-01`);
    setMode(m);
  }

  function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseFloat(eAmount);
    if (!eLabel.trim() || isNaN(parsed) || parsed <= 0) {
      setError("Libellé et montant valides requis.");
      return;
    }
    startTransition(async () => {
      const res = await createExpense(slug, {
        category: eCategory as never,
        label: eLabel.trim(),
        amount: parsed,
        type: eType as never,
        paidById: ePaidById === "none" ? undefined : ePaidById,
      });
      if (!res.success) { setError(res.error); return; }
      // Réinitialiser pour permettre d'ajouter une autre dépense
      setELabel(""); setEAmount(""); setError(null);
      router.refresh();
    });
  }

  function handleSubmitPaycheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const gross = parseFloat(pGross);
    const vacation = parseFloat(pVacation) || 0;
    if (!pDate || isNaN(gross) || gross <= 0) {
      setError("Date et montant brut valides requis.");
      return;
    }
    startTransition(async () => {
      const res = await createPaycheck(
        { date: pDate, grossAmount: gross, vacationDeduction: vacation },
        pMemberId || undefined,
      );
      if (!res.success) { setError(res.error); return; }
      // Réinitialiser pour permettre d'ajouter une autre paie
      setPGross(""); setPVacation("0"); setError(null);
      router.refresh();
    });
  }

  const modalTitle = mode === "menu"
    ? "Que voulez-vous ajouter ?"
    : mode === "expense"
    ? `Dépense — ${slugToLabel(slug)}`
    : `Paie — ${slugToLabel(slug)}`;

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Ajouter"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center md:bottom-8 md:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode !== "menu" && (
                <button
                  onClick={() => goTo("menu")}
                  className="mr-1 text-muted-foreground hover:text-foreground"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {modalTitle}
            </DialogTitle>
          </DialogHeader>

          {/* ── Menu de choix ─────────────────────────────────── */}
          {mode === "menu" && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => goTo("expense")}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-6 text-center"
              >
                <ShoppingCart className="h-7 w-7 text-primary" />
                <span className="text-sm font-medium">Dépense</span>
                <span className="text-xs text-muted-foreground">Epicerie, loyer, loisirs…</span>
              </button>
              <button
                onClick={() => goTo("paycheck")}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-6 text-center"
              >
                <Wallet className="h-7 w-7 text-green-500" />
                <span className="text-sm font-medium">Paie</span>
                <span className="text-xs text-muted-foreground">Ajouter une paie reçue</span>
              </button>
            </div>
          )}

          {/* ── Formulaire dépense ────────────────────────────── */}
          {mode === "expense" && (
            <form onSubmit={handleSubmitExpense} className="space-y-4 pt-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="qa-label">Libellé</Label>
                <Input id="qa-label" placeholder="Ex : Épicerie IGA" value={eLabel}
                  onChange={(e) => setELabel(e.target.value)} autoFocus required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-amount">Montant ($)</Label>
                <Input id="qa-amount" type="number" step="0.01" min="0.01"
                  placeholder="0.00" value={eAmount}
                  onChange={(e) => setEAmount(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Catégorie</Label>
                  <Select value={eCategory} onValueChange={setECategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={eType} onValueChange={setEType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VARIABLE">Variable</SelectItem>
                      <SelectItem value="FIXED">Fixe mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {members.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Payé par (optionnel)</Label>
                  <Select value={ePaidById} onValueChange={setEPaidById}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setOpen(false)}>Fermer</Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground -mt-1">
                Vous pouvez en ajouter plusieurs à la suite sans fermer.
              </p>
            </form>
          )}

          {/* ── Formulaire paie ───────────────────────────────── */}
          {mode === "paycheck" && (
            <form onSubmit={handleSubmitPaycheck} className="space-y-4 pt-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {members.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Membre</Label>
                  <Select value={pMemberId} onValueChange={setPMemberId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="qa-date">Date de paie</Label>
                <Input id="qa-date" type="date" value={pDate}
                  onChange={(e) => setPDate(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qa-gross">Montant brut ($)</Label>
                  <Input id="qa-gross" type="number" step="0.01" min="0.01"
                    placeholder="0.00" value={pGross}
                    onChange={(e) => setPGross(e.target.value)} autoFocus required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qa-vac">Vacances ($)</Label>
                  <Input id="qa-vac" type="number" step="0.01" min="0"
                    placeholder="0.00" value={pVacation}
                    onChange={(e) => setPVacation(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => setOpen(false)}>Fermer</Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? "Ajout..." : "Ajouter la paie"}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground -mt-1">
                Vous pouvez en ajouter plusieurs à la suite sans fermer.
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
function slugToLabel(slug: string) {
  const [year, month] = slug.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

