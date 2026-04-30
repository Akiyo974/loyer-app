/**
 * prisma.ts — Instance singleton du client Prisma.
 *
 * En développement, Next.js recharge les modules à chaque modification (HMR).
 * Ce patron singleton évite la création d'une nouvelle connexion à chaque
 * rechargement, ce qui épuiserait les connexions disponibles en SQLite.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
