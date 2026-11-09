import { expect, test } from "@playwright/test";

const apiPattern = "https://api.tutorera.ac.pk/api/v1/**";
const analyst = { _id: "analyst-1", name: "Market Analyst", email: "analyst@example.com", role: "admin", adminRole: "analyst", isVerified: true, isApproved: true, plan: "free" };
const scores = {
  "PK|PKR|Lahore|Mathematics|online": { score: 82, grade: "High", components: { demandScore: 90, supplyScore: 65, fillRateScore: 80, competitionScore: 75 }, meta: { openRequests: 12, eligibleTutors: 8, fillRate: .8, avgOffersPerRequest: 3.2, avgSessionPrice: 2500, sampleSize: 28, currency: "PKR" } },
  "PK|PKR|Karachi|Physics|in-person": { score: 42, grade: "Low", components: { demandScore: 70, supplyScore: 20, fillRateScore: 35, competitionScore: 30 }, meta: { openRequests: 9, eligibleTutors: 2, fillRate: .35, avgOffersPerRequest: 1.1, avgSessionPrice: 3200, sampleSize: 14, currency: "PKR" } },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "e2e-token"));
  await page.route(apiPattern, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: analyst }) });
    if (path.endsWith("/liquidity/overview")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scores, summary: { avgScore: 62, totalSegments: 2, high: 1, moderate: 0, low: 1 } }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
});

test("analyst filters observed liquidity segments and inspects score detail", async ({ page }) => {
  await page.goto("/admin/liquidity");
  await expect(page.getByRole("heading", { name: "Marketplace liquidity" })).toBeVisible();
  await expect(page.getByText("Lahore", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Filter by teaching mode" }).selectOption("in-person");
  await expect(page.getByText("Karachi", { exact: true })).toBeVisible();
  await expect(page.getByText("Lahore", { exact: true })).toHaveCount(0);
  await page.getByText("Score detail").click();
  await expect(page.getByRole("meter", { name: "Demand" })).toHaveAttribute("aria-valuenow", "70");
});

test("liquidity workspace stays within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/liquidity");
  await expect(page.getByRole("heading", { name: "Marketplace liquidity" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
