# Loyer — Gestion des dépenses en couple

Application web pour répartir **équitablement** (au prorata des revenus nets) les dépenses d'un foyer partagé.

## Stack

| Couche | Techno |
|---|---|
| Framework | Next.js 15.0.3 (App Router) + TypeScript strict |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| Auth | NextAuth v5 (credentials email/password, bcryptjs) |
| BDD | **SQLite** + Prisma 5.22.0 |
| Validation | Zod |
| Tests | Vitest (22 tests) |

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env
# Renseigner DATABASE_URL=file:./dev.db et NEXTAUTH_SECRET

# 3. Appliquer les migrations et générer le client Prisma
npx prisma migrate dev

# 4. Lancer en développement
npm run dev
# → http://localhost:3000
```

> **Important** : Si vous modifiez `prisma/schema.prisma`, arrêtez le serveur dev avant de lancer `npx prisma generate`, car le fichier binaire Prisma est verrouillé par Node.js.

## Concepts clés

### Répartition équitable au prorata

La répartition **n'est pas égalitaire** (50/50) mais **au prorata des revenus nets** :

```
Part(membre)              = RevenuNetMensuel(membre) / SommeRevenus
ContributionAttendue      = TotalDépensesCommunes × Part
ResteAprèsContribution    = RevenuNetMensuel - ContributionAttendue
ResteLibre                = ResteAprèsContribution - ObjectifÉpargne
```

Si les revenus totaux = 0 → fallback 50/50 avec avertissement.

### Revenu net d'une paie

```
Net = Brut - DéductionVacances
```

La déduction vacances non payées permet de refléter les semaines non rémunérées.

### Solde paiement

```
SoldePaiement = TotalDépôts - ContributionAttendue
  > 0 = trop payé (crédit)
  < 0 = reste à payer
```

### Objectif d'épargne

Chaque membre peut définir un objectif mensuel (`savingsGoal`). Le **reste libre** est calculé après soustraction de cette épargne visée et affiché en vert (atteint) ou rouge (dépassé).

## Architecture du projet

```
src/
├── actions/                 # Server Actions ("use server")
│   ├── helpers.ts               # requireHouseholdMember(), getOrCreateMonth()
│   ├── auth-actions.ts          # register(), login()
│   ├── paycheck-actions.ts      # createPaycheck(), updatePaycheck(), deletePaycheck()
│   ├── expense-actions.ts       # createExpense(), updateExpense(), deleteExpense()
│   ├── deposit-actions.ts       # createDeposit(), updateDeposit(), deleteDeposit()
│   ├── month-actions.ts         # getMonthData(), getAvailableMonths()
│   └── settings-actions.ts      # updateHouseholdName(), updateDisplayName(),
│                                #   updateSavingsGoal(), updatePassword()
├── app/
│   ├── (auth)/                  # /login, /register
│   ├── (app)/                   # Layout protégé (middleware)
│   │   ├── dashboard/
│   │   ├── month/[slug]/        # slug = YYYY-MM
│   │   └── settings/
│   └── onboarding/
├── components/
│   ├── layout/                  # Navbar, Sidebar
│   ├── month/                   # PaychecksTab, ExpensesTab, DepositsTab, SummaryCard
│   └── settings/                # HouseholdNameForm, ProfileForm, InviteSection
├── lib/
│   ├── calc.ts                  # Fonctions pures de calcul (testées)
│   ├── types.ts                 # Interfaces enrichies (MonthData, MemberContribution…)
│   ├── utils.ts                 # cn(), parseMonthSlug(), formatMonthLabel()…
│   ├── validations.ts           # Schémas Zod
│   ├── prisma.ts                # Instance Prisma singleton
│   └── auth.ts                  # Configuration NextAuth v5
├── middleware.ts                # Protection des routes /(app)/*
└── test/
    ├── calc.test.ts
    └── utils.test.ts

prisma/
├── schema.prisma
└── migrations/
    ├── 20261101_init/
    └── 20260302030550_add_savings_goal/
```

## Modèle de données

```
User ──────────── HouseholdMember ──────── Household
 │                  (role, displayName,      │
 │                   savingsGoal)            │
 ├── Paycheck                            ───┼── Month
 ├── Deposit                             │  │     └── Expense
 └── Expense (paidBy)                   Deposit   └── Deposit
