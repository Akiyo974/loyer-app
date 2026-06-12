"use server";

import { prisma } from "@/lib/prisma";
import { requireHouseholdMember } from "@/actions/helpers";

export type AuditAction = "CREATED" | "UPDATED" | "DELETED";
export type AuditEntityType = "expense" | "paycheck" | "deposit";

export interface AuditLogRow {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  label: string;
  monthSlug: string | null;
  createdAt: Date;
}

/** Enregistre une action (fire-and-forget — ne bloque jamais l'opération principale). */
export async function logAuditAction(
  householdId: string,
  userId: string,
  userName: string,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  label: string,
  monthSlug?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        householdId,
        userId,
        userName,
        action,
        entityType,
        entityId,
        label,
        monthSlug: monthSlug ?? null,
      },
    });
  } catch {
    // Ne pas bloquer l'opération principale si le log échoue
  }
}

/** Récupère les derniers logs du foyer courant (tous mois confondus). */
export async function getAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const { householdId } = await requireHouseholdMember();
  const rows = await prisma.auditLog.findMany({
    where: { householdId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows as AuditLogRow[];
}

/** Récupère les logs filtrés pour un mois donné. */
export async function getAuditLogsForMonth(monthSlug: string): Promise<AuditLogRow[]> {
  const { householdId } = await requireHouseholdMember();
  const rows = await prisma.auditLog.findMany({
    where: { householdId, monthSlug },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows as AuditLogRow[];
}
