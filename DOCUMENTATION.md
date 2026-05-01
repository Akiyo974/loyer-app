# Documentation — Loyer App

Application web de gestion de budget en foyer partagé. Répartit les dépenses communes **au prorata des revenus nets** de chaque membre.

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Démarrage rapide](#démarrage-rapide)
3. [Variables d'environnement](#variables-denvironnement)
4. [Architecture du projet](#architecture-du-projet)
5. [Modèle de données](#modèle-de-données)
6. [Concepts métier](#concepts-métier)
7. [Server Actions](#server-actions)
8. [Composants clés](#composants-clés)
9. [Routes & Navigation](#routes--navigation)
10. [Authentification](#authentification)
11. [Modes de budgétisation](#modes-de-budgétisation)
12. [Tests](#tests)
13. [Déploiement](#déploiement)
14. [Décisions techniques](#décisions-techniques)
15. [Scripts npm](#scripts-npm)

---

## Stack technique

| Couche       | Technologie                                              |
|--------------|----------------------------------------------------------|
| Framework    | **Next.js 16.2.4** — App Router, TypeScript strict       |
| UI           | **Tailwind CSS** + **shadcn/ui** (Radix UI primitives)   |
| Icônes       | **lucide-react**                                         |
| Graphiques   | **Recharts**                                             |
| Auth         | **NextAuth v5** (beta) — credentials email/mot de passe  |
| Hashage      | **bcryptjs** (12 rounds)                                 |
| BDD          | **PostgreSQL** via **Neon** (serverless)                 |
| ORM          | **Prisma 5.22.0** (pooler + directUrl)                   |
| Validation   | **Zod**                                                  |
| Dates        | **date-fns v4** (locale fr)                              |
| Tests unit.  | **Vitest** + Testing Library                             |
| Tests E2E    | **Playwright**                                           |
| Déploiement  | **Vercel** (prod) · **Docker** (self-hosted)             |

---

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone https://github.com/Akiyo974/loyer-app.git
cd loyer-app
npm install

# 2. Variables d'environnement
cp .env.example .env.local
# Renseigner DATABASE_URL, DIRECT_URL, NEXTAUTH_URL, AUTH_SECRET

# 3. Appliquer les migrations Prisma
npx prisma migrate deploy

# 4. (Optionnel) Ouvrir Prisma Studio
npx prisma studio

# 5. Lancer le serveur de développement
npm run dev
# → http://localhost:3000
```

> **Important :** Si le serveur dev tourne, arrêtez-le avant de lancer `npx prisma generate`
> car le fichier binaire Prisma (`query_engine-windows.dll.node`) est verrouillé par Node.js.

---

## Variables d'environnement

| Variable       | Description                                          | Exemple                                 |
|----------------|------------------------------------------------------|-----------------------------------------|
| `DATABASE_URL`  | URL Neon **avec pooler** (connexions poolées)        | `postgresql://user:pass@host-pooler/db?sslmode=require` |
| `DIRECT_URL`    | URL Neon **directe** (pour les migrations Prisma)    | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL`  | URL publique de l'app                                | `https://loyer-app-lake.vercel.app`      |
| `AUTH_SECRET`   | Clé secrète JWT ≥ 32 caractères                     | générée via `openssl rand -base64 32`   |

Fichiers :
- `.env` — valeurs placeholder, **commité** dans git
- `.env.local` — valeurs réelles, **jamais commité** (dans `.gitignore`)

---

## Architecture du projet

```
loyer-app/
├── prisma/
│   ├── schema.prisma                        # Schéma Prisma (PostgreSQL)
│   └── migrations/
│       ├── 20260430230212_init/             # Schéma initial complet
│       ├── 20260501001107_add_budget_mode/  # Ajout champ budgetMode
│       └── 20260501002000_multi_household/  # Plusieurs foyers par compte
│
├── src/
│   ├── actions/                    # Server Actions ("use server")
│   │   ├── helpers.ts              #   requireHouseholdMember(), getOrCreateMonth()
│   │   ├── auth-actions.ts         #   register(), login()
│   │   ├── paycheck-actions.ts     #   CRUD paies
│   │   ├── expense-actions.ts      #   CRUD dépenses
│   │   ├── deposit-actions.ts      #   CRUD dépôts
│   │   ├── month-actions.ts        #   getMonthData(), getAvailableMonths()
│   │   ├── settings-actions.ts     #   Paramètres foyer + profil + budgetMode
│   │   └── household-actions.ts    #   switchHousehold(), createNewHousehold(), joinExistingHousehold()
│   │
│   ├── app/
│   │   ├── (auth)/                 # Pages publiques
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/                  # Pages protégées (middleware)
│   │   │   ├── layout.tsx          #   Sidebar + Navbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── month/[slug]/page.tsx  # slug = YYYY-MM
│   │   │   ├── settings/page.tsx
│   │   │   └── household/
│   │   │       ├── new/page.tsx    #   Créer un nouveau foyer
│   │   │       └── join/page.tsx   #   Rejoindre un foyer existant
│   │   ├── onboarding/page.tsx     # Création / rejoindre un foyer
│   │   └── layout.tsx              # Root layout
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── month-selector-buttons.tsx
│   │   ├── layout/                 # Navbar, Sidebar, HouseholdSelector
│   │   ├── month/
│   │   │   ├── summary-card.tsx    #   Résumé contributions par membre
│   │   │   ├── paychecks-tab.tsx   #   Saisie et liste des paies
│   │   │   ├── expenses-tab.tsx    #   Saisie et liste des dépenses
│   │   │   └── deposits-tab.tsx    #   Saisie et liste des dépôts
│   │   ├── settings/
│   │   │   ├── budget-mode-form.tsx   # Sélecteur CURRENT / SHIFTED
│   │   │   ├── household-name-form.tsx
│   │   │   ├── profile-form.tsx
│   │   │   └── invite-section.tsx
│   │   └── ui/                     # Composants shadcn/ui générés
│   │
│   ├── lib/
│   │   ├── calc.ts                 # Fonctions pures de calcul (testées)
│   │   ├── types.ts                # Interfaces TypeScript (MonthData, etc.)
│   │   ├── utils.ts                # cn(), slugs, formatMonthLabel()…
│   │   ├── validations.ts          # Schémas Zod
│   │   ├── prisma.ts               # Singleton Prisma client
│   │   ├── auth.ts                 # Configuration NextAuth v5
│   │   └── active-household.ts     # getActiveHouseholdId() — cookie + fallback
│   │
│   ├── middleware.ts               # Protection routes /(app)/*
│   ├── test/
│   │   ├── calc.test.ts
│   │   └── utils.test.ts
│   └── types/                      # Déclarations TypeScript globales
│
├── e2e/                            # Tests Playwright
├── Dockerfile                      # Image Docker multi-stage
├── docker-compose.yml
├── vercel.json                     # { "framework": "nextjs" }
├── .env.example
├── IDEAS.md                        # Backlog d'idées futures
└── DOCUMENTATION.md                # Ce fichier
```

---

## Modèle de données

### Diagramme simplifié

```
User ←──── HouseholdMember ────→ Household
 │            (role, displayName,    │
 │             savingsGoal)          │
 ├──→ Paycheck ──────────────────────┤
 ├──→ Deposit ───────────→ Month ←───┤
 └──→ Expense (paidBy)  ←────────────┘
```

### Tables

#### `Household`
| Champ        | Type     | Description                                     |
|--------------|----------|-------------------------------------------------|
| `id`         | cuid     | Identifiant unique                              |
| `name`       | String   | Nom du foyer (ex: "Notre foyer")                |
| `budgetMode` | String   | `"CURRENT"` ou `"SHIFTED"` (défaut: CURRENT)    |

#### `HouseholdMember`
| Champ         | Type   | Description                              |
|---------------|--------|------------------------------------------|
| `role`        | String | `"ADMIN"` ou `"MEMBER"`                  |
| `displayName` | String | Prénom affiché (ex: "Marie")             |
| `savingsGoal` | Float  | Objectif d'épargne mensuel (défaut: 0)  |

> Un utilisateur peut appartenir à **plusieurs foyers** simultanément. La contrainte d'unicité est `@@unique([householdId, userId])` (pas `@unique` sur `userId` seul). Le foyer actif est stocké dans le cookie `active-household` (httpOnly, 1 an, sameSite lax).

#### `Paycheck`
| Champ               | Type     | Description                               |
|---------------------|----------|-------------------------------------------|
| `date`              | DateTime | Date de la paie (heure locale)            |
| `grossAmount`       | Float    | Salaire brut                              |
| `vacationDeduction` | Float    | Déduction semaines non payées             |
| `netAmount`         | Float    | Calculé : `gross - vacationDeduction`     |
| `notes`             | String?  | Commentaire libre                         |

#### `Expense`
| Champ        | Type     | Description                                             |
|--------------|----------|---------------------------------------------------------|
| `category`   | String   | Voir liste ci-dessous                                   |
| `label`      | String   | Libellé libre                                           |
| `amount`     | Float    | Montant                                                 |
| `type`       | String   | `"FIXED"` (charge fixe) ou `"VARIABLE"`                |
| `paidById`   | String?  | Membre ayant avancé la dépense (optionnel)              |
| `isTemplate` | Boolean  | Postes fixes récurrents (préremplissage futur)          |

**Catégories disponibles :**
`LOYER` · `ELECTRICITE` · `INTERNET` · `ASSURANCE` · `ASSURANCE_LOGEMENT` · `ASSURANCE_AUTO` · `EPICERIE` · `TRANSPORT` · `SANTE` · `LOISIRS` · `AUTRE`

#### `Month`
Créé automatiquement à la première visite d'un slug YYYY-MM. Sert de clé étrangère pour regrouper les dépenses et dépôts d'un mois donné.

#### `Deposit`
Versement effectué par un membre vers le pot commun du mois.

---

## Concepts métier

### Répartition équitable au prorata

La contribution de chaque membre **n'est pas 50/50** mais proportionnelle à ses revenus nets :

$$
\text{Part}(m) = \frac{\text{RevenuNet}(m)}{\sum \text{RevenuNet}}
$$

$$
\text{ContributionAttendue}(m) = \text{TotalDépenses} \times \text{Part}(m)
$$

$$
\text{ResteAprèsContribution}(m) = \text{RevenuNet}(m) - \text{ContributionAttendue}(m)
$$

$$
\text{ResteLibre}(m) = \text{ResteAprèsContribution}(m) - \text{ObjectifÉpargne}(m)
$$

**Cas limite :** si les revenus totaux = 0, un fallback 50/50 est appliqué avec un avertissement affiché en orange.

### Revenu net d'une paie

```
NetAmount = GrossAmount - VacationDeduction
```

La déduction vacances permet de refléter les semaines non rémunérées (congé sans solde, quinzaines incomplètes…).

### Solde de paiement

```
SoldePaiement = TotalDépôts - ContributionAttendue
  > 0  → trop payé (crédit, affiché en vert)
  < 0  → reste à verser (affiché en rouge)
```

### Objectif d'épargne

Chaque membre peut se fixer un objectif d'épargne mensuel. Le **Reste libre** est calculé après soustraction de cet objectif et affiché :
- en **vert** si le revenu restant dépasse l'objectif
- en **rouge** si l'objectif n'est pas atteignable

---

## Modes de budgétisation

Configurable par foyer dans **Paramètres → Mode de budgétisation**.

### Mode Courant (`CURRENT`) — défaut

Les revenus du mois N servent à calculer la contribution pour les dépenses du mois N.

```
Mai : paies de mai → dépenses de mai
```

### Mode Décalé (`SHIFTED`) — enveloppe

Les revenus du mois N-1 servent à financer les dépenses du mois N.  
Principe de l'**enveloppe budgétaire** : on ne dépense que ce qu'on a déjà encaissé.

```
Mai : paies d'avril → dépenses de mai
```

Une bannière bleue s'affiche sur la page du mois pour indiquer de quel mois proviennent les revenus utilisés dans les calculs.

> L'onglet **Paies** affiche toujours les paies saisies pour le mois en cours (pour les enregistrer), mais les calculs de contribution utilisent le mois précédent.

---

## Server Actions

Toutes les actions commencent par `requireHouseholdMember()` qui vérifie la session, récupère l'utilisateur et son `householdId`.

### `auth-actions.ts`
| Fonction | Description |
|----------|-------------|
| `register(data)` | Crée un User + HouseholdMember (nouveau foyer) |
| `login(email, password)` | Vérifie bcrypt et crée la session |

### `paycheck-actions.ts`
| Fonction | Description |
|----------|-------------|
| `createPaycheck(data)` | Crée une paie, calcule `netAmount` |
| `updatePaycheck(id, data)` | Met à jour, recalcule `netAmount` |
| `deletePaycheck(id)` | Supprime |
| `generateBiweeklyPaychecks(data)` | Génère 2 paies sur des dates spécifiques du mois |

### `expense-actions.ts`
| Fonction | Description |
|----------|-------------|
| `createExpense(data)` | Crée une dépense liée au mois |
| `updateExpense(id, data)` | Met à jour |
| `deleteExpense(id)` | Supprime |

### `deposit-actions.ts`
| Fonction | Description |
|----------|-------------|
| `createDeposit(data)` | Crée un dépôt pour un membre |
| `updateDeposit(id, data)` | Met à jour |
| `deleteDeposit(id)` | Supprime |

### `month-actions.ts`
| Fonction | Description |
|----------|-------------|
| `getMonthData(slug)` | Charge tout le `MonthData` : membres, paies, dépenses, dépôts, contributions, budgetMode |
| `getAvailableMonths()` | Liste des mois existants pour le foyer |

### `settings-actions.ts`
| Fonction | Validation | Revalidation |
|----------|-----------|--------------|
| `updateHouseholdName(name)` | 2–100 chars | `/settings`, layout |
| `updateDisplayName(name)` | 1–50 chars | `/settings`, layout |
| `updateSavingsGoal(goal)` | 0–99 999 | `/settings`, pages mois |
| `updatePassword(current, new)` | bcrypt verify + min 6 chars | — |
| `updateBudgetMode(mode)` | `"CURRENT"` ou `"SHIFTED"` | `/settings`, pages mois |
### `household-actions.ts`
| Fonction | Description |
|----------|-------------|
| `switchHousehold(householdId)` | Vérifie l'appartenance, écrit le cookie `active-household`, redirige vers `/dashboard` |
| `createNewHousehold(name, displayName)` | Crée un foyer + membre ADMIN, active ce foyer |
| `joinExistingHousehold(inviteCode, displayName)` | Rejoint un foyer (max 2 membres) via code d'invitation, active ce foyer |
---

## Composants clés

### `SummaryCard`
Affiche par membre :
- Revenu net · Part % · Contribution attendue
- Total déposé · Solde paiement (couleur verte/rouge)
- Reste après contribution
- Objectif épargne (bleu) + Reste libre (vert/rouge) — masqué si objectif = 0

### `PaychecksTab`
- Liste des paies du mois courant
- Formulaire d'ajout avec génération **biweekly** : saisit deux dates distinctes avec un montant brut par quinzaine (les salaires biweekly varient d'une quinzaine à l'autre)

### `ExpensesTab`
- **5 postes rapides** : Électricité, WiFi, Épicerie, Assur. logement, Assur. auto (cliquables pour préremplir le formulaire)
- Panel **Analyse du mois** :
  - Répartition FIXED vs VARIABLE
  - Barres par catégorie
  - Explication de la contribution calculée pour chaque membre

### `DepositsTab`
- Dépôts versés par chaque membre vers le pot commun
- Solde paiement mis à jour en temps réel

### `BudgetModeForm`
- Deux cartes cliquables (CURRENT / SHIFTED)
- Mise à jour immédiate via `updateBudgetMode()` sans rechargement de page

### `HouseholdSelector`
- Affiché dans la Navbar, à gauche
- Si **1 seul foyer** : affichage statique du nom du foyer
- Si **2+ foyers** : `DropdownMenu` Radix avec liste des foyers (coche sur le foyer actif), boutons « Créer un foyer » et « Rejoindre un foyer »
- La sélection appelle `switchHousehold()` via `useTransition` (optimiste, sans blocage UI)

---

## Routes & Navigation

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | Public | Redirige vers `/dashboard` ou `/login` |
| `/login` | Public | Connexion email/mot de passe |
| `/register` | Public | Création de compte |
| `/onboarding` | Connecté | Créer ou rejoindre un foyer (1er foyer) |
| `/dashboard` | Protégé | Vue globale des derniers mois |
| `/month/[slug]` | Protégé | Détail d'un mois (slug = `YYYY-MM`) |
| `/settings` | Protégé | Paramètres foyer, profil, membres, budgetMode |
| `/household/new` | Protégé | Créer un nouveau foyer (foyers supplémentaires) |
| `/household/join` | Protégé | Rejoindre un foyer existant via code d'invitation |
| `/api/auth/*` | Public | Handlers NextAuth |

Navigation entre mois :
- Boutons `← →` sur la page mois
- Sélecteur de mois sur le dashboard

---

## Authentification

- **Stratégie JWT** (pas de session BDD)
- **Credentials provider** : email + mot de passe hashé bcrypt (12 rounds)
- Le middleware `src/middleware.ts` protège toutes les routes `/(app)/*`
- Redirection automatique :
  - Non connecté → `/login`
  - Connecté sur page auth → `/dashboard`
- Un utilisateur sans aucun foyer (`HouseholdMember` absent) est redirigé vers `/onboarding`
- Un utilisateur avec plusieurs foyers peut basculer via le sélecteur dans la Navbar — le foyer actif est mémorisé dans le cookie `active-household`

---

## Tests

```bash
# Tests unitaires (Vitest)
npm test               # mode watch
npx vitest run         # une fois (CI)
npx vitest run --coverage  # avec couverture

# Vérification TypeScript
npx tsc --noEmit

# Tests E2E (Playwright)
npm run test:e2e
npm run test:e2e:ui    # interface graphique
```

**Couverture actuelle :**
- `calc.ts` : prorata, fallback 50/50, cas limites (membres = 0, dépenses = 0)
- `utils.ts` : `parseMonthSlug`, `toMonthSlug`, `prevMonthSlug`, `nextMonthSlug`, `formatMonthLabel`

---

## Déploiement

### Vercel (production)

Domaine : `https://loyer-app-lake.vercel.app`

Variables d'environnement à configurer dans Vercel → Settings → Environment Variables :
```
DATABASE_URL    = postgresql://...pooler.../neondb?sslmode=require
DIRECT_URL      = postgresql://.../neondb?sslmode=require
NEXTAUTH_URL    = https://loyer-app-lake.vercel.app
AUTH_SECRET     = <clé 32 chars — générer sur generate-secret.vercel.app/32>
```

Build command : `prisma generate && next build`  
La migration doit avoir été appliquée manuellement avant le premier déploiement :
```bash
$env:DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

### Docker (self-hosted)

```bash
# Build
docker build -t loyer-app .

# Run (avec PostgreSQL externe)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e DIRECT_URL="postgresql://..." \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e AUTH_SECRET="..." \
  loyer-app

# Avec docker-compose
docker-compose up --build
```

Le `Dockerfile` utilise une build multi-stage (deps → builder → runner) avec l'image `node:20-alpine`.

---

## Décisions techniques

### Formatage monétaire manuel (sans `Intl`)
`Intl.NumberFormat('fr-CA')` produit des caractères d'espacement différents entre Node.js (SSR) et le navigateur selon les versions ICU, causant des erreurs d'hydratation React.  
→ `formatCurrency()` et `formatPercent()` dans `calc.ts` sont réécrites manuellement pour produire un résultat bit-à-bit identique côté serveur et client.

### Radix `Select` et valeur vide
`<SelectItem value="">` fait planter Radix UI.  
→ Le champ "Payé par" utilise la valeur sentinelle `"none"` convertie en `""` dans le handler : `v === "none" ? "" : v`.

### Dates locales pour les paies
`new Date("YYYY-MM-DD")` → minuit UTC → décalage d'un jour en affichage local.  
→ Les paies utilisent `new Date(year, month-1, day)` (constructeur en heure locale).

### `suppressHydrationWarning`
Ajouté sur `<html>` et `<body>` dans `layout.tsx` pour supprimer les avertissements causés par les extensions navigateur qui modifient le DOM avant l'hydratation React.

### Connexion Prisma / Neon
Neon exige deux URLs séparées :
- `DATABASE_URL` → pooler PgBouncer (pour les requêtes en production, connexions courtes)
- `DIRECT_URL` → connexion directe (pour `prisma migrate`, incompatible avec PgBouncer)

### Client Prisma verrouillé (Windows)
Sur Windows, le fichier `.dll.node` du client Prisma est verrouillé par le serveur dev.  
→ Toujours arrêter `npm run dev` avant `npx prisma generate`.

---

## Scripts npm

| Script | Commande | Description |
|--------|----------|-------------|
| `dev` | `next dev` | Serveur de développement |
| `build` | `prisma generate && next build` | Build de production |
| `start` | `next start` | Serveur de production |
| `lint` | `next lint` | ESLint |
| `db:generate` | `prisma generate` | Régénérer le client Prisma |
| `db:push` | `prisma db push` | Push schema sans migration |
| `db:migrate` | `prisma migrate dev` | Créer + appliquer une migration |
| `db:deploy` | `prisma migrate deploy` | Appliquer les migrations (CI/prod) |
| `db:seed` | `tsx prisma/seed.ts` | Données de test |
| `db:studio` | `prisma studio` | Interface graphique BDD |
| `test` | `vitest` | Tests unitaires (watch) |
| `test:ui` | `vitest --ui` | Tests avec UI Vitest |
| `test:coverage` | `vitest run --coverage` | Couverture |
| `test:e2e` | `playwright test` | Tests end-to-end |
| `test:e2e:ui` | `playwright test --ui` | Tests E2E avec interface |
