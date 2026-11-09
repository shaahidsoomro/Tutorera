import { Page } from '@playwright/test';

// Never let E2E tests reach the real API: GET /auth/me looks logged-out,
// every write is rejected.
export async function blockApi(page: Page) {
  await page.route('**/api.tutorera.ac.pk/**', (route) => {
    const method = route.request().method();
    route.fulfill({
      status: method === 'GET' ? 401 : 400,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Blocked in E2E test' }),
    });
  });
}
