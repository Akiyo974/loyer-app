import { test, expect } from "@playwright/test";

test.describe("Smoke tests — authentification", () => {
  test("la page /login est accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Foyer/);
    await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
  });

  test("la page /register est accessible", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /foyer/i })).toBeVisible();
  });

  test("/ redirige vers /login si non authentifié", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/dashboard redirige vers /login si non authentifié", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Smoke tests — formulaire de connexion", () => {
  test("affiche une erreur avec des identifiants invalides", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "inexistant@test.com");
    await page.fill('input[name="password"]', "mauvais_mdp");
    await page.click('button[type="submit"]');

    // Attendre l'erreur (peut prendre quelques secondes)
    await expect(
      page.getByText(/email ou mot de passe incorrect/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("peut naviguer vers /register depuis /login", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Créer un foyer");
    await expect(page).toHaveURL(/\/register/);
  });
});
