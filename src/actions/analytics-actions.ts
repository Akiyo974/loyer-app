"use server";

import { requireHouseholdMember } from "@/actions/helpers";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/types";

/** Data point pour un mois dans le graphique historique */
export interface HistoryDataPoint {
  slug: string; // "2026-01" 
  date: string; // pour l'axe X du graphique
  totalExpenses: number;
  totalRevenues: number;
  effortRatio: number; // (dépenses / revenus) * 100
  month: string; // "Janvier 2026"
}

/** Alertes détectées pour un mois */
export interface ExpenseAlert {
  category: string;
  average: number;
  current: number;
  ratio: number; // current/average
  message: string;
}

/** Data enrichie pour tableau analytics */
export interface AnalyticsData {
  history: HistoryDataPoint[];
  quarterlyBreakdown: {
    quarter: string; // "Q1 2026"
    totalExpenses: number;
    totalRevenues: number;
  }[];
  alerts: ExpenseAlert[];
  averageMonthlyExpense: number;
  averageMonthlyRevenue: number;
  predictions: {
    month: string;
    projectedExpenses: number;
    projectedRevenues: number;
  }[];
}

/**
 * Charge et analyse l'historique 12 derniers mois
 * Calcule tendances, alertes, prévisions
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  const { householdId } = await requireHouseholdMember();

  if (!householdId) {
    throw new Error("Household not found");
  }

  // Récupère tous les mois
  const now = new Date();
  const pastYear = new Date();
  pastYear.setFullYear(pastYear.getFullYear() - 1);

  const months = await prisma.month.findMany({
    where: {
      householdId,
      year: {
        gte: pastYear.getFullYear(),
      },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  // Charge dépenses et revenus pour chaque mois
  const expensesMap = await prisma.expense.groupBy({
    by: ["monthId", "category"],
    where: {
      householdId,
    },
    _sum: {
      amount: true,
    },
  });

  const paychecksMap = await prisma.paycheck.groupBy({
    by: ["userId"],
    where: {
      householdId,
    },
    _sum: {
      netAmount: true,
    },
  });

  const totalRevenues = paychecksMap.reduce(
    (sum, p) => sum + toNumber(p._sum.netAmount),
    0
  );

  // Build history
  const history: HistoryDataPoint[] = months.map((month) => {
    const monthExpenses = expensesMap
      .filter((e) => e.monthId === month.id)
      .reduce((sum, e) => sum + toNumber(e._sum.amount), 0);

    // Revenu moyen par mois
    const monthlyRevenue = totalRevenues / 12;

    const effortRatio =
      monthlyRevenue > 0
        ? Math.round((monthExpenses / monthlyRevenue) * 100)
        : 0;

    return {
      slug: `${month.year}-${String(month.month).padStart(2, "0")}`,
      date: new Intl.DateTimeFormat("fr-CA", {
        month: "short",
        year: "2-digit",
      }).format(new Date(month.year, month.month - 1)),
      totalExpenses: monthExpenses,
      totalRevenues: monthlyRevenue,
      effortRatio,
      month: new Intl.DateTimeFormat("fr-CA", {
        month: "long",
        year: "numeric",
      }).format(new Date(month.year, month.month - 1)),
    };
  });

  // Breakdown par trimestre
  const quarterlyMap = new Map<
    string,
    { expenses: number; revenues: number }
  >();
  history.forEach((point) => {
    const quarter = `Q${Math.ceil(
      parseInt(point.slug.split("-")[1]) / 3
    )} ${point.slug.split("-")[0]}`;
    const existing = quarterlyMap.get(quarter) || {
      expenses: 0,
      revenues: 0,
    };
    quarterlyMap.set(quarter, {
      expenses: existing.expenses + point.totalExpenses,
      revenues: existing.revenues + point.totalRevenues,
    });
  });

  const quarterlyBreakdown = Array.from(quarterlyMap.entries()).map(
    ([quarter, data]) => ({
      quarter,
      totalExpenses: data.expenses,
      totalRevenues: data.revenues,
    })
  );

  // Détecte les alertes (dépenses > 20% moyenne)
  const categoryAverages = new Map<string, number>();
  const categoryMonths = new Map<string, number>();

  expensesMap.forEach((exp) => {
    if (!exp.category) return;
    const key = exp.category;
    categoryAverages.set(key, (categoryAverages.get(key) ?? 0) + toNumber(exp._sum.amount));
    categoryMonths.set(key, (categoryMonths.get(key) ?? 0) + 1);
  });

  // Calcule moyennes par catégorie
  const avgByCategory = new Map<string, number>();
  categoryAverages.forEach((sum, cat) => {
    const count = categoryMonths.get(cat) ?? 1;
    avgByCategory.set(cat, sum / count);
  });

  // Détecte anomalies dans le dernier mois
  const lastMonth = months[months.length - 1];
  const alerts: ExpenseAlert[] = [];

  if (lastMonth) {
    const lastMonthExpenses = expensesMap.filter(
      (e) => e.monthId === lastMonth.id
    );

    lastMonthExpenses.forEach((exp) => {
      if (!exp.category) return;
      const avg = avgByCategory.get(exp.category) ?? 0;
      const current = toNumber(exp._sum.amount);
      const ratio = avg > 0 ? current / avg : 1;

      if (ratio > 1.2) {
        // 20% au-dessus
        alerts.push({
          category: exp.category,
          average: avg,
          current,
          ratio,
          message: `${exp.category} à ${(ratio * 100).toFixed(0)}% de la moyenne`,
        });
      }
    });
  }

  const averageMonthlyExpense = history.reduce(
    (sum, h) => sum + h.totalExpenses,
    0
  ) / history.length;

  const averageMonthlyRevenue = history.reduce(
    (sum, h) => sum + h.totalRevenues,
    0
  ) / history.length;

  // Prévisions linéaires (3 derniers mois)
  const predictions = [];
  const lastThree = history.slice(-3);
  if (lastThree.length >= 2) {
    const avgExpenseChange =
      (lastThree[2].totalExpenses - lastThree[0].totalExpenses) / 2;
    const avgRevenueChange =
      (lastThree[2].totalRevenues - lastThree[0].totalRevenues) / 2;

    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    for (let i = 0; i < 3; i++) {
      const projMonth = new Date(nextMonth);
      projMonth.setMonth(projMonth.getMonth() + i);

      predictions.push({
        month: new Intl.DateTimeFormat("fr-CA", {
          month: "short",
          year: "2-digit",
        }).format(projMonth),
        projectedExpenses:
          lastThree[2].totalExpenses + avgExpenseChange * (i + 1),
        projectedRevenues:
          lastThree[2].totalRevenues + avgRevenueChange * (i + 1),
      });
    }
  }

  return {
    history,
    quarterlyBreakdown,
    alerts: alerts.sort((a, b) => b.ratio - a.ratio),
    averageMonthlyExpense,
    averageMonthlyRevenue,
    predictions,
  };
}

/**
 * Récupère les budgets par catégorie pour un foyer
 */
