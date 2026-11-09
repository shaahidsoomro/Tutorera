import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "e2e-token"));
  await page.route("https://api.tutorera.ac.pk/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { _id: "tutor-1", name: "Tutor", email: "tutor@test.com", role: "tutor", isVerified: true, isApproved: true, plan: "free", countryCode: "PK" } }) });
    if (path.endsWith("/tracking/application-status")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ payload: { marketplaceEligibility: { eligible: true } } }) });
    if (path.endsWith("/liquidity/overview")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, scores: {
      "PK|PKR|Lahore|Mathematics|in-person": { score: 70, grade: "Moderate", components: { demandScore: 90, supplyScore: 30, fillRateScore: 60, competitionScore: 40 }, meta: { openRequests: 8, eligibleTutors: 2, fillRate: .6, avgOffersPerRequest: 2, avgSessionPrice: 2500, sampleSize: 18, currency: "PKR" } },
      "PK|PKR|Karachi|Physics|online": { score: 55, grade: "Moderate", components: { demandScore: 50, supplyScore: 60, fillRateScore: 55, competitionScore: 45 }, meta: { openRequests: 2, eligibleTutors: 8, fillRate: .55, avgOffersPerRequest: 4, avgSessionPrice: 1800, sampleSize: 20, currency: "PKR" } },
    } }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
});

test("tutor can rank and filter anonymized teaching opportunities", async ({ page }) => {
  await page.goto("/opportunities");
  await expect(page.getByRole("heading", { name: "Teaching opportunities" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Ranked teaching opportunities" }).getByRole("heading", { name: "Mathematics" })).toBeVisible();
  const cards = page.getByRole("region", { name: "Ranked teaching opportunities" }).locator("article");
  await expect(cards.first()).toContainText("Lahore");
  await page.getByPlaceholder("Search city or subject").fill("Physics");
  await expect(page.getByRole("region", { name: "Ranked teaching opportunities" }).getByRole("heading", { name: "Mathematics" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Ranked teaching opportunities" }).getByRole("heading", { name: "Physics" })).toBeVisible();
});

test("opportunity workspace remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/opportunities");
  const refresh = page.getByRole("button", { name: "Refresh" });
  await expect(refresh).toBeVisible();
  const box = await refresh.boundingBox();
  expect((box?.x || 0) + (box?.width || 0)).toBeLessThanOrEqual(390);
});
