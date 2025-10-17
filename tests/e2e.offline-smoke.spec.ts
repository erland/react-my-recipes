// tests/e2e.offline-smoke.spec.ts
import { test, expect } from "@playwright/test";

test.describe("PWA offline smoke", () => {
  test("loads online, then still works offline (SPA fallback + precache)", async ({ page, context }) => {
    // ONLINE: open home and wait for SW to control the page
    await page.goto("/");
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller);

    // Go to the Recipes route while online
    await page.goto("/recipes");
    const recipesHeading = page.getByRole("heading", { name: /^(Recept|Recipes)$/, exact: false });
    await expect(recipesHeading).toBeVisible();

    // OFFLINE
    await context.setOffline(true);

    // Navigate directly to a SPA route while offline (served via navigateFallback)
    await page.goto("/recipes");
    await expect(recipesHeading).toBeVisible();

    // Reload offline; should still be served from precache
    await page.reload();
    await expect(recipesHeading).toBeVisible();

    // Back online
    await context.setOffline(false);
  });
});