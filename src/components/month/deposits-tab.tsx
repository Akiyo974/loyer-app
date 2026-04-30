"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MonthData, DepositRow } from "@/lib/types";
import {
  createDeposit,
  updateDeposit,
  deleteDeposit,
} from "@/actions/deposit-actions";
import { formatCurrency as fmtCur } from "@/lib/calc";
import { formatDate as formatDateUtil } from "@/lib/utils";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface DepositFormData {
  date: string;
  amount: string;
  notes: string;
}

const defaultForm = (monthSlug: string): DepositFormData => ({
  date: `${monthSlug}-01`,
  amount: "",
  notes: "",
});

interface DepositsTabProps {
  monthData: MonthData;
}

export function DepositsTab({ monthData }: DepositsTabProps) {
  const { deposits, contributions, members, slug } = monthData;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepositRow | null>(null);
  const [form, setForm] = useState<DepositFormData>(defaultForm(slug));
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setForm(defaultForm(slug));
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(d: DepositRow) {
    setEditing(d);
    setForm({ date: d.date, amount: String(d.amount), notes: d.notes ?? "" });
    setError(null);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce dépôt ?")) return;
    startTransition(async () => {
      const res = await deleteDeposit(id);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      date: form.date,
      amount: parseFloat(form.amount),
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      const res = editing
        ? await updateDeposit(editing.id, input)
        : await createDeposit(slug, input);

      if (!res.success) {
        setError(res.error);
      } else {
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  // By member
  const byMember = members.map((m) => {
    const mDeposits = deposits.filter((d) => d.userId === m.userId);
    const contrib = contributions.find((c) => c.userId === m.userId);
    const totalDeposited = mDeposits.reduce((s, d) => s + d.amount, 0);
    const balance = contrib ? contrib.paymentBalance : 0;

    return { member: m, deposits: mDeposits, totalDeposited, balance, contrib };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dépôts sur compte conjoint</h2>
          <p className="text-sm text-muted-foreground">
            Enregistrez vos versements réels sur le compte commun.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un dépôt
        </Button>
      </div>

      {byMember.map(({ member, deposits: mDeposits, totalDeposited, balance, contrib }) => {
        const isSolved = balance >= -0.01;

        return (
          <Card key={member.userId} className={isSolved ? "border-green-200" : "border-orange-200"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSolved ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <CardTitle className="text-base">{member.displayName}</CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Attendu : {contrib ? fmtCur(contrib.expectedContribution) : "—"}
                  </div>
                  <div className="text-sm font-semibold">
                    Déposé : {fmtCur(totalDeposited)}
                  </div>
                  <Badge variant={isSolved ? "success" : "warning"} className="mt-1">
                    {isSolved
                      ? `+${fmtCur(Math.abs(balance))} trop payé`
                      : `${fmtCur(Math.abs(balance))} à déposer`}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {mDeposits.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Aucun dépôt enregistré.
                </p>
              ) : (
                mDeposits.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Date</span>
                        <p className="font-medium">{formatDateUtil(d.date)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Montant</span>
                        <p className="font-semibold text-blue-700">{fmtCur(d.amount)}</p>
                      </div>
                      {d.notes && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-xs">{d.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(d)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(d.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le dépôt" : "Enregistrer un dépôt"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="dep-date">Date du dépôt</Label>
              <Input
                id="dep-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dep-amount">Montant ($)</Label>
              <Input
                id="dep-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dep-notes">
                Notes{" "}
                <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
              </Label>
              <Input
                id="dep-notes"
                placeholder="ex : Virement Interac"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "…" : editing ? "Sauvegarder" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
