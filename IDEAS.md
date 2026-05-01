# 💡 Ideas — Loyer App

> Backlog d'idées pour enrichir l'application de gestion de budget foyer.

---

## 🚀 Fonctionnalités prioritaires

### 💳 Catégories de dépenses personnalisées
- Permettre au foyer de créer ses propres catégories (ex: "Crèche", "Animaux", "Voiture")
- Icônes et couleurs personnalisables par catégorie
- Archiver les catégories non utilisées

### 📊 Dashboard amélioré
- Graphique en barres : revenus vs dépenses sur les 12 derniers mois
- Graphique en camembert : répartition des dépenses par catégorie
- Indicateur visuel "mois dans le vert / dans le rouge"
- Solde restant estimé en temps réel

### 🔔 Alertes & Notifications
- Alerte quand les dépenses dépassent X% du budget
- Rappel mensuel pour saisir les payes (email ou notification push)
- Notification quand un membre du foyer ajoute une grosse dépense

---

## 🏠 Gestion du foyer

### 👥 Rôles affinés
- Rôle **Lecteur** : peut consulter sans modifier
- Rôle **Éditeur** : peut saisir dépenses/payes mais pas gérer les membres
- Rôle **Admin** : accès complet (actuel)

### 📨 Invitations par lien
- Générer un lien d'invitation à durée limitée (ex: 48h)
- Option "lien à usage unique" ou "multi-usage"

### 🏷️ Plusieurs foyers par compte
- Un utilisateur peut appartenir à plusieurs foyers (ex: colocation + couple)
- Sélecteur de foyer en haut de page

---

## 💰 Budget & Épargne

### 🎯 Objectifs d'épargne collectifs
- Créer un objectif foyer (ex: "Voyage au Japon — 3 000 €")
- Suivi de progression mois par mois
- Contribution automatique calculée selon les revenus de chacun

### 📦 Enveloppes budgétaires
- Allouer un budget maximum par catégorie chaque mois
- Barre de progression par enveloppe
- Reporter le reliquat non dépensé sur le mois suivant (option)

### 💸 Remboursements
- Marquer une dépense comme "avancée par membre X, à rembourser"
- Tableau récap des dettes inter-membres
- Bouton "Régler" pour solder un remboursement

### 📅 Dépenses récurrentes
- Créer des dépenses automatiques mensuelles (loyer, abonnements…)
- Option : préremplir automatiquement au début de chaque mois
- Modifier ou supprimer la récurrence

---

## 📈 Analyses & Rapports

### 📋 Rapport mensuel PDF
- Export PDF du mois : revenus, dépenses, contributions, solde
- En-tête avec nom du foyer et période
- Tableau détaillé par catégorie

### 📉 Tendances sur 6/12 mois
- Évolution des dépenses par catégorie dans le temps
- Détection de dérive (catégorie dont la dépense augmente chaque mois)
- Score de santé budgétaire mensuel

### 🗓️ Vue calendrier
- Afficher les dépenses sur un calendrier mensuel
- Voir les jours "chargés" en dépenses d'un coup d'œil

---

## ⚙️ Expérience utilisateur

### 🌙 Thème sombre
- Thème clair / sombre / auto (selon préférence OS)
- Stockage en cookie ou localStorage

### 📱 PWA (Progressive Web App)
- Installable sur mobile depuis le navigateur
- Icône sur l'écran d'accueil
- Fonctionne hors-ligne pour consulter le dernier mois chargé

### ⌨️ Raccourcis clavier
- `N` → Nouvelle dépense
- `P` → Nouvelle paye
- `←` `→` → Naviguer entre les mois

### 🔍 Recherche globale
- Chercher une dépense par label, montant, date ou catégorie
- Résultats filtrés en temps réel (tous les mois confondus)

### 📂 Import CSV
- Importer des dépenses depuis un export bancaire (CSV/OFX)
- Mapping automatique des colonnes
- Déduplication des entrées déjà saisies

---

## 🔐 Sécurité & Confidentialité

### 🔑 Double authentification (2FA)
- TOTP (Google Authenticator / Authy)
- Codes de récupération téléchargeables

### 🕵️ Journal d'activité
- Historique des actions du foyer (qui a ajouté quoi, quand)
- Filtrable par membre et par type d'action

### 🗑️ Suppression de compte
- Export de toutes les données avant suppression (RGPD)
- Confirmation par email

---

## 🤖 Automatisation & IA

### 🧠 Suggestion de catégorie
- Classer automatiquement une dépense par son libellé (ML ou règles simples)
- Apprentissage basé sur les habitudes du foyer

### 📊 Prévision budgétaire
- Estimer les dépenses du mois en cours basé sur l'historique
- Afficher "À ce rythme, vous dépasserez votre budget de X€"

### 🔄 Synchronisation bancaire (Open Banking)
- Connexion à Bridge / Powens pour importer les transactions automatiquement
- Catégorisation automatique des virements

---

## 🛠️ Technique & Infrastructure

### 🧪 Tests end-to-end (Playwright)
- Scénarios critiques : login, ajout dépense, calcul contributions
- CI GitHub Actions à chaque push

### 🌍 Internationalisation (i18n)
- Support FR / EN dans un premier temps
- Formatage des devises et dates selon la locale

### 🔌 API REST publique
- Endpoints documentés (Swagger/OpenAPI)
- Tokens API par foyer pour intégrations tierces (ex: Home Assistant, Notion)

### 📦 Multi-devise
- Associer une devise à un foyer
- Conversion automatique pour les dépenses en devises étrangères

---

## 🎨 Améliorations UI/UX mineures

- [ ] Confirmation visuelle (toast) après chaque action (actuellement partiel)
- [ ] Skeleton loaders pendant le chargement des données
- [ ] Pagination ou scroll infini sur les dépenses > 50 entrées
- [ ] Trier les dépenses par montant / date / catégorie (clic sur en-tête)
- [ ] Dupliquer une dépense d'un mois précédent
- [ ] Mode plein écran pour les graphiques
- [ ] Couleur de fond des lignes selon la catégorie (option)
- [ ] Afficher le delta vs mois précédent sur le dashboard (+12% dépenses)
