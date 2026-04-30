"use server";

/**
 * deposit-actions.ts — CRUD des dépôts (virements réels vers le compte commun).
 *
 * Chaque dépôt est rattaché au membre courant et à un mois civil.
 * Son montant total est comparé à la contribution attendue pour calculer
 * le solde paiement dans `getMonthData`.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DepositSchema, type DepositInput } from "@/lib/validations";
import { requireHouseholdMember, getOrCreateMonth } from "@/actions/helpers";
import { parseMonthSlug } from "@/lib/utils";
import type { ActionResult } from "@/actions/auth-actions";

/** Enregistre un virement du membre courant vers le compte commun. */
export async function createDeposit(
  monthSlug: string,
  input: DepositInput
): Promise<ActionResult<{ id: string }>> {
  const { householdId, userId } = await requireHouseholdMember();

  const parsed = DepositSchema.safeParse(input);
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

  const deposit = await prisma.deposit.create({
    data: {
      householdId,
      monthId: monthRecord.id,
      userId,
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    },
  });

  revalidatePath(`/month/${monthSlug}`);
  revalidatePath("/dashboard");

  return { success: true, data: { id: deposit.id } };
}

/** Met à jour un dépôt existant. Vérifie l'appartenance au foyer. */
export async function updateDeposit(
  depositId: string,
  input: DepositInput
): Promise<ActionResult> {
  const { householdId } = await requireHouseholdMember();

  const parsed = DepositSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const existing = await prisma.deposit.findFirst({
    where: { id: depositId, householdId },
    include: { month: true },
  });
  if (!existing) {
    return { success: false, error: "Dépôt introuvable." };
  }

  await prisma.deposit.update({
    where: { id: depositId },
    data: {
      date: new Date(parsed.data.date),
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    },
  });

  const slug = `${existing.month.year}-${String(existing.month.month).padStart(2, "0")}`;
  revalidatePath(`/month/${slug}`);
  revalidatePath("/dashboard");

  return { success: true, data: undefined };
}

/** Supprime un dépôt. Vérifie l'appartenance au foyer. */
export async function deleteDeposit(depositId: string): Promise<ActionResult> {
  const { householdId } = await requireHouseholdMember();

  const existing = await prisma.deposit.findFirst({
    where: { id: depositId, householdId },
    include: { month: true },
  });
  if (!existing) {
    return { success: false, error: "Dépôt introuvable." };
  }

  await prisma.deposit.delete({ where: { id: depositId } });

  const slug = `${existing.month.year}-${String(existing.month.month).padStart(2, "0")}`;
  revalidatePath(`/month/${slug}`);
  revalidatePath("/dashboard");

  return { success: true, data: undefined };
}
