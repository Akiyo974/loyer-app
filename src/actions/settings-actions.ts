"use server";

/**
 * settings-actions.ts — Server Actions pour la page Paramètres.
 *
 * Chaque action valide ses entrées avant d'écrire en base.
 * Les revalidations `revalidatePath` assurent l'invalidation du cache Next.js
 * sur les pages concernées.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireHouseholdMember } from "@/actions/helpers";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/actions/auth-actions";

/**
 * Met à jour le nom du foyer (2–100 caractères).
 * Revalide le layout pour que le nom apparaisse partout immédiatement.
 */
export async function updateHouseholdName(
  name: string
): Promise<ActionResult> {
  const { householdId } = await requireHouseholdMember();

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { success: false, error: "Le nom doit contenir entre 2 et 100 caractères." };
  }

  await prisma.household.update({
    where: { id: householdId },
    data: { name: trimmed },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/**
 * Met à jour le prénom d'affichage du membre courant (1–50 caractères).
 */
export async function updateDisplayName(
  displayName: string
): Promise<ActionResult> {
  const { householdId, userId } = await requireHouseholdMember();

  const trimmed = displayName.trim();
  if (trimmed.length < 1 || trimmed.length > 50) {
    return { success: false, error: "Le prénom doit contenir entre 1 et 50 caractères." };
  }

  await prisma.householdMember.update({
    where: { householdId_userId: { householdId, userId } },
    data: { displayName: trimmed },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/**
 * Définit l'objectif d'épargne mensuel du membre courant (0–99 999 $).
 * Revalide toutes les pages mois pour recalculer le "reste libre".
 */
export async function updateSavingsGoal(
  goal: number
): Promise<ActionResult> {
  const { householdId, userId } = await requireHouseholdMember();

  if (isNaN(goal) || goal < 0 || goal > 99999) {
    return { success: false, error: "Montant invalide (0 – 99 999 $)." };
  }

  await prisma.householdMember.update({
    where: { householdId_userId: { householdId, userId } },
    data: { savingsGoal: goal },
  });

  revalidatePath("/settings");
  revalidatePath("/month/[slug]", "page");
  return { success: true, data: undefined };
}

/**
 * Change le mot de passe de l'utilisateur courant.
 * Vérifie le mot de passe actuel avec bcrypt avant de hacher le nouveau.
 * Minimum 6 caractères pour le nouveau mot de passe.
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non authentifié." };

  if (newPassword.length < 6) {
    return { success: false, error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return { success: false, error: "Aucun mot de passe défini pour ce compte." };
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return { success: false, error: "Mot de passe actuel incorrect." };
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true, data: undefined };
}

/**
 * Change le mode de budgétisation du foyer.
 * "CURRENT"  → revenus et dépenses du même mois (mode classique)
 * "SHIFTED"  → les dépenses du mois N sont financées par les revenus du mois N-1
 */
export async function updateBudgetMode(
  mode: "CURRENT" | "SHIFTED"
): Promise<ActionResult> {
  const { householdId } = await requireHouseholdMember();

  if (mode !== "CURRENT" && mode !== "SHIFTED") {
    return { success: false, error: "Mode invalide." };
  }

  await prisma.household.update({
    where: { id: householdId },
    data: { budgetMode: mode },
  });

  revalidatePath("/settings");
  revalidatePath("/month/[slug]", "page");
  return { success: true, data: undefined };
}
