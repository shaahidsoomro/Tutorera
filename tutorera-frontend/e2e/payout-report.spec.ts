import { expect, Page, test } from "@playwright/test";

const apiPattern = "https://api.tutorera.ac.pk/api/v1/**";
const pdfBody = Buffer.from("%PDF-1.7\n% TUTORERA payout E2E fixture\n");

async function authenticate(page: Page, user: Record<string, unknown>, options: { pdfFailure?: boolean; onPdfRequest?: () => void } = {}) {
  await page.addInitScript(() => localStorage.setItem("token", "e2e-token"));
  await page.route(apiPattern, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user }) });
      return;
    }
    if (path.endsWith("/tracking/application-status")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ payload: { marketplaceEligibility: { eligible: true } } }) });
      return;
    }
    if (path.endsWith("/earnings")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "tutor", stats: { totalEarnings: 1540, sessionsCount: 1, hoursTaught: 1, subjectsCount: 1, onHoldAmount: 0, onHoldCount: 0 }, monthlyData: [], subjectBreakdown: [], recentSessions: [] }),
      });
      return;
    }
    if (path.endsWith("/earnings/payouts")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ stats: { currencyTotals: [{ currency: "PKR", pendingAmount: 1540, paidAmount: 0 }] }, pagination: { total: 1, page: 1, pages: 1, limit: 10 }, payouts: [{ _id: "booking-1", studentName: "Test Student", subject: "Mathematics", currency: "PKR", tutorPayout: 1540, payoutStatus: "pending", createdAt: "2026-09-01T10:00:00.000Z" }] }),
      });
      return;
    }
    if (path.endsWith("/earnings/report/pdf")) {
      options.onPdfRequest?.();
      expect(route.request().url()).toContain("from=");
      expect(route.request().url()).toContain("to=");
      if (options.pdfFailure) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Statement service is temporarily unavailable." }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/pdf", headers: { "Access-Control-Expose-Headers": "Content-Disposition", "Content-Disposition": 'attachment; filename="tutor-statement.pdf"' }, body: pdfBody });
      return;
    }
    if (path.endsWith("/admin/users")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ users: [{ _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com", city: "Lahore", createdAt: "2026-09-01", isActive: true, isVerified: true }] }) });
      return;
    }
    if (path.endsWith("/admin/payouts")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bookings: [{ _id: "booking-1", student: { name: "Student", email: "student@example.com" }, tutor: { _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com" }, amount: 2000, platformFee: 460, tutorPayout: 1540, status: "completed", paymentStatus: "confirmed", payoutStatus: "paid", createdAt: "2026-09-01" }], stats: { pendingCount: 0, paidCount: 1, totalPendingAmount: 0, totalPaidAmount: 1540 } }) });
      return;
    }
    if (path.endsWith("/admin/customers/tutors/tutor-1/360")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tutor: { _id: "tutor-1", fullName: "Test Tutor", hourlyRate: 2000, currency: "PKR", city: "Lahore", teachingMode: "online", subjects: ["Mathematics"], levels: ["O-Level"], policeVerificationStatus: "approved", isVerified: true, averageRating: 5, totalReviews: 1, winRate: 50, totalEarnings: 1540, offersSubmittedCount: 2, completedBookingsCount: 1, user: { name: "Test Tutor", email: "tutor@example.com" }, bids: [], bookings: [] } }) });
      return;
    }
    if (path.endsWith("/admin/tutors/tutor-1/payout-report/pdf")) {
      await route.fulfill({ status: 200, contentType: "application/pdf", headers: { "Access-Control-Expose-Headers": "Content-Disposition", "Content-Disposition": 'attachment; filename="admin-tutor-statement.pdf"' }, body: pdfBody });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

test("verified tutor downloads a date-filtered payout PDF", async ({ page }) => {
  await authenticate(page, { _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com", role: "tutor", isVerified: true, isApproved: true, plan: "free" });
  await page.goto("/earnings");
  const button = page.getByRole("button", { name: "Download payout PDF" });
  await expect(button).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tutor-statement.pdf");
  await expect(page.getByText("Verified payout report downloaded.")).toBeVisible();
});

test("tutor sees a truthful payout timeline and can request settlement", async ({ page }) => {
  await authenticate(page, { _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com", role: "tutor", isVerified: true, isApproved: true, plan: "free" });
  await page.goto("/earnings");
  await expect(page.getByRole("heading", { name: "Payout tracking" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Payout timeline for Mathematics" })).toContainText("Eligible");
  await expect(page.getByRole("list", { name: "Payout timeline for Mathematics" })).toContainText("Not reached");
  await expect(page.getByRole("button", { name: "Request payout" })).toBeVisible();
});

test("finance admin downloads a selected tutor payout PDF", async ({ page }) => {
  await authenticate(page, { _id: "finance-1", name: "Finance Admin", email: "finance@example.com", role: "admin", adminRole: "finance", isVerified: true, isApproved: true, plan: "free" });
  await page.goto("/admin/payouts");
  await page.getByRole("button", { name: /Paid/ }).click();
  const button = page.getByRole("button", { name: "Statement PDF" }).first();
  await expect(button).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("admin-tutor-statement.pdf");
});

test("analytics-only admin is not shown payout controls", async ({ page }) => {
  await authenticate(page, { _id: "analyst-1", name: "Analyst", email: "analyst@example.com", role: "admin", adminRole: "analyst", isVerified: true, isApproved: true, plan: "free" });
  await page.goto("/admin/tutors");
  await page.getByRole("button", { name: /Tutor 360/ }).click();
  await expect(page.getByRole("button", { name: "Download payout PDF" })).toHaveCount(0);
});

test("invalid tutor date range is rejected before an API request", async ({ page }) => {
  let pdfRequests = 0;
  await authenticate(
    page,
    { _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com", role: "tutor", isVerified: true, isApproved: true, plan: "free" },
    { onPdfRequest: () => { pdfRequests += 1; } },
  );
  await page.goto("/earnings");
  await page.getByLabel("From").fill("2026-09-08");
  await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-09-01");
  await page.getByRole("button", { name: "Download payout PDF" }).click();
  await expect(page.getByText("Choose a valid report date range.")).toBeVisible();
  expect(pdfRequests).toBe(0);
});

test("failed tutor report can be retried without a frozen control", async ({ page }) => {
  await authenticate(
    page,
    { _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com", role: "tutor", isVerified: true, isApproved: true, plan: "free" },
    { pdfFailure: true },
  );
  await page.goto("/earnings");
  const button = page.getByRole("button", { name: "Download payout PDF" });
  await button.click();
  await expect(page.getByText("Statement service is temporarily unavailable.")).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(button).toHaveAttribute("aria-busy", "false");
});

test("tutor payout controls remain usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await authenticate(page, { _id: "tutor-1", name: "Test Tutor", email: "tutor@example.com", role: "tutor", isVerified: true, isApproved: true, plan: "free" });
  await page.goto("/earnings");
  const button = page.getByRole("button", { name: "Download payout PDF" });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x || 0) + (box?.width || 0)).toBeLessThanOrEqual(390);
});
