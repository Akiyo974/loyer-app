"use server";

import { prisma } from "@/lib/prisma";
import { requireHouseholdMember, getOrCreateMonth } from "@/actions/helpers";
import { parseMonthSlug, prevMonthSlug } from "@/lib/utils";
import { computeMonthSummary, computePaymentBalance } from "@/lib/calc";
import { toNumber } from "@/lib/types";
import type { MonthData } from "@/lib/types";

/** Retourne les membres du foyer actif (pour les selects de formulaires). */
export async function getHouseholdMembers(): Promise<{ id: string; name: string }[]> {
  const { householdId } = await requireHouseholdMember();
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({ id: m.userId, name: m.displayName }));
}

/**
 * Retourne toutes les données d'un mois (agrégats inclus).
 * Point d'entrée principal des pages month/[slug].
 */
export async function getMonthData(monthSlug: string): Promise<MonthData> {
  const { householdId } = await requireHouseholdMember();

  let year: number, month: number;
  try {
    ({ year, month } = parseMonthSlug(monthSlug));
  } catch {
    throw new Error("Slug de mois invalide.");
  }

  // Récupérer le foyer pour connaître le mode de budgétisation
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { budgetMode: true },
  });
  const budgetMode = (household?.budgetMode ?? "CURRENT") as "CURRENT" | "SHIFTED";

  // Récupérer tous les membres du foyer
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Récupérer ou créer le mois
  const monthRecord = await getOrCreateMonth(householdId, year, month);

  // En mode SHIFTED, les revenus utilisés pour ce mois sont ceux du mois précédent
  const incomeSlug = budgetMode === "SHIFTED" ? prevMonthSlug(monthSlug) : monthSlug;
  const { year: incomeYear, month: incomeMonth } = parseMonthSlug(incomeSlug);

  const incomeStartDate = new Date(incomeYear, incomeMonth - 1, 1);
  const incomeEndDate = new Date(incomeYear, incomeMonth, 0);

  const paychecks = await prisma.paycheck.findMany({
    where: {
      householdId,
      date: { gte: incomeStartDate, lte: incomeEndDate },
    },
    orderBy: [{ userId: "asc" }, { date: "asc" }],
  });

  // Paychecks affichés dans l'onglet (toujours ceux du mois courant)
  const currentStartDate = new Date(year, month - 1, 1);
  const currentEndDate = new Date(year, month, 0);
  const currentPaychecks = budgetMode === "SHIFTED"
    ? await prisma.paycheck.findMany({
        where: {
          householdId,
          date: { gte: currentStartDate, lte: currentEndDate },
        },
        orderBy: [{ userId: "asc" }, { date: "asc" }],
      })
    : paychecks;

  // Dépenses du mois
  const expenses = await prisma.expense.findMany({
    where: { householdId, monthId: monthRecord.id },
    include: { paidBy: { select: { name: true } } },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  // Dépôts du mois
  const deposits = await prisma.deposit.findMany({
    where: { householdId, monthId: monthRecord.id },
    orderBy: [{ userId: "asc" }, { date: "asc" }],
  });

  // Construction du map membres
  const memberInfos = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    savingsGoal: m.savingsGoal ?? 0,
  }));

  // Calcul des revenus nets par membre
  const memberRevenues = memberInfos.map((m) => {
    const memberPaychecks = paychecks.filter((p) => p.userId === m.userId);
    const netMonthlyIncome = memberPaychecks.reduce(
      (sum, p) => sum + toNumber(p.netAmount),
      0
    );
    return { ...m, netMonthlyIncome };
  });

  // Total dépenses foyer
  const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);

  // Calcul des parts
  const summary = computeMonthSummary(memberRevenues, totalExpenses);

  // Dépôts par membre
  const depositsByMember = new Map<string, number>();
  for (const d of deposits) {
    depositsByMember.set(
      d.userId,
      (depositsByMember.get(d.userId) ?? 0) + toNumber(d.amount)
    );
  }

  // Enrichir les contributions avec les dépôts réels
  const contributions = summary.contributions.map((c) => {
    const totalDeposited = depositsByMember.get(c.userId) ?? 0;
    const paymentBalance = computePaymentBalance(totalDeposited, c.expectedContribution);
    const savingsGoal = memberInfos.find((m) => m.userId === c.userId)?.savingsGoal ?? 0;
    const remainingAfterSavings = c.remainingAfterContribution - savingsGoal;
    const vacationTotal = paychecks
      .filter((p) => p.userId === c.userId)
      .reduce((sum, p) => sum + toNumber(p.vacationDeduction), 0);
    return { ...c, totalDeposited, paymentBalance, savingsGoal, remainingAfterSavings, vacationTotal };
  });

  return {
    slug: monthSlug,
    year,
    month,
    monthId: monthRecord.id,
    budgetMode,
    incomeSlug,
    members: memberInfos,
    paychecks: currentPaychecks.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName:
        memberInfos.find((m) => m.userId === p.userId)?.displayName ?? "?",
      date: p.date.toISOString().split("T")[0],
      grossAmount: toNumber(p.grossAmount),
      vacationDeduction: toNumber(p.vacationDeduction),
      netAmount: toNumber(p.netAmount),
      notes: p.notes,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      label: e.label,
      amount: toNumber(e.amount),
      type: e.type,
      paidById: e.paidById,
      paidByName: e.paidBy?.name ?? null,
      notes: e.notes,
    })),
    deposits: deposits.map((d) => ({
      id: d.id,
      userId: d.userId,
      displayName:
        memberInfos.find((m) => m.userId === d.userId)?.displayName ?? "?",
      date: d.date.toISOString().split("T")[0],
      amount: toNumber(d.amount),
      notes: d.notes,
    })),
    totalExpenses: summary.totalExpenses,
    totalRevenues: summary.totalRevenues,
    contributions,
    warning: summary.warning,
  };
}

/**
 * Retourne la liste des mois existants pour le foyer.
 */
export async function getAvailableMonths(): Promise<
  Array<{ slug: string; year: number; month: number }>
> {
  const { householdId } = await requireHouseholdMember();

  const months = await prisma.month.findMany({
    where: { householdId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return months.map((m) => ({
    slug: `${m.year}-${String(m.month).padStart(2, "0")}`,
    year: m.year,
    month: m.month,
  }));
}
