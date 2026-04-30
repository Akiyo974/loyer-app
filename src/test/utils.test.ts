import { describe, it, expect } from "vitest";
import {
  toMonthSlug,
  parseMonthSlug,
  prevMonthSlug,
  nextMonthSlug,
  formatMonthLabel,
} from "@/lib/utils";

describe("toMonthSlug", () => {
  it("formate correctement (mois à 2 chiffres)", () => {
    expect(toMonthSlug(2026, 5)).toBe("2026-05");
    expect(toMonthSlug(2026, 12)).toBe("2026-12");
    expect(toMonthSlug(2026, 1)).toBe("2026-01");
  });
});

describe("parseMonthSlug", () => {
  it("parse un slug valide", () => {
    expect(parseMonthSlug("2026-05")).toEqual({ year: 2026, month: 5 });
    expect(parseMonthSlug("2026-12")).toEqual({ year: 2026, month: 12 });
  });

  it("lève une erreur sur slug invalide", () => {
    expect(() => parseMonthSlug("2026-13")).toThrow();
    expect(() => parseMonthSlug("foo-bar")).toThrow();
    expect(() => parseMonthSlug("2026-00")).toThrow();
  });
});

describe("prevMonthSlug", () => {
  it("retourne le mois précédent", () => {
    expect(prevMonthSlug("2026-05")).toBe("2026-04");
    expect(prevMonthSlug("2026-01")).toBe("2025-12");
  });
});

describe("nextMonthSlug", () => {
  it("retourne le mois suivant", () => {
    expect(nextMonthSlug("2026-05")).toBe("2026-06");
    expect(nextMonthSlug("2026-12")).toBe("2027-01");
  });
});

describe("formatMonthLabel", () => {
  it("retourne une chaîne contenant l'année et un mois lisible", () => {
    const label = formatMonthLabel(2026, 5);
    expect(label).toContain("2026");
    expect(label.toLowerCase()).toContain("mai");
  });
});
