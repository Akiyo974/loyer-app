/**
 * types.ts — Interfaces TypeScript enrichies pour les pages.
 *
 * Ces types sont distincts des modèles Prisma : ils représentent des données
 * déjà transformées et enrichies (Decimal → number, joins résolus,
 * agrégats calculés inclus).
 */

import type { Decimal } from "@prisma/client/runtime/library";

// ---- Helpers Decimal Prisma -> number ----
export function toNumber(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return d.toNumber();
}

// ---- Types enrichis pour les pages ----
export interface MemberInfo {
  userId: string;
  displayName: string;
}

export interface PaycheckRow {
  id: string;
  userId: string;
  displayName: string;
  date: string; // ISO
  grossAmount: number;
  vacationDeduction: number;
  netAmount: number;
  notes?: string | null;
}

export interface ExpenseRow {
  id: string;
  category: string;
  label: string;
  amount: number;
  type: string;
  paidById?: string | null;
  paidByName?: string | null;
  notes?: string | null;
}

export interface DepositRow {
  id: string;
  userId: string;
  displayName: string;
  date: string; // ISO
  amount: number;
  notes?: string | null;
}

export interface MemberContribution {
  userId: string;
  displayName: string;
  netMonthlyIncome: number;
  share: number;
  expectedContribution: number;
  remainingAfterContribution: number;
  savingsGoal: number;          // objectif d'épargne mensuel
  remainingAfterSavings: number; // revenus - contribution - épargne
  totalDeposited: number;
  paymentBalance: number; // > 0 = trop payé, < 0 = reste à payer
}

export interface MonthData {
  slug: string; // YYYY-MM
  year: number;
  month: number;
  monthId: string | null;
  budgetMode: "CURRENT" | "SHIFTED";
  incomeSlug: string;  // slug du mois dont les revenus sont utilisés
  members: MemberInfo[];
  paychecks: PaycheckRow[];
  expenses: ExpenseRow[];
  deposits: DepositRow[];
  // Agrégats calculés
  totalExpenses: number;
  totalRevenues: number;
  contributions: MemberContribution[];
  warning: string | null;
}
