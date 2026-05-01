"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Persiste le foyer actif dans un cookie httpOnly d'1 an. */
async function setActiveHouseholdCookie(householdId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active-household", householdId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Bascule vers un foyer appartenant à l'utilisateur connecté.
 * Redirige vers /dashboard après la mise à jour du cookie.
 */
export async function switchHousehold(householdId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Vérifier que l'utilisateur est bien membre de ce foyer
  const member = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId: session.user.id } },
    select: { id: true },
  });
  if (!member) return; // Tentative invalide, on ignore silencieusement

  await setActiveHouseholdCookie(householdId);
  redirect("/dashboard");
}

/**
 * Crée un nouveau foyer et y inscrit l'utilisateur connecté en tant qu'ADMIN.
 * Le foyer devient automatiquement le foyer actif.
 */
export async function createNewHousehold(
  name: string,
  displayName: string
): Promise<ActionResult<{ householdId: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non authentifié." };

  const trimmedName = name.trim();
  if (trimmedName.length < 2)
    return { success: false, error: "Le nom doit contenir au moins 2 caractères." };

  const trimmedDisplay = displayName.trim() || (session.user.name ?? "Moi");

  const household = await prisma.household.create({ data: { name: trimmedName } });
  await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: session.user.id,
      role: "ADMIN",
      displayName: trimmedDisplay,
    },
  });

  await setActiveHouseholdCookie(household.id);
  revalidatePath("/dashboard");

  return { success: true, data: { householdId: household.id } };
}

/**
 * Rejoint un foyer existant via son ID (code d'invitation).
 * Le foyer devient automatiquement le foyer actif.
 */
export async function joinExistingHousehold(
  inviteCode: string,
  displayName: string
): Promise<ActionResult<{ householdId: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non authentifié." };

  const household = await prisma.household.findUnique({
    where: { id: inviteCode.trim() },
    include: { members: true },
  });

  if (!household) return { success: false, error: "Code d'invitation invalide." };
  if (household.members.length >= 2)
    return { success: false, error: "Ce foyer est déjà complet (2 membres max)." };

  // Déjà membre ?
  const existing = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId: household.id, userId: session.user.id } },
    select: { id: true },
  });
  if (existing) return { success: false, error: "Vous êtes déjà membre de ce foyer." };

  const trimmedDisplay = displayName.trim() || (session.user.name ?? "Moi");

  await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: session.user.id,
      role: "MEMBER",
      displayName: trimmedDisplay,
    },
  });

  await setActiveHouseholdCookie(household.id);
  revalidatePath("/dashboard");

  return { success: true, data: { householdId: household.id } };
}
