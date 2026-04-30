import { describe, it, expect } from "vitest";
import {
  computeMonthSummary,
  computePaymentBalance,
  computeNetPaycheck,
  formatCurrency,
  formatPercent,
  type MemberRevenue,
} from "@/lib/calc";

// ---- computeNetPaycheck ----
describe("computeNetPaycheck", () => {
  it("retourne grossAmount - vacationDeduction", () => {
    expect(computeNetPaycheck(2200, 110)).toBe(2090);
  });

  it("retourne grossAmount si déduction = 0", () => {
    expect(computeNetPaycheck(2800, 0)).toBe(2800);
  });

  it("retourne 0 si déduction = grossAmount", () => {
    expect(computeNetPaycheck(1000, 1000)).toBe(0);
  });

  it("lève une erreur si déduction négative", () => {
    expect(() => computeNetPaycheck(1000, -50)).toThrow();
  });

  it("lève une erreur si déduction > brut", () => {
    expect(() => computeNetPaycheck(1000, 1100)).toThrow();
  });
});

// ---- computeMonthSummary ----
describe("computeMonthSummary", () => {
  const memberA: MemberRevenue = {
    userId: "userA",
    displayName: "Marie",
    netMonthlyIncome: 4290, // 2090 + 2200
  };
  const memberB: MemberRevenue = {
    userId: "userB",
    displayName: "Jean",
    netMonthlyIncome: 5600, // 2800 + 2800
  };

  it("calcule les parts correctement", () => {
    const result = computeMonthSummary([memberA, memberB], 1840);
    const totalIncome = 4290 + 5600; // 9890

    expect(result.totalRevenues).toBe(9890);
    expect(result.totalExpenses).toBe(1840);
    expect(result.warning).toBeNull();

    const contribA = result.contributions.find((c) => c.userId === "userA")!;
    const contribB = result.contributions.find((c) => c.userId === "userB")!;

    // Part de Marie = 4290 / 9890 ≈ 0.4338
    expect(contribA.share).toBeCloseTo(4290 / 9890, 5);
    // Part de Jean  = 5600 / 9890 ≈ 0.5662
    expect(contribB.share).toBeCloseTo(5600 / 9890, 5);

    // Les deux parts doivent sommer à 1
    expect(contribA.share + contribB.share).toBeCloseTo(1, 5);

    // Contribution attendue Marie
    expect(contribA.expectedContribution).toBeCloseTo(1840 * (4290 / 9890), 2);
    // Contribution attendue Jean
    expect(contribB.expectedContribution).toBeCloseTo(1840 * (5600 / 9890), 2);

    // Somme des contributions = total dépenses
    expect(contribA.expectedContribution + contribB.expectedContribution).toBeCloseTo(1840, 2);
  });

  it("calcule le reste après contribution", () => {
    const result = computeMonthSummary([memberA, memberB], 1840);
    const contribA = result.contributions.find((c) => c.userId === "userA")!;

    expect(contribA.remainingAfterContribution).toBeCloseTo(
      memberA.netMonthlyIncome - contribA.expectedContribution,
      2
    );
  });

  it("fallback 50/50 si revenus = 0 et affiche warning", () => {
    const members: MemberRevenue[] = [
      { userId: "userA", displayName: "A", netMonthlyIncome: 0 },
      { userId: "userB", displayName: "B", netMonthlyIncome: 0 },
    ];
    const result = computeMonthSummary(members, 1000);

    expect(result.warning).not.toBeNull();
    result.contributions.forEach((c) => {
      expect(c.share).toBeCloseTo(0.5, 5);
      expect(c.expectedContribution).toBeCloseTo(500, 2);
    });
  });

  it("si dépenses = 0, contributions = 0", () => {
    const result = computeMonthSummary([memberA, memberB], 0);
    result.contributions.forEach((c) => {
      expect(c.expectedContribution).toBe(0);
    });
  });

  it("gère un seul membre (100%)", () => {
    const result = computeMonthSummary([memberA], 1000);
    const c = result.contributions[0];
    expect(c.share).toBe(1);
    expect(c.expectedContribution).toBe(1000);
  });

  it("total des contributions = total des dépenses (invariant)", () => {
    const result = computeMonthSummary([memberA, memberB], 1840);
    const total = result.contributions.reduce((s, c) => s + c.expectedContribution, 0);
    expect(total).toBeCloseTo(1840, 2);
  });
});

// ---- computePaymentBalance ----
describe("computePaymentBalance", () => {
  it("retourne un solde positif si trop payé", () => {
    expect(computePaymentBalance(900, 800)).toBeCloseTo(100, 2);
  });

  it("retourne un solde négatif si reste à payer", () => {
    expect(computePaymentBalance(400, 800)).toBeCloseTo(-400, 2);
  });

  it("retourne 0 si exactement payé", () => {
    expect(computePaymentBalance(800, 800)).toBe(0);
  });
});

// ---- formatCurrency ----
describe("formatCurrency", () => {
  it("formate correctement en CAD", () => {
    const result = formatCurrency(1234.5);
    expect(result).toContain("1");
    expect(result).toContain("234");
    // Le symbole peut varier selon l'env mais le chiffre doit être présent
  });
});

// ---- formatPercent ----
describe("formatPercent", () => {
  it("formate un pourcentage", () => {
    const result = formatPercent(0.4338);
    expect(result).toContain("43");
  });
});
