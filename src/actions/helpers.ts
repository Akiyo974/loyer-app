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

/**
 * Retourne la session + le membre du foyer courant.
 * Redirige vers /login si non authentifié.
 * Redirige vers /onboarding si pas encore dans un foyer.
 */
export async function requireHouseholdMember() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const member = await prisma.householdMember.findUnique({
    where: { userId: session.user.id },
    include: { household: true },
  });

  if (!member) {
    redirect("/onboarding");
  }

  return { session, member, householdId: member.householdId, userId: session.user.id };
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
