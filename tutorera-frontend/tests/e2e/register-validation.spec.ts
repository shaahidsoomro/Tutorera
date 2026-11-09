import { test, expect } from '@playwright/test';

test.describe('Register Page - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('email validation - invalid format feedback', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    
    // Type invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    
    // Check for error message
    const errorMsg = page.locator('[role="alert"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 2000 });
    await expect(errorMsg).toContainText(/valid|email/i);
  });

  test('email validation - valid email accepted', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    
    // Type valid email
    await emailInput.fill('test@example.com');
    await emailInput.blur();
    
    // No error should appear
    const errorMsg = page.locator('[role="alert"]').first();
    await expect(errorMsg).not.toBeVisible({ timeout: 2000 });
  });

  test('password strength indicator - weak password', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    
    await passwordInput.fill('123456');
    await passwordInput.blur();
    
    // Should show weak indicator or error
    const weakIndicator = page.locator('text=/Weak|Poor/i').first();
    await expect(weakIndicator).toBeVisible({ timeout: 2000 });
  });

  test('password strength indicator - strong password', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    
    await passwordInput.fill('SecurePass123!@#');
    await passwordInput.blur();
    
    // Should show strong indicator
    const strongIndicator = page.locator('text=/Strong|Very Strong/i').first();
    await expect(strongIndicator).toBeVisible({ timeout: 2000 });
  });

  test('guardian fields show for ages 13-17', async ({ page }) => {
    // Find date of birth input
    const dobInput = page.locator('input[type="date"]');
    
    // Calculate date of birth for 15-year-old
    const date = new Date();
    date.setFullYear(date.getFullYear() - 15);
    const dobString = date.toISOString().split('T')[0];
    
    await dobInput.fill(dobString);
    await dobInput.blur();
    
    // Guardian fields should be visible
    const guardianSection = page.locator('text=/Guardian|Parent/i');
    await expect(guardianSection).toBeVisible({ timeout: 2000 });
  });

  test('guardian fields hidden for ages 18+', async ({ page }) => {
    const dobInput = page.locator('input[type="date"]');
    
    // Calculate date of birth for 20-year-old
    const date = new Date();
    date.setFullYear(date.getFullYear() - 20);
    const dobString = date.toISOString().split('T')[0];
    
    await dobInput.fill(dobString);
    await dobInput.blur();
    
    // Guardian fields should NOT be visible
    const guardianSection = page.locator('text=/Guardian|Parent/i');
    await expect(guardianSection).not.toBeVisible({ timeout: 2000 });
  });

  test('form submission with valid data', async ({ page }) => {
    // Fill all required fields
    await page.locator('input[type="text"]').first().fill('John Doe');
    await page.locator('input[type="email"]').fill('john@example.com');
    await page.locator('input[type="password"]').fill('SecurePass123!@#');
    await page.locator('input[type="password"]').nth(1).fill('SecurePass123!@#');
    
    // Submit form
    const submitButton = page.locator('button:has-text("Sign up")');
    await submitButton.click();
    
    // Loading overlay should appear
    const loadingOverlay = page.locator('text=/Signing|Loading|Creating/i');
    await expect(loadingOverlay).toBeVisible({ timeout: 2000 });
  });

  test('form error accessibility - aria-invalid set on error', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    
    // Trigger error
    await emailInput.fill('invalid');
    await emailInput.blur();
    
    // Check aria-invalid attribute
    const ariaInvalid = await emailInput.getAttribute('aria-invalid');
    expect(ariaInvalid).toBe('true');
  });

  test('mobile touch targets are accessible (minimum 44px)', async ({ page }) => {
    // Get button elements
    const buttons = page.locator('button');
    
    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      
      if (box) {
        // Verify minimum touch target size
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