```

### Champs notables

| Modèle | Champ | Description |
|--------|-------|-------------|
| `HouseholdMember` | `savingsGoal` | Objectif d'épargne mensuel (Float, défaut 0) |
| `Paycheck` | `vacationDeduction` | Déduction semaines non payées |
| `Paycheck` | `netAmount` | Calculé : `gross - vacation` |
| `Expense` | `type` | `FIXED` ou `VARIABLE` |
| `Expense` | `category` | `LOYER`, `ELECTRICITE`, `INTERNET`, `ASSURANCE`, `ASSURANCE_LOGEMENT`, `ASSURANCE_AUTO`, `EPICERIE`, `TRANSPORT`, `SANTE`, `LOISIRS`, `AUTRE` |
| `Month` | — | Créé automatiquement à la première visite de la page mois |

## Server Actions

Toutes les actions vérifient l'appartenance au foyer via `requireHouseholdMember()` avant d'agir en base.

### `settings-actions.ts`

| Fonction | Validation | Revalidation |
|----------|-----------|--------------|
| `updateHouseholdName(name)` | 2–100 chars | `/settings`, `/` layout |
| `updateDisplayName(displayName)` | 1–50 chars | `/settings`, `/` layout |
| `updateSavingsGoal(goal)` | 0–99 999 | `/settings`, pages mois |
| `updatePassword(current, new)` | bcrypt verify + min 6 chars nouveau | — |

### `month-actions.ts` — `getMonthData(slug)`

Fonction principale qui assemble tout le `MonthData` :
1. Charge les membres du foyer (avec `savingsGoal`)
2. Upsert le `Month`
3. Charge les paies/dépenses/dépôts du mois
4. Appelle `computeMonthSummary()` pour les contributions
5. Enrichit chaque contribution avec `totalDeposited`, `paymentBalance`, `savingsGoal`, `remainingAfterSavings`

## Composants clés

### `SummaryCard`
Affiche par membre :
- Revenu net, part %, contribution attendue, total déposé, solde (couleur)
- Reste après contribution
- Objectif épargne (bleu) + Reste libre (vert/rouge) – masqué si objectif = 0

### `PaychecksTab`
- Saisie manuelle ou **génération biweekly** : chaque date générée possède son propre champ "Brut $" (`biGrosses: Record<string, string>`) car le salaire varie d'une quinzaine à l'autre.

### `ExpensesTab`
- **5 prédéfinis** (Électricité, WiFi, Épicerie, Assur. logement, Assur. auto) — cliquables dans le formulaire d'ajout
- Panel **"Analyse du mois"** : répartition fixe/variable, barres par catégorie, explication de contribution par membre

### `HouseholdNameForm` / `ProfileForm`
Édition **inline** (clic → champ → Entrée/Échap/✓/✗). Pas de page dédiée, tout se fait dans `/settings`.

## Tests

```bash
npx vitest run      # 22 tests, 0 échec
npx tsc --noEmit    # 0 erreur TypeScript
```

Couverture : `calc.ts` (prorata, fallback 50/50, formatage monétaire) + `utils.ts` (slugs, dates).

## Décisions techniques

### Formatage monétaire sans `Intl`
`Intl.NumberFormat('fr-CA')` produit des caractères d'espacement différents entre Node.js (SSR) et le navigateur (versions ICU divergentes), causant des erreurs d'hydratation React. `formatCurrency` et `formatPercent` sont réécrites manuellement (`"1\u00a0234,56\u00a0$"`) pour garantir une sortie bit-à-bit identique.

### Radix `Select` et valeur vide
`<SelectItem value="">` plante Radix UI. Le champ "Payé par" utilise la valeur sentinelle `"none"` convertie en `""` dans le handler `onValueChange` (`v === "none" ? "" : v`).

### Date locale pour les paies
`new Date("YYYY-MM-DD")` → minuit UTC → décalage d'un jour en affichage local. Les paies utilisent `new Date(year, month-1, day)` (constructeur heure locale).

### `prisma generate` après migration
Après `prisma migrate dev`, si le serveur dev tourne, le fichier `.dll.node` est verrouillé. Procédure :
```bash
# Arrêter le serveur, puis :
npx prisma generate
npm run dev
```

### `suppressHydrationWarning`
Ajouté sur `<html>` et `<body>` dans `layout.tsx` pour supprimer les avertissements d'hydratation causés par les extensions navigateur qui modifient le DOM avant l'hydratation React.
