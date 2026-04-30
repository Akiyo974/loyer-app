/**
 * calc.ts — Fonctions PURES de calcul de répartition équitable.
 * Aucune dépendance externe : 100% testables en isolation.
 */

export interface MemberRevenue {
  userId: string;
  displayName: string;
  netMonthlyIncome: number; // somme des paies nettes du mois
}

export interface ContributionResult {
  userId: string;
  displayName: string;
  netMonthlyIncome: number;
  share: number; // 0..1
  expectedContribution: number;
  remainingAfterContribution: number;
}

export interface MonthSummary {
  totalExpenses: number;
  totalRevenues: number;
  contributions: ContributionResult[];
  warning: string | null; // ex: revenus = 0 => fallback 50/50
}

/**
 * Calcule la répartition équitable au prorata des revenus nets.
 *
 * @param members        - Tableau des membres avec leur revenu net mensuel
 * @param totalExpenses  - Total des dépenses foyer du mois
 */
export function computeMonthSummary(
  members: MemberRevenue[],
  totalExpenses: number
): MonthSummary {
  const totalRevenues = members.reduce((sum, m) => sum + m.netMonthlyIncome, 0);

  let warning: string | null = null;

  const contributions: ContributionResult[] = members.map((member) => {
    let share: number;

    if (totalRevenues === 0) {
      // Fallback 50/50 si revenus totaux = 0
      share = members.length > 0 ? 1 / members.length : 0;
      warning =
        "⚠️ Revenus totaux = 0 € — répartition 50/50 appliquée par défaut.";
    } else {
      share = member.netMonthlyIncome / totalRevenues;
    }

    const expectedContribution = totalExpenses * share;
    const remainingAfterContribution =
      member.netMonthlyIncome - expectedContribution;

    return {
      userId: member.userId,
      displayName: member.displayName,
      netMonthlyIncome: member.netMonthlyIncome,
      share,
      expectedContribution,
      remainingAfterContribution,
    };
  });

  return {
    totalExpenses,
    totalRevenues,
    contributions,
    warning,
  };
}

/**
 * Calcule le solde paiement d'une personne.
 * +  => trop payé (crédit)
 * -  => reste à payer (débit)
 */
export function computePaymentBalance(
  deposited: number,
  expectedContribution: number
): number {
  return deposited - expectedContribution;
}

/**
 * Calcule le revenu net d'une paie :
 * netAmount = grossAmount - vacationDeduction
 */
export function computeNetPaycheck(
  grossAmount: number,
  vacationDeduction: number
): number {
  if (vacationDeduction < 0) throw new Error("La déduction ne peut être négative.");
  if (vacationDeduction > grossAmount)
    throw new Error("La déduction ne peut dépasser le brut.");
  return grossAmount - vacationDeduction;
}

/**
 * Formate un nombre en devise CAD (fr-CA) sans Intl pour éviter les
 * différences de sortie entre Node.js (SSR) et le navigateur (hydration).
 * Format : 1 234,56 $
 */
export function formatCurrency(amount: number): string {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const [intStr, decStr] = abs.toFixed(2).split(".");
  const withSep = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const formatted = `${withSep},${decStr}\u00a0$`;
  return neg ? `\u2212${formatted}` : formatted;
}

/**
 * Formate un pourcentage (fr-CA) sans Intl.
 * Format : 43,4 %
 */
export function formatPercent(share: number): string {
  const pct = (share * 100).toFixed(1).replace(".", ",");
  return `${pct}\u00a0%`;
}
