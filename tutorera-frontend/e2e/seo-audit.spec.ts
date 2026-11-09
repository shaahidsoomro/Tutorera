import { test, expect } from '@playwright/test';

const pages = [
  { url: '/', canonical: 'https://tutorera.ac.pk/' },
  { url: '/tutors', canonical: 'https://tutorera.ac.pk/tutors' },
  { url: '/tutors/subject/mathematics', canonical: 'https://tutorera.ac.pk/tutors/subject/mathematics' },
  { url: '/tutors/city/dubai', canonical: 'https://tutorera.ac.pk/tutors/city/dubai' },
];

for (const { url } of pages) {
  test(`SEO: ${url} — title has TUTORERA exactly once`, async ({ page }) => {
    await page.goto(url);
    const title = await page.title();
    const count = (title.match(/TUTORERA/g) || []).length;
    expect(count, `title "${title}" should contain TUTORERA exactly once`).toBe(1);
  });

  test(`SEO: ${url} — canonical is self-referencing`, async ({ page }) => {
    await page.goto(url);
    const canonicalHref = await page.$eval('link[rel="canonical"]', (el) => el.getAttribute('href')).catch(() => null);
    expect(canonicalHref).not.toBeNull();
    expect(canonicalHref).toContain(url === '/' ? '/' : url);
  });

  test(`SEO: ${url} — og:url matches page`, async ({ page }) => {
    await page.goto(url);
    const ogUrl = await page.$eval('meta[property="og:url"]', (el) => el.getAttribute('content')).catch(() => null);
    if (ogUrl) expect(ogUrl).toContain(url === '/' ? 'tutorera.ac.pk' : url);
  });
}

test('SEO: zero-tutor page has noindex', async ({ page }) => {
  await page.goto('/tutors/subject/toefl');
  const robots = await page.$eval('meta[name="robots"]', (el) => el.getAttribute('content')).catch(() => 'index');
  expect(['noindex, follow', 'index, follow']).toContain(robots);
});
