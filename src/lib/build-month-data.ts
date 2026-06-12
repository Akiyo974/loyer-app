import { prisma } from "@/lib/prisma";
import { parseMonthSlug, prevMonthSlug } from "@/lib/utils";
import { computeMonthSummary, computePaymentBalance } from "@/lib/calc";
import { toNumber } from "@/lib/types";
import type { MonthData } from "@/lib/types";

/**
 * Construit un objet MonthData complet à partir d'un slug et d'un householdId.
 * Retourne null si le mois n'existe pas en base.
 */
export async function buildMonthData(
  slug: string,
  householdId: string
): Promise<MonthData | null> {
  const { year, month } = parseMonthSlug(slug);

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { budgetMode: true },
  });
  const budgetMode = (household?.budgetMode ?? "CURRENT") as "CURRENT" | "SHIFTED";

  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const monthRecord = await prisma.month.findUnique({
    where: { householdId_year_month: { householdId, year, month } },
  });
  if (!monthRecord) return null;

  const incomeSlug = budgetMode === "SHIFTED" ? prevMonthSlug(slug) : slug;
  const { year: incomeYear, month: incomeMonth } = parseMonthSlug(incomeSlug);

  const paychecks = await prisma.paycheck.findMany({
    where: {
      householdId,
      date: {
        gte: new Date(incomeYear, incomeMonth - 1, 1),
        lte: new Date(incomeYear, incomeMonth, 0),
      },
    },
    orderBy: [{ userId: "asc" }, { date: "asc" }],
  });

  const expenses = await prisma.expense.findMany({
    where: { householdId, monthId: monthRecord.id },
    include: { paidBy: { select: { name: true } } },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  const deposits = await prisma.deposit.findMany({
    where: { householdId, monthId: monthRecord.id },
    orderBy: [{ userId: "asc" }, { date: "asc" }],
  });

  const memberInfos = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    savingsGoal: m.savingsGoal ?? 0,
    email: m.user.email ?? "",
  }));

  const memberRevenues = memberInfos.map((m) => ({
    ...m,
    netMonthlyIncome: paychecks
      .filter((p) => p.userId === m.userId)
      .reduce((sum, p) => sum + toNumber(p.netAmount), 0),
  }));

  const totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const totalRevenues = memberRevenues.reduce((sum, m) => sum + m.netMonthlyIncome, 0);
  const summary = computeMonthSummary(memberRevenues, totalExpenses);

  const depositsByMember = new Map<string, number>();
  for (const d of deposits) {
    depositsByMember.set(d.userId, (depositsByMember.get(d.userId) ?? 0) + toNumber(d.amount));
  }

  const contributions = summary.contributions.map((c) => {
    const totalDeposited = depositsByMember.get(c.userId) ?? 0;
    const paymentBalance = computePaymentBalance(totalDeposited, c.expectedContribution);
    const savingsGoal = memberInfos.find((m) => m.userId === c.userId)?.savingsGoal ?? 0;
    return {
      ...c,
      totalDeposited,
      paymentBalance,
      savingsGoal,
      remainingAfterSavings: c.remainingAfterContribution - savingsGoal,
      vacationTotal: 0,
    };
  });

  return {
    slug,
    year,
    month,
    monthId: monthRecord.id,
    budgetMode,
    incomeSlug,
    members: memberInfos,
    paychecks: paychecks.map((p) => ({
      id: p.id,
      userId: p.userId,
      displayName: memberInfos.find((m) => m.userId === p.userId)?.displayName ?? p.userId,
      date: p.date.toISOString(),
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
      displayName: memberInfos.find((m) => m.userId === d.userId)?.displayName ?? d.userId,
      date: d.date.toISOString(),
      amount: toNumber(d.amount),
      notes: d.notes,
    })),
    totalExpenses,
    totalRevenues,
    contributions,
    warning: null,
  };
}

/** Retourne les emails de tous les membres d'un foyer */
export async function getHouseholdMemberEmails(householdId: string): Promise<string[]> {
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: { user: { select: { email: true } } },
  });
  return members.map((m) => m.user.email).filter(Boolean) as string[];
}
