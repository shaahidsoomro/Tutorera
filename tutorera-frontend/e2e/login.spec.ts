import { expect, test } from "@playwright/test";

const apiBasePattern = "https://api.tutorera.ac.pk/api/v1/**";

test.describe("Single Login Page (/login)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("renders single login page with brand, form fields, toggle pass, and links", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /welcome back to tutorera/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

    // Toggle password visibility
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toHaveAttribute("type", "password");
    const toggleBtn = page.getByRole("button", { name: /show password/i });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    const hideBtn = page.getByRole("button", { name: /hide password/i });
    await hideBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Links check
    const forgotLink = page.getByRole("link", { name: /forgot password\?/i });
    await expect(forgotLink).toHaveAttribute("href", "/forgot-password");

    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toHaveAttribute("href", "/register");
  });

  test("displays password reset success message when ?reset=success is present", async ({ page }) => {
    await page.goto("/login?reset=success");

    const statusNotice = page.getByRole("status");
    await expect(statusNotice).toBeVisible();
    await expect(statusNotice).toContainText("Your password has been successfully reset");
  });

  test("displays session expired notice when ?session=expired is present", async ({ page }) => {
    await page.goto("/login?session=expired");

    const statusNotice = page.getByRole("status");
    await expect(statusNotice).toBeVisible();
    await expect(statusNotice).toContainText("Your session has expired");
  });

  test("displays error message on invalid email or password", async ({ page }) => {
    await page.route(apiBasePattern, async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/login")) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Invalid email or password" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("wrong@example.com");
    await page.getByPlaceholder("••••••••").fill("wrongpass123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    const alert = page.getByTestId("login-error");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("Invalid email or password");
  });

  test("submits valid credentials and redirects standard user to /dashboard", async ({ page }) => {
    let signedIn = false;
    await page.route(apiBasePattern, async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/login")) {
        signedIn = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-student-jwt-token",
            user: {
              _id: "student-1",
              name: "Alice Student",
              email: "alice@example.com",
              role: "student",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      if (url.includes("/auth/me")) {
        if (!signedIn) {
          await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false }) });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              _id: "student-1",
              name: "Alice Student",
              email: "alice@example.com",
              role: "student",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("alice@example.com");
    await page.getByPlaceholder("••••••••").fill("secret123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    expect(page.url()).toContain("/dashboard");
  });

  test("honors safe ?redirect=/privacy-center after login", async ({ page }) => {
    let signedIn = false;
    await page.route(apiBasePattern, async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/login")) {
        signedIn = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-student-jwt-token",
            user: {
              _id: "student-1",
              name: "Alice Student",
              email: "alice@example.com",
              role: "student",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      if (url.includes("/auth/me")) {
        if (!signedIn) {
          await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false }) });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              _id: "student-1",
              name: "Alice Student",
              email: "alice@example.com",
              role: "student",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/login?redirect=/privacy-center");

    // Sign up link should preserve redirect
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toHaveAttribute("href", "/register?redirect=%2Fprivacy-center");

    await page.getByPlaceholder("you@example.com").fill("alice@example.com");
    await page.getByPlaceholder("••••••••").fill("secret123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.waitForURL("**/privacy-center", { timeout: 10_000 });
    expect(page.url()).toContain("/privacy-center");
  });

  test("submits admin credentials and redirects to /admin", async ({ page }) => {
    let signedIn = false;
    await page.route(apiBasePattern, async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/login")) {
        signedIn = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-admin-jwt-token",
            user: {
              _id: "admin-1",
              name: "Admin User",
              email: "admin@example.com",
              role: "admin",
              adminRole: "super_admin",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      if (url.includes("/auth/me")) {
        if (!signedIn) {
          await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false }) });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              _id: "admin-1",
              name: "Admin User",
              email: "admin@example.com",
              role: "admin",
              adminRole: "super_admin",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("admin@example.com");
    await page.getByPlaceholder("••••••••").fill("supersecret123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await page.waitForURL("**/admin", { timeout: 10_000 });
    expect(page.url()).toContain("/admin");
  });

  test("redirects already authenticated user to /dashboard automatically", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("token", "existing-jwt-token");
    });

    await page.route(apiBasePattern, async (route) => {
      const url = route.request().url();
      if (url.includes("/auth/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              _id: "student-1",
              name: "Existing Student",
              email: "existing@example.com",
              role: "student",
              isVerified: true,
              isApproved: true,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/login");

    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    expect(page.url()).toContain("/dashboard");
  });
});
