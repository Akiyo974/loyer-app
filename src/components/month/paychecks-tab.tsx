"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MonthData, PaycheckRow } from "@/lib/types";
import {
  createPaycheck,
  updatePaycheck,
  deletePaycheck,
  createBiweeklyPaychecks,
} from "@/actions/paycheck-actions";
import { formatDate as formatDateUtil } from "@/lib/utils";
import { formatCurrency as fmtCur, computeNetPaycheck } from "@/lib/calc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Repeat, CalendarDays } from "lucide-react";

// ---- helpers ----------------------------------------------------------------

function toDateString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Génère toutes les dates bi-hebdomadaires du mois à partir de firstDate. */
function getBiweeklyDates(firstDate: string, year: number, month: number): string[] {
  if (!firstDate.match(/^\d{4}-\d{2}-\d{2}$/)) return [];
  const [y, m, d] = firstDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  if (start > monthEnd || start < monthStart) return [];
  const dates: string[] = [];
  let cur = new Date(start);
  while (cur <= monthEnd) {
    dates.push(toDateString(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 14);
  }
  return dates;
}

// ---- types ------------------------------------------------------------------

interface SingleFormData {
  targetUserId: string;
  date: string;
  grossAmount: string;
  vacationDeduction: string;
  notes: string;
}

const defaultSingleForm = (userId: string, monthSlug: string): SingleFormData => ({
  targetUserId: userId,
  date: `${monthSlug}-01`,
  grossAmount: "",
  vacationDeduction: "0",
  notes: "",
});

interface PaychecksTabProps {
  monthData: MonthData;
}

// ---- component --------------------------------------------------------------

export function PaychecksTab({
  monthData: { paychecks, members, slug, year, month, totalRevenues },
}: PaychecksTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaycheckRow | null>(null);

  // mode: "single" | "biweekly" (biweekly uniquement à l'ajout)
  const [mode, setMode] = useState<"single" | "biweekly">("biweekly");

  // formulaire paie unique
  const [form, setForm] = useState<SingleFormData>(
    defaultSingleForm(members[0]?.userId ?? "", slug)
  );

  // formulaire bi-hebdomadaire
  const [biFirstDate, setBiFirstDate] = useState(`${slug}-01`);
  const [biGrosses, setBiGrosses] = useState<Record<string, string>>({});
  const [biDeductions, setBiDeductions] = useState<Record<string, string>>({});
  const [biTargetUser, setBiTargetUser] = useState(members[0]?.userId ?? "");

  const [error, setError] = useState<string | null>(null);

  // dates bi-hebdo calculées
  const biDates = mode === "biweekly" ? getBiweeklyDates(biFirstDate, year, month) : [];

  // Regrouper par membre
  const byMember = members.map((m) => ({
    member: m,
    paychecks: paychecks.filter((p) => p.userId === m.userId),
    total: paychecks
      .filter((p) => p.userId === m.userId)
      .reduce((s, p) => s + p.netAmount, 0),
  }));

  function openAdd() {
    setEditing(null);
    setMode("biweekly");
    setForm(defaultSingleForm(members[0]?.userId ?? "", slug));
    setBiFirstDate(`${slug}-01`);
    setBiGrosses({});
    setBiDeductions({});
    setBiTargetUser(members[0]?.userId ?? "");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(p: PaycheckRow) {
    setEditing(p);
    setMode("single");
    setForm({
      targetUserId: p.userId,
      date: p.date,
      grossAmount: String(p.grossAmount),
      vacationDeduction: String(p.vacationDeduction),
      notes: p.notes ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cette paie ?")) return;
    startTransition(async () => {
      const res = await deletePaycheck(id);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "biweekly") {
      if (biDates.length === 0) { setError("La première date doit être dans le mois affiché."); return; }
      const entries = biDates.map((d) => ({
        date: d,
        grossAmount: parseFloat(biGrosses[d] || "0"),
        vacationDeduction: parseFloat(biDeductions[d] || "0"),
      }));
      const allValid = entries.every(e => e.grossAmount > 0);
      if (!allValid) { setError("Veuillez saisir un montant net pour chaque paie."); return; }
      startTransition(async () => {
        const res = await createBiweeklyPaychecks(entries, biTargetUser);
        if (!res.success) setError(res.error);
        else { setDialogOpen(false); router.refresh(); }
      });
      return;
    }

    // mode unique
    const input = {
      date: form.date,
      grossAmount: parseFloat(form.grossAmount),
      vacationDeduction: parseFloat(form.vacationDeduction || "0"),
      notes: form.notes || undefined,
    };
    startTransition(async () => {
      const res = editing
        ? await updatePaycheck(editing.id, input)
        : await createPaycheck(input, form.targetUserId);
      if (!res.success) setError(res.error);
      else { setDialogOpen(false); router.refresh(); }
    });
  }

  // aperçu net (mode unique)
  const grossNum = parseFloat(form.grossAmount || "0");
  const dedNum = parseFloat(form.vacationDeduction || "0");
  const singlePreviewNet =
    !isNaN(grossNum) && !isNaN(dedNum) && grossNum > 0 && dedNum <= grossNum
      ? grossNum - dedNum
      : null;

  // aperçu total net (mode biweekly)
  const biTotalNet =
    biDates.length > 0 && biDates.some(d => parseFloat(biGrosses[d] || "0") > 0)
      ? biDates.reduce((sum, d) => {
          const g = parseFloat(biGrosses[d] || "0");
          const ded = parseFloat(biDeductions[d] || "0");
          return sum + (g > 0 ? Math.max(0, g - ded) : 0);
        }, 0)
      : null;

  const lastDayOfMonth = toDateString(new Date(year, month, 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Paies du mois</h2>
          <p className="text-sm text-muted-foreground">
            Revenus nets totaux : {fmtCur(totalRevenues)}
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter des paies
        </Button>
      </div>

      {byMember.map(({ member, paychecks: mPaychecks, total }) => (
        <Card key={member.userId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{member.displayName}</CardTitle>
              <Badge variant="secondary">Total net : {fmtCur(total)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {mPaychecks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucune paie saisie pour ce mois.
              </p>
            ) : (
              <div className="space-y-2">
                {mPaychecks.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Date</span>
                        <p className="font-medium">{formatDateUtil(p.date)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Net</span>
                        <p>{fmtCur(p.grossAmount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Déd. vacances</span>
                        <p className={p.vacationDeduction > 0 ? "text-orange-600" : ""}>
                          {p.vacationDeduction > 0 ? `− ${fmtCur(p.vacationDeduction)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Net</span>
                        <p className="font-semibold text-green-700">{fmtCur(p.netAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ---- Dialog Ajouter / Modifier ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la paie" : "Ajouter des paies"}
            </DialogTitle>
          </DialogHeader>

          {/* Toggle mode — uniquement à l'ajout */}
          {!editing && (
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setMode("biweekly")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors ${
                  mode === "biweekly"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-gray-50 text-muted-foreground"
                }`}
              >
                <Repeat className="h-3.5 w-3.5" />
                Bi-hebdomadaire
              </button>
              <button
                type="button"
                onClick={() => setMode("single")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors border-l ${
                  mode === "single"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-gray-50 text-muted-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Paie unique
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ===== MODE BI-HEBDOMADAIRE ===== */}
            {mode === "biweekly" && (
              <>
                <div className="space-y-2">
                  <Label>Membre</Label>
                  <Select value={biTargetUser} onValueChange={setBiTargetUser}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>{m.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bi-first">Date de la 1ère paie du mois</Label>
                  <Input
                    id="bi-first"
                    type="date"
                    value={biFirstDate}
                    min={`${slug}-01`}
                    max={lastDayOfMonth}
                    onChange={(e) => setBiFirstDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Les paies suivantes seront générées automatiquement toutes les 2 semaines.
                  </p>
                </div>

                {/* Aperçu des dates générées */}
                {biDates.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      {biDates.length} paie{biDates.length > 1 ? "s" : ""} prévue{biDates.length > 1 ? "s" : ""}
                    </Label>
                    <div className="rounded-lg border divide-y bg-gray-50">
                      {biDates.map((d) => {
                        const grossD = parseFloat(biGrosses[d] || "0");
                        const ded = parseFloat(biDeductions[d] || "0");
                        let net: number | null = null;
                        try { net = grossD > 0 ? computeNetPaycheck(grossD, ded) : null; } catch { net = null; }
                        return (
                          <div key={d} className="space-y-1.5 px-3 py-2.5 text-sm">
                            <span className="font-medium">{formatDateUtil(d)}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 flex-1">
                                <span className="text-muted-foreground text-xs shrink-0">Net $</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="2200.00"
                                  className="h-7 text-sm px-2"
                                  value={biGrosses[d] ?? ""}
                                  onChange={(e) =>
                                    setBiGrosses((prev) => ({ ...prev, [d]: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-1 flex-1">
                                <span className="text-muted-foreground text-xs shrink-0">Déd. vac. $</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                className="h-7 text-sm px-2"
                                value={biDeductions[d] ?? "0"}
                                onChange={(e) =>
                                  setBiDeductions((prev) => ({ ...prev, [d]: e.target.value }))
                                }
                              />
                              </div>
                              <span className="w-20 text-right shrink-0">
                                {net !== null ? (
                                  <span className="font-semibold text-green-700">{fmtCur(net)}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {biTotalNet !== null && (
                        <div className="flex justify-between px-3 py-2 text-sm font-semibold bg-white rounded-b-lg">
                          <span>Total net</span>
                          <span className="text-green-700">{fmtCur(biTotalNet)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {biFirstDate && biDates.length === 0 && (
                  <p className="text-sm text-destructive">
                    La première date doit être dans le mois affiché.
                  </p>
                )}
              </>
            )}

            {/* ===== MODE PAIE UNIQUE ===== */}
            {mode === "single" && (
              <>
                {!editing && (
                  <div className="space-y-2">
                    <Label>Membre</Label>
                    <Select
                      value={form.targetUserId}
                      onValueChange={(v) => setForm((f) => ({ ...f, targetUserId: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>{m.displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="date">Date de la paie</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gross">Montant net ($)</Label>
                  <Input
                    id="gross"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="2200.00"
                    value={form.grossAmount}
                    onChange={(e) => setForm((f) => ({ ...f, grossAmount: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vac">
                    Déduction vacances ($){" "}
                    <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
                  </Label>
                  <Input
                    id="vac"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.vacationDeduction}
                    onChange={(e) => setForm((f) => ({ ...f, vacationDeduction: e.target.value }))}
                  />
                </div>

                {singlePreviewNet !== null && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                    <span className="text-muted-foreground">Net calculé : </span>
                    <span className="font-semibold text-green-700">{fmtCur(singlePreviewNet)}</span>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "…"
                  : editing
                  ? "Sauvegarder"
                  : mode === "biweekly"
                  ? `Créer ${biDates.length > 0 ? biDates.length : ""} paie${biDates.length !== 1 ? "s" : ""}`
                  : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
