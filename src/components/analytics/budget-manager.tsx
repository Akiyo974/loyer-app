"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/calc";
import { updateCategoryBudget } from "@/actions/analytics-actions";
import { CATEGORY_LABELS } from "@/lib/validations";

interface BudgetManagerProps {
  budgets: Record<string, number>; // { "Épicerie": 400, "Transport": 150 }
  currentMonthSpending: Record<string, number>; // { "Épicerie": 380, "Transport": 200 }
}

export function BudgetManager({
  budgets,
  currentMonthSpending,
}: BudgetManagerProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (category: string) => {
    if (!editValue || parseFloat(editValue) <= 0) return;

    setSaving(true);
    try {
      await updateCategoryBudget(category, parseFloat(editValue));
      // Actualiser les données
      window.location.reload();
    } finally {
      setSaving(false);
      setEditingCategory(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Budgets mensuels par catégorie</h3>

      {Object.entries(CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
        const budget = budgets[categoryKey] ?? 0;
        const spent = currentMonthSpending[categoryKey] ?? 0;
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;
        const isOverBudget = spent > budget;

        return (
          <Card key={categoryKey} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium">{categoryLabel}</h4>
                <p className="text-sm text-gray-600">
                  {formatCurrency(spent)} / {formatCurrency(budget)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isOverBudget ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : percentage > 80 ? (
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all ${
                  isOverBudget
                    ? "bg-red-500"
                    : percentage > 80
                      ? "bg-orange-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Edit ou affichage */}
            {editingCategory === categoryKey ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Montant budget"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => handleSave(categoryKey)}
                  disabled={saving}
                >
                  {saving ? "..." : "Enregistrer"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingCategory(null)}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingCategory(categoryKey);
                  setEditValue(budget.toString());
                }}
              >
                Modifier budget
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
