import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import DataIntegrityIssue from "../models/DataIntegrityIssue.model";

describe("admin data-integrity queue", () => {
  it("lists issues and requires an auditable note to close one", async () => {
    const admin = await User.create({ name: "Integrity Admin", email: `integrity-${Math.random()}@test.local`, password: "password123", role: "admin", adminRole: "super_admin" });
    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    const issue = await DataIntegrityIssue.create({
      fingerprint: "orphan_reference:Booking:issue-test:student",
      type: "orphan_reference",
      severity: "critical",
      entityType: "Booking",
      entityId: "issue-test",
      relation: "student",
      countryCode: "PK",
      details: { missingTargetId: "missing-user" },
    });
    const listed = await request(app).get("/api/v1/admin/integrity/issues?countryCode=PK").set("Authorization", `Bearer ${token}`).expect(200);
    expect(listed.body.total).toBe(1);
    expect(listed.body.issues[0]).toMatchObject({ _id: issue.id, status: "open", severity: "critical" });

    await request(app).patch(`/api/v1/admin/integrity/issues/${issue.id}`).set("Authorization", `Bearer ${token}`).send({ status: "resolved" }).expect(422);
    const resolved = await request(app).patch(`/api/v1/admin/integrity/issues/${issue.id}`).set("Authorization", `Bearer ${token}`).send({ status: "resolved", resolutionNote: "Restored the linked account from verified backup." }).expect(200);
    expect(resolved.body.issue).toMatchObject({ status: "resolved", resolutionNote: "Restored the linked account from verified backup." });
  });
});
