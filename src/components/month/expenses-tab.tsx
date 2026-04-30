"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MonthData, ExpenseRow } from "@/lib/types";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  copyFixedExpensesFromPrevMonth,
} from "@/actions/expense-actions";
import { formatCurrency as fmtCur, formatPercent } from "@/lib/calc";
import {
  CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
  CategoryEnum,
} from "@/lib/validations";
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
import { Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, Info } from "lucide-react";

interface ExpenseFormData {
  category: string;
  label: string;
  amount: string;
  type: string;
  paidById: string;
  notes: string;
}

const defaultForm = (): ExpenseFormData => ({
  category: "AUTRE",
  label: "",
  amount: "",
  type: "VARIABLE",
  paidById: "",
  notes: "",
});

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const QUICK_FIXED_EXPENSES = [
  { category: "ELECTRICITE",        label: "\u00c9lectricit\u00e9" },
  { category: "INTERNET",           label: "WiFi" },
  { category: "EPICERIE",           label: "\u00c9picerie" },
  { category: "ASSURANCE_LOGEMENT", label: "Assur. logement" },
  { category: "ASSURANCE_AUTO",     label: "Assur. auto" },
];

interface ExpensesTabProps {
  monthData: MonthData;
}

export function ExpensesTab({ monthData }: ExpensesTabProps) {
  const { expenses, members, slug, totalExpenses, contributions } = monthData;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(defaultForm());
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Group by category
  const byCategory = CATEGORIES.map(({ value, label }) => ({
    category: value,
    label,
    items: expenses.filter((e) => e.category === value),
    total: expenses
      .filter((e) => e.category === value)
      .reduce((s, e) => s + e.amount, 0),
  })).filter((g) => g.items.length > 0);

  // Stats analyse
  const totalFixed = expenses.filter((e) => e.type === "FIXED").reduce((s, e) => s + e.amount, 0);
  const totalVariable = expenses.filter((e) => e.type === "VARIABLE").reduce((s, e) => s + e.amount, 0);
  const countFixed = expenses.filter((e) => e.type === "FIXED").length;
  const countVariable = expenses.filter((e) => e.type === "VARIABLE").length;

  function openAdd() {
    setEditing(null);
    setForm(defaultForm());
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(e: ExpenseRow) {
    setEditing(e);
    setForm({
      category: e.category,
      label: e.label,
      amount: String(e.amount),
      type: e.type,
      paidById: e.paidById ?? "",
      notes: e.notes ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  function handleCopyFixed() {
    startTransition(async () => {
      const res = await copyFixedExpensesFromPrevMonth(slug);
      if (!res.success) {
        setCopyMsg(`Erreur : ${res.error}`);
      } else {
        setCopyMsg(
          res.data.count > 0
            ? `${res.data.count} dépense(s) fixe(s) copiée(s) du mois précédent.`
            : "Aucune dépense fixe à copier du mois précédent."
        );
        router.refresh();
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input = {
      category: form.category as any,
      label: form.label,
      amount: parseFloat(form.amount),
      type: form.type as any,
      paidById: form.paidById || undefined,
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const res = editing
        ? await updateExpense(editing.id, input)
        : await createExpense(slug, input);

      if (!res.success) {
        setError(res.error);
      } else {
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Dépenses du foyer</h2>
          <p className="text-sm text-muted-foreground">
            Total : {fmtCur(totalExpenses)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFixed}
            disabled={isPending}
            className="gap-2 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            Copier fixe mois préc.
          </Button>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {copyMsg && (
        <Alert variant={copyMsg.startsWith("Erreur") ? "destructive" : "success"}>
          <AlertDescription>{copyMsg}</AlertDescription>
        </Alert>
      )}

      {/* ---- Analyse des dépenses ---- */}
      {expenses.length > 0 && (
        <Card className="border-blue-100 bg-blue-50/40">
          <button
            type="button"
            className="w-full text-left"
            onClick={() => setShowAnalysis((v) => !v)}
          >
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                  <Info className="h-4 w-4 shrink-0" />
                  Analyse du mois
                </div>
                {showAnalysis
                  ? <ChevronUp className="h-4 w-4 text-blue-600" />
                  : <ChevronDown className="h-4 w-4 text-blue-600" />}
              </div>
            </CardHeader>
          </button>

          {showAnalysis && (
            <CardContent className="pt-0 pb-4 space-y-5">

              {/* Fixe vs Variable */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Répartition fixe / variable</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 text-xs px-3 py-1 font-medium">
                    Fixes : {fmtCur(totalFixed)}
                    {totalExpenses > 0 && <span className="opacity-70">({formatPercent(totalFixed / totalExpenses)})</span>}
                    <span className="opacity-60">· {countFixed} poste{countFixed !== 1 ? "s" : ""}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 text-xs px-3 py-1 font-medium">
                    Variables : {fmtCur(totalVariable)}
                    {totalExpenses > 0 && <span className="opacity-70">({formatPercent(totalVariable / totalExpenses)})</span>}
                    <span className="opacity-60">· {countVariable} poste{countVariable !== 1 ? "s" : ""}</span>
                  </span>
                </div>
                {totalExpenses > 0 && (
                  <div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all"
                        style={{ width: `${Math.min(100, (totalFixed / totalExpenses) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalFixed > 0 && totalVariable === 0 && "Toutes les dépenses sont fixes ce mois-ci."}
                      {totalFixed === 0 && totalVariable > 0 && "Toutes les dépenses sont variables ce mois-ci."}
                      {totalFixed > 0 && totalVariable > 0 && (
                        totalFixed > totalVariable
                          ? `Les dépenses fixes dominent (${formatPercent(totalFixed / totalExpenses)} du total) — bon indicateur de stabilité.`
                          : `Les dépenses variables sont majoritaires (${formatPercent(totalVariable / totalExpenses)}) — potentiel d'optimisation.`
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Par catégorie */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Par catégorie</p>
                <div className="space-y-2">
                  {byCategory
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .map(({ category, label, items, total }) => {
                      const pct = totalExpenses > 0 ? total / totalExpenses : 0;
                      const fixedAmt = items.filter(e => e.type === "FIXED").reduce((s, e) => s + e.amount, 0);
                      const varAmt = items.filter(e => e.type === "VARIABLE").reduce((s, e) => s + e.amount, 0);
                      const isAllFixed = varAmt === 0 && fixedAmt > 0;
                      const isAllVar = fixedAmt === 0 && varAmt > 0;
                      return (
                        <div key={category} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-700">{label}</span>
                            <span className="text-gray-600 tabular-nums">{fmtCur(total)} <span className="text-muted-foreground">({formatPercent(pct)})</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(100, pct * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {isAllFixed && `Coût fixe mensuel — revient automatiquement chaque mois.`}
                            {isAllVar && `Dépense variable — peut varier d'un mois à l'autre.`}
                            {!isAllFixed && !isAllVar && `Mix : ${fmtCur(fixedAmt)} fixe + ${fmtCur(varAmt)} variable.`}
                            {" "}{items.length > 1 && `(${items.length} postes)`}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Contribution par membre */}
              {contributions.length > 0 && totalExpenses > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Contribution attendue par personne</p>
                  <div className="space-y-2">
                    {contributions.map((c) => {
                      const expected = c.expectedContribution;
                      const deposited = c.totalDeposited;
                      const balance = c.paymentBalance;
                      return (
                        <div key={c.userId} className="rounded-lg bg-white border border-blue-100 px-3 py-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800">{c.displayName}</span>
                            <span className="text-blue-700 font-semibold">{fmtCur(expected)}</span>
                          </div>
                          <p className="text-muted-foreground">
                            Revenus nets : {fmtCur(c.netMonthlyIncome)} → part des dépenses : {formatPercent(c.share)}.
                            {" "}{c.displayName} est responsable de {formatPercent(c.share)} du total foyer ({fmtCur(totalExpenses)}), soit {fmtCur(expected)}.
                          </p>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-muted-foreground">Déposé :</span>
                            <span className={deposited >= expected ? "text-green-700 font-medium" : "text-orange-600 font-medium"}>{fmtCur(deposited)}</span>
                            {balance !== 0 && (
                              <span className={balance > 0 ? "text-green-600" : "text-orange-500"}>
                                ({balance > 0 ? "+" : ""}{fmtCur(balance)})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </CardContent>
          )}
        </Card>
      )}

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Aucune dépense pour ce mois.</p>
            <Button variant="link" onClick={openAdd} className="mt-2">
              Ajouter la première dépense
            </Button>
          </CardContent>
        </Card>
      ) : (
        byCategory.map(({ category, label, items, total }) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </CardTitle>
                <span className="text-sm font-semibold">{fmtCur(total)}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {items.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{exp.label}</span>
                      <Badge
                        variant={exp.type === "FIXED" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {EXPENSE_TYPE_LABELS[exp.type]}
                      </Badge>
                      {exp.paidByName && (
                        <span className="text-xs text-muted-foreground">
                          payé par {exp.paidByName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="font-semibold">{fmtCur(exp.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(exp)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(exp.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la dépense" : "Ajouter une dépense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Raccourcis dépenses fixes communes */}
            {!editing && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Raccourci fixe</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_FIXED_EXPENSES.map((preset) => (
                    <button
                      key={preset.category}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          category: preset.category,
                          label: preset.label,
                          type: "FIXED",
                        }))
                      }
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.category === preset.category &&
                        form.label === preset.label &&
                        form.type === "FIXED"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Catégorie */}
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Catégorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
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

              {/* Type */}
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Libellé */}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="label">Libellé</Label>
                <Input
                  id="label"
                  placeholder="ex : Hydro-Québec mai"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  required
                />
              </div>

              {/* Montant */}
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="amount">Montant ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>

              {/* Payé par */}
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Payé par{" "}<span className="text-muted-foreground font-normal text-xs">(optionnel)</span></Label>
                <Select
                  value={form.paidById || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, paidById: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Non précisé —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "…" : editing ? "Sauvegarder" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
