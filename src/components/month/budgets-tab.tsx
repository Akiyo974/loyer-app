"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/calc";
import { MonthData } from "@/lib/types";
import {
  updateCategoryBudget,
  copyRecurringExpensesFromLastMonth,
} from "@/actions/analytics-actions";
import { CATEGORY_LABELS } from "@/lib/validations";

interface BudgetsTabProps {
  monthData: MonthData;
  categoryBudgets: Record<string, number>;
}

export function BudgetsTab({
  monthData,
  categoryBudgets,
}: BudgetsTabProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calcule les dépenses du mois courant par catégorie
  const spendingByCategory = new Map<string, number>();
  monthData.expenses.forEach((exp) => {
    const current = spendingByCategory.get(exp.category) ?? 0;
    spendingByCategory.set(exp.category, current + exp.amount);
  });

  const handleSave = async (category: string) => {
    if (!editValue || parseFloat(editValue) <= 0) {
      setMessage({ type: "error", text: "Montant invalide" });
      return;
    }

    setSaving(true);
    try {
      await updateCategoryBudget(category, parseFloat(editValue));
      setMessage({ type: "success", text: "Budget mis à jour ✓" });
      setEditingCategory(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyFromLastMonth = async () => {
    if (!monthData.monthId) {
      setMessage({ type: "error", text: "Mois non trouvé" });
      return;
    }
    
    setCopying(true);
    try {
      await copyRecurringExpensesFromLastMonth(monthData.monthId, monthData.monthId);
      setMessage({
        type: "success",
        text: "Dépenses récurrentes copiées du mois précédent ✓",
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: "error",
        text: "Erreur lors de la copie des dépenses",
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message feedback */}
      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Copy recurring expenses */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900">Dépenses récurrentes</h4>
            <p className="text-sm text-blue-700 mt-1">
              Copier automatiquement les dépenses du mois précédent
            </p>
          </div>
          <Button
            onClick={handleCopyFromLastMonth}
            disabled={copying}
            size="sm"
            variant="outline"
            className="bg-white"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copying ? "Copie..." : "Copier"}
          </Button>
        </div>
      </Card>

      {/* Budgets par catégorie */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Budgets mensuels</h3>

        {Object.entries(CATEGORY_LABELS).map(([categoryKey, categoryLabel]) => {
          const budget = categoryBudgets[categoryKey] ?? 0;
          const spent = spendingByCategory.get(categoryKey) ?? 0;
          const percentage = budget > 0 ? (spent / budget) * 100 : 0;
          const isOverBudget = spent > budget;

          return (
            <Card key={categoryKey} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium">{categoryLabel}</h4>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(spent)} / {formatCurrency(budget)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOverBudget ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : percentage > 80 ? (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {budget > 0 && (
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
              )}

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
                  {budget === 0 ? "Ajouter budget" : "Modifier"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
