"use server";

/**
 * paycheck-actions.ts — CRUD des fiches de paie.
 *
 * La date est construite en heure locale (`new Date(y, m-1, d)`) pour éviter
 * le décalage UTC qu'introduit `new Date("YYYY-MM-DD")` (minuit UTC).
 *
 * Un admin peut créer/modifier la paie d'un autre membre via `targetUserId`.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PaycheckSchema, type PaycheckInput } from "@/lib/validations";
import { computeNetPaycheck } from "@/lib/calc";
import { requireHouseholdMember } from "@/actions/helpers";
import type { ActionResult } from "@/actions/auth-actions";
import { logAuditAction } from "@/actions/audit-actions";

/**
 * Crée une fiche de paie pour le membre courant (ou `targetUserId` si admin).
 * Calcule automatiquement le `netAmount = grossAmount - vacationDeduction`.
 */
export async function createPaycheck(
  input: PaycheckInput,
  targetUserId?: string // un admin peut saisir pour l'autre
): Promise<ActionResult<{ id: string }>> {
  const { householdId, userId, member: actor } = await requireHouseholdMember();

  const parsed = PaycheckSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { date, grossAmount, vacationDeduction, notes } = parsed.data;

  let netAmount: number;
  try {
    netAmount = computeNetPaycheck(grossAmount, vacationDeduction);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  // Vérifier que targetUserId appartient au même foyer
  const ownerUserId = targetUserId ?? userId;
  if (targetUserId) {
    const targetMember = await prisma.householdMember.findFirst({
      where: { userId: targetUserId, householdId },
    });
    if (!targetMember) {
      return { success: false, error: "Utilisateur non trouvé dans ce foyer." };
    }
  }

  // Parser la date en heure locale pour éviter le décalage UTC (new Date("YYYY-MM-DD") → minuit UTC)
  const [dy, dm, dd] = date.split("-").map(Number);
  const localDate = new Date(dy, dm - 1, dd);

  const paycheck = await prisma.paycheck.create({
    data: {
      householdId,
      userId: ownerUserId,
      date: localDate,
      grossAmount,
      vacationDeduction,
      netAmount,
      notes,
    },
  });

  const monthSlug = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}`;
  const ownerName = (await prisma.householdMember.findFirst({ where: { householdId, userId: ownerUserId }, select: { displayName: true } }))?.displayName ?? "?";
  void logAuditAction(householdId, userId, actor.displayName, "CREATED", "paycheck", paycheck.id, `${ownerName} · ${netAmount.toFixed(2)}$`, monthSlug);

  revalidatePath("/dashboard");
  revalidatePath("/month/[slug]", "page");

  return { success: true, data: { id: paycheck.id } };
}

/** Met à jour une fiche de paie existante. Recalcule le net. */
export async function updatePaycheck(
  paycheckId: string,
  input: PaycheckInput
): Promise<ActionResult> {
  const { householdId, userId, member } = await requireHouseholdMember();

  const parsed = PaycheckSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Vérifier l'appartenance au foyer
  const existing = await prisma.paycheck.findFirst({
    where: { id: paycheckId, householdId },
  });
  if (!existing) {
    return { success: false, error: "Paie introuvable." };
  }

  const { date, grossAmount, vacationDeduction, notes } = parsed.data;

  const [uy, um, ud] = date.split("-").map(Number);
  const localDate = new Date(uy, um - 1, ud);

  let netAmount: number;
  try {
    netAmount = computeNetPaycheck(grossAmount, vacationDeduction);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  await prisma.paycheck.update({
    where: { id: paycheckId },
    data: {
      date: localDate,
      grossAmount,
      vacationDeduction,
      netAmount,
      notes,
    },
  });

  const monthSlug = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}`;
  void logAuditAction(householdId, userId, member.displayName, "UPDATED", "paycheck", paycheckId, `${netAmount.toFixed(2)}$`, monthSlug);

  revalidatePath("/dashboard");
  revalidatePath("/month/[slug]", "page");

  return { success: true, data: undefined };
}

/** Supprime une fiche de paie. Vérifie l'appartenance au foyer. */
export async function deletePaycheck(paycheckId: string): Promise<ActionResult> {
  const { householdId, userId, member } = await requireHouseholdMember();

  const existing = await prisma.paycheck.findFirst({
    where: { id: paycheckId, householdId },
  });
  if (!existing) {
    return { success: false, error: "Paie introuvable." };
  }

  await prisma.paycheck.delete({ where: { id: paycheckId } });

  const monthSlug = `${existing.date.getFullYear()}-${String(existing.date.getMonth() + 1).padStart(2, "0")}`;
  void logAuditAction(householdId, userId, member.displayName, "DELETED", "paycheck", paycheckId, `${existing.netAmount.toFixed ? existing.netAmount.toFixed(2) : existing.netAmount}$`, monthSlug);

  revalidatePath("/dashboard");
  revalidatePath("/month/[slug]", "page");

  return { success: true, data: undefined };
}

/**
 * Crée plusieurs paies en lot (mode bi-hebdomadaire).
 * Toutes les entrées partagent le même targetUserId.
 */
export async function createBiweeklyPaychecks(
  entries: Array<{ date: string; grossAmount: number; vacationDeduction: number; notes?: string }>,
  targetUserId?: string
): Promise<ActionResult<{ count: number }>> {
  const { householdId, userId, member } = await requireHouseholdMember();

  if (entries.length === 0) {
    return { success: false, error: "Aucune paie à créer." };
  }

  const ownerUserId = targetUserId ?? userId;
  if (targetUserId) {
    const targetMember = await prisma.householdMember.findFirst({
      where: { userId: targetUserId, householdId },
    });
    if (!targetMember) {
      return { success: false, error: "Utilisateur non trouvé dans ce foyer." };
    }
  }

  const rows: {
    householdId: string;
    userId: string;
    date: Date;
    grossAmount: number;
    vacationDeduction: number;
    netAmount: number;
    notes?: string;
  }[] = [];

  for (const entry of entries) {
    const parsed = PaycheckSchema.safeParse(entry);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { date, grossAmount, vacationDeduction, notes } = parsed.data;
    let netAmount: number;
    try {
      netAmount = computeNetPaycheck(grossAmount, vacationDeduction);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
    const [dy, dm, dd] = date.split("-").map(Number);
    rows.push({
      householdId,
      userId: ownerUserId,
      date: new Date(dy, dm - 1, dd),
      grossAmount,
      vacationDeduction,
      netAmount,
      notes,
    });
  }

  await prisma.paycheck.createMany({ data: rows });

  const firstRow = rows[0];
  if (firstRow) {
    const mSlug = `${firstRow.date.getFullYear()}-${String(firstRow.date.getMonth() + 1).padStart(2, "0")}`;
    const ownerName = (await prisma.householdMember.findFirst({ where: { householdId, userId: ownerUserId }, select: { displayName: true } }))?.displayName ?? "?";
    void logAuditAction(householdId, userId, member.displayName, "CREATED", "paycheck", ownerUserId, `${ownerName} · ${rows.length} paie(s)`, mSlug);
  }

  revalidatePath("/dashboard");
  revalidatePath("/month/[slug]", "page");

  return { success: true, data: { count: rows.length } };
}
