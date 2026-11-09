jest.mock("../services/emailOutbox.service", () => ({
  deliverOutboxEmail: jest.fn().mockRejectedValue(new Error("provider unavailable")),
  enqueueEmail: jest.fn(),
}));

import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import EmailLog from "../models/EmailLog.model";
import EmailOutbox from "../models/EmailOutbox.model";
import AuditLog from "../models/AuditLog.model";

beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });

async function signIn(adminRole: "super_admin" | "support") {
  const email = `${adminRole}-${Date.now()}-${Math.random()}@test.com`;
  await User.create({ name: "Email Admin", email, password: "password123", role: "admin", adminRole });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
  return agent;
}

async function failedEmail() {
  const log = await EmailLog.create({ eventType: "tutor.profile.submitted", templateId: "application", recipientEmail: "tutor@test.com", subject: "Application", status: "failed", queuedAt: new Date(), failedAt: new Date() });
  await EmailOutbox.create({ emailLog: log._id, recipientEmail: log.recipientEmail, subject: log.subject, html: "<p>Application</p>", eventType: log.eventType, templateId: log.templateId, status: "failed", attempts: 5, maxAttempts: 5, nextAttemptAt: new Date() });
  return log;
}

describe("admin email retry", () => {
  it("requires growth.manage and queues the original failed payload without duplicating its log", async () => {
    const log = await failedEmail();
    await (await signIn("support")).post(`/api/v1/admin/email-logs/${log._id}/retry`).expect(403);
    const admin = await signIn("super_admin");
    const response = await admin.post(`/api/v1/admin/email-logs/${log._id}/retry`).expect(200);
    expect(response.body.success).toBe(true);
    expect(await EmailLog.countDocuments()).toBe(1);
    expect((await EmailOutbox.findOne({ emailLog: log._id }).lean())!).toMatchObject({ status: "queued", attempts: 0 });
    expect(await AuditLog.countDocuments({ action: "email_delivery_retried", targetId: log._id.toString() })).toBe(1);
  });
  it("rejects a retry after delivery has completed", async () => {
    const log = await failedEmail();
    await EmailLog.updateOne({ _id: log._id }, { $set: { status: "sent" } });
    await (await signIn("super_admin")).post(`/api/v1/admin/email-logs/${log._id}/retry`).expect(409);
  });
});
