import { expect, test } from "@playwright/test";

test("reference subjects have reachable pages and a prefilled student request", async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.goto("/subjects", { waitUntil: "domcontentloaded" });
  const links = page.locator('a[href^="/tutors/subject/"]');
  expect(await links.count()).toBeGreaterThan(20);
  const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  const uniqueHrefs = [...new Set(hrefs)];
  expect(uniqueHrefs.length).toBeGreaterThan(20);
  const responses = await Promise.all(uniqueHrefs.slice(0, 8).map((href) => request.get(href)));
  expect(responses.map((response) => response.status())).toEqual(responses.map(() => 200));
  await page.getByRole("link", { name: "Mathematics", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Mathematics Tutor/i);
  await page.getByRole("link", { name: /post tuition request & receive offers/i }).click();
  await expect(page.getByLabel("Select Subject *")).toHaveValue("Mathematics", { timeout: 30_000 });
});

test("subject page remains usable on a narrow screen and invalid slugs return 404", async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/tutors/subject/arabic", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Arabic Language Tutor/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await request.get("/tutors/subject/unknown-subject-fixture")).status()).toBe(404);
});
