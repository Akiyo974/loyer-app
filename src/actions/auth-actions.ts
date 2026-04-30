"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RegisterSchema, type RegisterInput } from "@/lib/validations";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function registerUser(
  input: RegisterInput
): Promise<ActionResult<{ userId: string }>> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
    };
  }

  const { name, email, password, householdName, inviteCode } = parsed.data;

  // Vérifier si l'email existe déjà
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Cet email est déjà utilisé." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  if (inviteCode) {
    // Mode invitation : rejoindre un foyer existant
    const household = await prisma.household.findUnique({
      where: { id: inviteCode },
      include: { members: true },
    });

    if (!household) {
      return { success: false, error: "Code d'invitation invalide." };
    }

    if (household.members.length >= 2) {
      return { success: false, error: "Ce foyer est déjà complet (2 membres max)." };
    }

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: user.id,
        role: "MEMBER",
        displayName: name ?? email,
      },
    });

    return { success: true, data: { userId: user.id } };
  }

  // Mode création : nouveau foyer
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const household = await prisma.household.create({
    data: { name: householdName ?? "Notre foyer" },
  });

  await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: user.id,
      role: "ADMIN",
      displayName: name ?? email,
    },
  });

  return { success: true, data: { userId: user.id } };
}

export async function loginUser(email: string, password: string): Promise<ActionResult> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Email ou mot de passe incorrect." };
    }
    throw error;
  }
}

export async function logoutUser() {
  await signOut({ redirectTo: "/login" });
}
