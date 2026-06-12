import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveHouseholdId } from "@/lib/active-household";
import { prisma } from "@/lib/prisma";
import { parseMonthSlug, prevMonthSlug } from "@/lib/utils";
import { computeMonthSummary, computePaymentBalance } from "@/lib/calc";
import { toNumber } from "@/lib/types";
import { generateMonthPDF } from "@/lib/pdf-generator";
import type { MonthData } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Non autorise", { status: 401 });
  }

  const { slug } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  if (!/^\d{4}-\d{2}$/.test(slug)) {
    return new NextResponse("Slug invalide", { status: 400 });
  }

  const householdId = await getActiveHouseholdId(session.user.id);
  if (!householdId) {
    return new NextResponse("Foyer introuvable", { status: 404 });
  }

  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: session.user.id } },
  });
  if (!member) {
    return new NextResponse("Acces refuse", { status: 403 });
  }

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

  if (!monthRecord) {
    return new NextResponse("Mois introuvable", { status: 404 });
  }

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

  const monthData: MonthData = {
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

  // ---- CSV ----
  if (format === "csv") {
    const lines: string[] = [];
    lines.push(`Rapport - ${slug}`);
    lines.push(`Total revenus,${totalRevenues.toFixed(2)}`);
    lines.push(`Total depenses,${totalExpenses.toFixed(2)}`);
    lines.push(``);
    lines.push(`Depenses`);
    lines.push(`Categorie,Description,Montant,Type,Paye par`);
    for (const e of monthData.expenses) {
      lines.push(`"${e.category}","${e.label}",${e.amount.toFixed(2)},"${e.type}","${e.paidByName ?? ""}"`);
    }
    lines.push(``);
    lines.push(`Revenus / Paies`);
    lines.push(`Membre,Date,Brut,Deductions,Net`);
    for (const p of monthData.paychecks) {
      lines.push(`"${p.displayName}","${p.date.slice(0, 10)}",${p.grossAmount.toFixed(2)},${p.vacationDeduction.toFixed(2)},${p.netAmount.toFixed(2)}`);
    }
    lines.push(``);
    lines.push(`Repartition`);
    lines.push(`Membre,Part %,Attendu,Depose,Solde`);
    for (const c of monthData.contributions) {
      lines.push(`"${c.displayName}",${(c.share * 100).toFixed(1)},${c.expectedContribution.toFixed(2)},${c.totalDeposited.toFixed(2)},${c.paymentBalance.toFixed(2)}`);
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="foyer-${slug}.csv"`,
      },
    });
  }

  // ---- PDF ----
  try {
    const buffer = await generateMonthPDF(monthData);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="foyer-${slug}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Erreur PDF: ${msg}`, { status: 500 });
  }
}
