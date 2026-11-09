import { expect, test } from "@playwright/test";

const apiPattern = "**/api/v1/**";
const admin = { _id: "admin-1", name: "Operations Commander", email: "admin@example.test", role: "admin", adminRole: "super_admin", adminPermissions: ["*"], isVerified: true, isApproved: true };

const pulse = {
  pulse: { activeRequests: 42, successfulBookings: 128, requestsAtRisk: 7, zeroOfferRequests: 4, expiringToday: 3, verificationBacklog: 18, failedPayments: 2, openSafetyCases: 1 },
  urgentActions: [{ id: "verification_backlog", type: "tutor_verification", severity: "critical", title: "Review 18 Tutors Awaiting Verification > 48h SLA", detail: "Review backlog", link: "/admin/applications?status=UNDER_REVIEW", actionLabel: "Review Tutors" }],
  atRiskPreview: [],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "admin-e2e-token"));
  await page.route(apiPattern, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: admin }) });
    if (path.endsWith("/control-tower/pulse")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pulse) });
    if (path.includes("/onboarding/parents")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summary: { LEARNER_LINKED: 1 }, rows: [{ userId: "parent-1", name: "Tariq Mahmood", email: "tariq@example.test", phase: "LEARNER_LINKED", linkedLearners: 2, approvalRequiredForBookings: true, lastUpdatedAt: new Date().toISOString() }] }) });
    if (path.includes("/refund-requests")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ refundRequests: [{ _id: "refund-1", amount: 3500, reason: "tutor_no_show", details: "Tutor missed the session.", status: "pending", createdAt: new Date().toISOString(), student: { name: "Hamza Ali", email: "hamza@example.test" }, tutor: { name: "Usman", email: "usman@example.test" }, booking: { _id: "booking-1", studentTotal: 3500, currency: "PKR" } }] }) });
    if (path.includes("/admin/safety/cases")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cases: [{ _id: "case-1", caseId: "CASE-2026-001", reporter: { name: "Parent", email: "parent@example.test" }, reportedUser: { _id: "tutor-1", name: "Tutor", email: "tutor@example.test", role: "tutor" }, category: "harassment", severity: "high", status: "open", evidence: [], createdAt: new Date().toISOString() }] }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });
});

test("control tower displays operational backlog data", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Marketplace Command Center" })).toBeVisible();
  await expect(page.getByText("Verification Backlog")).toBeVisible();
  await expect(page.getByText("Review 18 Tutors Awaiting Verification > 48h SLA")).toBeVisible();
});

test("admin can review a pending refund through the canonical workspace", async ({ page }) => {
  await page.goto("/admin/refunds");
  await expect(page.getByRole("heading", { name: "Refund review and external settlement" })).toBeVisible();
  await expect(page.getByText("Hamza Ali")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Review refund" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approve refund" })).toBeVisible();
});

test("onboarding and safety routes load the current accessible controls", async ({ page }) => {
  await page.goto("/admin/onboarding?tab=parents");
  await expect(page.getByRole("tab", { name: "Parent & Guardian Onboarding" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Tariq Mahmood")).toBeVisible();
  await page.goto("/admin/safety-cases?status=open");
  await expect(page.getByRole("heading", { name: "Trust & Safety Case Management" })).toBeVisible();
  await expect(page.getByText("CASE-2026-001")).toBeVisible();
});
