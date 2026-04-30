import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retourne un slug YYYY-MM à partir d'une date.
 */
export function toMonthSlug(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Parse un slug YYYY-MM en { year, month }
 */
export function parseMonthSlug(slug: string): { year: number; month: number } {
  const [y, m] = slug.split("-");
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Slug de mois invalide : ${slug}`);
  }
  return { year, month };
}

/**
 * Retourne le slug du mois courant.
 */
export function currentMonthSlug(): string {
  const now = new Date();
  return toMonthSlug(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Formate un YYYY-MM en "Mai 2026" (fr-CA).
 */
export function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy", { locale: fr });
}

/**
 * Formate une date ISO en "8 mai 2026" (fr-CA).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "d MMMM yyyy", { locale: fr });
}

/**
 * Retourne le slug du mois précédent.
 */
export function prevMonthSlug(slug: string): string {
  const { year, month } = parseMonthSlug(slug);
  if (month === 1) return toMonthSlug(year - 1, 12);
  return toMonthSlug(year, month - 1);
}

/**
 * Retourne le slug du mois suivant.
 */
export function nextMonthSlug(slug: string): string {
  const { year, month } = parseMonthSlug(slug);
  if (month === 12) return toMonthSlug(year + 1, 1);
  return toMonthSlug(year, month + 1);
}
