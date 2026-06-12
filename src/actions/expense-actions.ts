"use server";

/**
 * expense-actions.ts — CRUD des dépenses communes.
 *
 * Toutes les opérations vérifient que la ressource appartient bien
 * au foyer de l'utilisateur courant avant de modifier la base.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ExpenseSchema, type ExpenseInput } from "@/lib/validations";
import { requireHouseholdMember, getOrCreateMonth } from "@/actions/helpers";
import { parseMonthSlug } from "@/lib/utils";
import type { ActionResult } from "@/actions/auth-actions";
import { logAuditAction } from "@/actions/audit-actions";

/** Crée une dépense pour le mois `monthSlug` (crée le mois si absent). */
export async function createExpense(
  monthSlug: string,
  input: ExpenseInput
): Promise<ActionResult<{ id: string }>> {
  const { householdId, userId, member } = await requireHouseholdMember();

  const parsed = ExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let year: number, month: number;
  try {
    ({ year, month } = parseMonthSlug(monthSlug));
  } catch {
    return { success: false, error: "Mois invalide." };
  }

  const monthRecord = await getOrCreateMonth(householdId, year, month);

  const expense = await prisma.expense.create({
    data: {
      householdId,
      monthId: monthRecord.id,
      ...parsed.data,
    },
  });

  void logAuditAction(householdId, userId, member.displayName, "CREATED", "expense", expense.id, `${parsed.data.label} · ${parsed.data.amount.toFixed(2)}$`, monthSlug);

  revalidatePath(`/month/${monthSlug}`);
  revalidatePath("/dashboard");

  return { success: true, data: { id: expense.id } };
}

/** Met à jour une dépense existante. Vérifie l'appartenance au foyer. */
export async function updateExpense(
  expenseId: string,
  input: ExpenseInput
): Promise<ActionResult> {
  const { householdId, userId, member } = await requireHouseholdMember();

  const parsed = ExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, householdId },
    include: { month: true },
  });
  if (!existing) {
    return { success: false, error: "Dépense introuvable." };
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: parsed.data,
  });

  const slug = `${existing.month.year}-${String(existing.month.month).padStart(2, "0")}`;
  void logAuditAction(householdId, userId, member.displayName, "UPDATED", "expense", expenseId, `${parsed.data.label} · ${parsed.data.amount.toFixed(2)}$`, slug);

  revalidatePath(`/month/${slug}`);
  revalidatePath("/dashboard");

  return { success: true, data: undefined };
}

/** Supprime une dépense. Vérifie l'appartenance au foyer. */
export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const { householdId, userId, member } = await requireHouseholdMember();

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, householdId },
    include: { month: true },
  });
  if (!existing) {
    return { success: false, error: "Dépense introuvable." };
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  const slug = `${existing.month.year}-${String(existing.month.month).padStart(2, "0")}`;
  void logAuditAction(householdId, userId, member.displayName, "DELETED", "expense", expenseId, `${existing.label} · ${existing.amount}$`, slug);

  revalidatePath(`/month/${slug}`);
  revalidatePath("/dashboard");

  return { success: true, data: undefined };
}

/**
 * Copie les dépenses FIXED du mois précédent vers le mois courant.
 */
export async function copyFixedExpensesFromPrevMonth(
  toSlug: string
): Promise<ActionResult<{ count: number }>> {
  const { householdId } = await requireHouseholdMember();

  let toYear: number, toMonth: number;
  try {
    ({ year: toYear, month: toMonth } = parseMonthSlug(toSlug));
  } catch {
    return { success: false, error: "Mois invalide." };
  }

  // Mois précédent
  const fromMonth = toMonth === 1 ? 12 : toMonth - 1;
  const fromYear = toMonth === 1 ? toYear - 1 : toYear;

  const prevMonthRecord = await prisma.month.findUnique({
    where: { householdId_year_month: { householdId, year: fromYear, month: fromMonth } },
  });

  if (!prevMonthRecord) {
    return { success: false, error: "Aucun mois précédent trouvé." };
  }

  const fixedExpenses = await prisma.expense.findMany({
    where: { monthId: prevMonthRecord.id, type: "FIXED" },
  });

  if (fixedExpenses.length === 0) {
    return { success: true, data: { count: 0 } };
  }

  const toMonthRecord = await getOrCreateMonth(householdId, toYear, toMonth);

  // Vérifier si des dépenses fixes existent déjà pour ce mois (évite les doublons)
  const existing = await prisma.expense.count({
    where: { monthId: toMonthRecord.id, type: "FIXED" },
  });
  if (existing > 0) {
    return { success: true, data: { count: 0 } };
  }

  await prisma.expense.createMany({
    data: fixedExpenses.map(({ id: _id, monthId: _mid, createdAt: _c, updatedAt: _u, ...rest }) => ({
      ...rest,
      monthId: toMonthRecord.id,
    })),
  });

  revalidatePath(`/month/${toSlug}`);

  return { success: true, data: { count: fixedExpenses.length } };
}