export async function getCategoryBudgets() {
  const { householdId } = await requireHouseholdMember();

  if (!householdId) {
    throw new Error("Household not found");
  }

  return await prisma.categoryBudget.findMany({
    where: { householdId },
    orderBy: { category: "asc" },
  });
}

/**
 * Met à jour le budget d'une catégorie
 */
export async function updateCategoryBudget(
  category: string,
  monthlyBudget: number
) {
  const { householdId } = await requireHouseholdMember();

  if (!householdId) {
    throw new Error("Household not found");
  }

  return await prisma.categoryBudget.upsert({
    where: {
      householdId_category: {
        householdId,
        category,
      },
    },
    create: {
      householdId,
      category,
      monthlyBudget,
    },
    update: {
      monthlyBudget,
    },
  });
}

/**
 * Copie automatiquement les dépenses fixes du mois précédent
 */
export async function copyRecurringExpensesFromLastMonth(
  householdId: string,
  newMonthId: string
) {
  // Récupère le mois pour trouver le précédent
  const newMonth = await prisma.month.findUnique({
    where: { id: newMonthId },
  });

  if (!newMonth) throw new Error("Month not found");

  // Récupère le mois précédent
  let prevMonth = newMonth.month - 1;
  let prevYear = newMonth.year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const lastMonth = await prisma.month.findFirst({
    where: {
      householdId,
      year: prevYear,
      month: prevMonth,
    },
  });

  if (!lastMonth) return;

  // Récupère les dépenses récurrentes ou de type FIXED du mois précédent
  const recurringExpenses = await prisma.expense.findMany({
    where: {
      monthId: lastMonth.id,
      OR: [{ isAutoRecurring: true }, { type: "FIXED" }],
    },
  });

  // Les copie dans le nouveau mois
  for (const exp of recurringExpenses) {
    await prisma.expense.create({
      data: {
        householdId: exp.householdId,
        monthId: newMonthId,
        category: exp.category,
        label: exp.label,
        amount: exp.amount,
        type: exp.type,
        paidById: exp.paidById,
        notes: exp.notes,
        isTemplate: exp.isTemplate,
        isAutoRecurring: exp.isAutoRecurring,
      },
    });
  }
}
