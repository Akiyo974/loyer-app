"use server";

/**
 * helpers.ts — Utilitaires partagés entre les Server Actions.
 *
 * Ces fonctions factorisent l'authentification (guard) et les opérations
 * récurrentes sur la base de données (upsert Month).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getActiveHouseholdId } from "@/lib/active-household";

/**
 * Retourne la session + le membre du foyer actif.
 * Le foyer actif est lu depuis le cookie "active-household" ;
 * si absent ou invalide, le premier foyer de l'utilisateur est utilisé.
 * Redirige vers /login si non authentifié.
 * Redirige vers /onboarding si l'utilisateur n'appartient à aucun foyer.
 */
export async function requireHouseholdMember() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const householdId = await getActiveHouseholdId(userId);

  if (!householdId) {
    redirect("/onboarding");
  }

  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId } },
    include: { household: true },
  });

  if (!member) {
    redirect("/onboarding");
  }

  return { session, member, householdId, userId };
}

/**
 * Retourne ou crée un mois pour un foyer donné.
 */
export async function getOrCreateMonth(householdId: string, year: number, month: number) {
  return prisma.month.upsert({
    where: { householdId_year_month: { householdId, year, month } },
    create: { householdId, year, month },
    update: {},
  });
}
