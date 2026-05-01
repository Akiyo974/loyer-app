/**
 * active-household.ts — Utilitaire pour résoudre le foyer actif d'un utilisateur.
 *
 * Lit le cookie "active-household". Si absent ou invalide, retourne
 * le premier foyer de l'utilisateur (ordre de création).
 *
 * Utilisé dans les Server Components (layout, settings) et dans helpers.ts.
 */

import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getActiveHouseholdId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const storedId = cookieStore.get("active-household")?.value;

  if (storedId) {
    const member = await prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId: storedId, userId } },
      select: { householdId: true },
    });
    if (member) return storedId;
  }

  // Fallback : premier foyer de l'utilisateur
  const first = await prisma.householdMember.findFirst({
    where: { userId },
    select: { householdId: true },
    orderBy: { createdAt: "asc" },
  });
  return first?.householdId ?? null;
}
