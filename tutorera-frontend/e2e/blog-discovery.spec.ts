import { expect, test } from "@playwright/test";

test("blog hub links to a discoverable topic index", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Tutoring Insights & Guides" })).toBeVisible();
  const link = page.getByRole("link", { name: "Explore guides by subject, curriculum and country" });
  await expect(link).toHaveAttribute("href", "/blog/topics");
  await page.goto("/blog/topics");
  await expect(page).toHaveURL(/\/blog\/topics$/);
  await expect(page.getByRole("heading", { name: "Explore tutoring topics" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/blog\/topics$/);
});

test("blog hub exposes valid CollectionPage JSON-LD", async ({ page }) => {
  await page.goto("/blog");
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const collection = schemas.map(value => JSON.parse(value) as Record<string, unknown>).find(value => value["@type"] === "CollectionPage");
  expect(collection).toBeDefined();
  expect(collection?.mainEntity).toMatchObject({ "@type": "ItemList" });
});

test("published static guide has Article and BreadcrumbList JSON-LD", async ({ page }) => {
  await page.goto("/blog/how-to-find-a-trusted-tutor-in-pakistan");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trusted Tutor");
  const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map(value => JSON.parse(value) as Record<string, unknown>);
  expect(schemas.some(value => value["@type"] === "Article")).toBeTruthy();
  const breadcrumb = schemas.find(value => value["@type"] === "BreadcrumbList");
  expect(breadcrumb).toBeDefined();
  expect((breadcrumb?.itemListElement as unknown[]).length).toBe(3);
  await expect(page.getByRole("link", { name: "All guides" })).toHaveAttribute("href", "/blog");
  await expect(page.getByRole("heading", { name: "Find a tutor for this topic" })).toBeVisible();
  const directoryHref = await page.getByRole("link", { name: "Browse matching tutors and request a lesson" }).getAttribute("href");
  expect(directoryHref?.startsWith("/tutors")).toBe(true);
});
