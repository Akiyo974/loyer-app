import { test, expect, type Page } from "@playwright/test";

// Helper : connecte l'utilisateur seed Marie
async function loginAsMarie(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "marie@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  // Attente de la redirection vers le dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Smoke tests — dashboard (utilise les données seed)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMarie(page);
  });

  test("le dashboard est accessible après connexion", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /tableau de bord/i })).toBeVisible();
  });

  test("les cards de résumé sont affichées", async ({ page }) => {
    // Cards : dépenses, revenus, taux d'effort
    await expect(page.getByText(/dépenses foyer/i)).toBeVisible();
    await expect(page.getByText(/revenus nets/i)).toBeVisible();
  });

  test("le lien 'Détail du mois' fonctionne", async ({ page }) => {
    await page.click("text=Détail du mois");
    await expect(page).toHaveURL(/\/month\/\d{4}-\d{2}/);
  });

  test("la page du mois affiche les onglets", async ({ page }) => {
    const today = new Date();
    const slug = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    await page.goto(`/month/${slug}`);

    await expect(page.getByRole("tab", { name: /résumé/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /paies/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /dépenses/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /dépôts/i })).toBeVisible();
  });

  test("la page paramètres est accessible", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /paramètres/i })).toBeVisible();
    await expect(page.getByText(/foyer/i)).toBeVisible();
  });

  test("la déconnexion redirige vers /login", async ({ page }) => {
    await page.click("text=Déconnexion");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
