/**
 * validations.ts — Schémas Zod de validation des formulaires.
 *
 * Chaque schéma est utilisé à la fois côté client (formulaires React Hook Form)
 * et côté serveur (Server Actions) pour garantir la cohérence des données.
 */

import { z } from "zod";

// ---- Auth ----
export const RegisterSchema = z
  .object({
    name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
    email: z.string().email("Email invalide."),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z.string(),
    householdName: z
      .string()
      .min(2, "Le nom du foyer doit contenir au moins 2 caractères.")
      .optional(),
    inviteCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ---- Paycheck ----
export const PaycheckSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)."),
    grossAmount: z
      .number({ invalid_type_error: "Montant brut requis." })
      .positive("Le montant brut doit être positif."),
    vacationDeduction: z
      .number({ invalid_type_error: "La déduction doit être un nombre." })
      .min(0, "La déduction ne peut être négative.")
      .default(0),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.vacationDeduction <= data.grossAmount, {
    message: "La déduction vacances ne peut dépasser le montant brut.",
    path: ["vacationDeduction"],
  });

export type PaycheckInput = z.infer<typeof PaycheckSchema>;

// ---- Expense ----
export const CategoryEnum = z.enum([
  "LOYER",
  "ELECTRICITE",
  "INTERNET",
  "ASSURANCE",
  "ASSURANCE_LOGEMENT",
  "ASSURANCE_AUTO",
  "EPICERIE",
  "TRANSPORT",
  "SANTE",
  "LOISIRS",
  "AUTRE",
]);

export const ExpenseTypeEnum = z.enum(["FIXED", "VARIABLE"]);

export const ExpenseSchema = z.object({
  category: CategoryEnum,
  label: z.string().min(1, "Le libellé est requis.").max(200),
  amount: z
    .number({ invalid_type_error: "Le montant est requis." })
    .positive("Le montant doit être positif."),
  type: ExpenseTypeEnum,
  paidById: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type ExpenseInput = z.infer<typeof ExpenseSchema>;

// ---- Deposit ----
export const DepositSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)."),
  amount: z
    .number({ invalid_type_error: "Le montant est requis." })
    .positive("Le montant doit être positif."),
  notes: z.string().max(500).optional(),
});

export type DepositInput = z.infer<typeof DepositSchema>;

// ---- Household ----
export const HouseholdSchema = z.object({
  name: z.string().min(2, "Nom du foyer requis.").max(100),
});

export type HouseholdInput = z.infer<typeof HouseholdSchema>;

// Labels lisibles
export const CATEGORY_LABELS: Record<string, string> = {
  LOYER: "Loyer",
  ELECTRICITE: "Électricité",
  INTERNET: "Internet",
  ASSURANCE: "Assurance (autre)",
  ASSURANCE_LOGEMENT: "Assurance logement",
  ASSURANCE_AUTO: "Assurance auto",
  EPICERIE: "Épicerie",
  TRANSPORT: "Transport",
  SANTE: "Santé",
  LOISIRS: "Loisirs",
  AUTRE: "Autre",
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  FIXED: "Fixe mensuel",
  VARIABLE: "Variable",
};
