// src/tests/parent-link-idor.test.ts
//
// Audit §15 follow-on: parent/student link IDOR. The link flow
// establishes parental authority over a student account — if a
// stranger could cancel, confirm or exploit someone else's pending
// link request, they could either hijack the parent-child relationship
// (confirm) or block a legitimate link (cancel). This suite locks in
// the ownership scope on every endpoint under /api/v1/parent that
// manipulates link state, plus booking-approval ownership.

import request from "supertest";
import { Types } from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import ParentLinkRequest from "../models/ParentLinkRequest.model";
import ParentProfile from "../models/ParentProfile.model";
import TuitionRequest from "../models/Request.model";
import Bid from "../models/Bid.model";
import ParentBookingApproval from "../models/ParentBookingApproval.model";

function tokenFor(userId: string): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
}

async function makeUser(role: "parent" | "student" | "tutor", suffix: string) {
  const user = await User.create({
    name: `${role[0].toUpperCase() + role.slice(1)} ${suffix}`,
    email: `${role}-${suffix}@parent-idor.test`,
    password: "password123",
    role,
    isActive: true,
  });
  return { user, token: tokenFor(user.id) };
}

// Mirrors parent.controller.ts:linkCodeHash — a plain SHA256 of the
// zero-padded 6-digit code. Not re-exported from the controller so the
// test duplicates it rather than altering production shape.
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function seedPendingLink(parentId: Types.ObjectId, studentId: Types.ObjectId, code = "123456") {
  return ParentLinkRequest.create({
    parent: parentId,
    student: studentId,
    codeHash: hashCode(code),
    name: "Linked Child",
    level: "O-Level (Cambridge / Edexcel)",
    subjects: ["Mathematics"],
    relationship: "child",
    status: "pending",
    attempts: 0,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

describe("parent-link IDOR boundaries", () => {
  it("a stranger parent cannot cancel someone else's pending link request (404, status unchanged)", async () => {
    const owner = await makeUser("parent", "owner-cancel");
    const stranger = await makeUser("parent", "stranger-cancel");
    const student = await makeUser("student", "cancel-target");
    const link = await seedPendingLink(
      owner.user._id as Types.ObjectId,
      student.user._id as Types.ObjectId,
    );

    const res = await request(app)
      .delete(`/api/v1/parent/children/requests/${link.id}`)
      .set("Authorization", `Bearer ${stranger.token}`);

    // 404 (not 403) — the handler must not reveal that the link request
    // exists under someone else's account.
    expect(res.status).toBe(404);

    const after = await ParentLinkRequest.findById(link._id);
    expect(after?.status).toBe("pending");
  });

  it("a stranger parent cannot confirm someone else's pending link request even with the correct code", async () => {
    // Core attack: parent A sends a link request to the student. Parent
    // B intercepts the requestId AND the OTP code and tries to confirm.
    // The handler must still reject because the parent filter in the
    // findOne doesn't match.
    const owner = await makeUser("parent", "owner-confirm");
    const stranger = await makeUser("parent", "stranger-confirm");
    const student = await makeUser("student", "confirm-target");
    const CODE = "456789";
    const link = await seedPendingLink(
      owner.user._id as Types.ObjectId,
      student.user._id as Types.ObjectId,
      CODE,
    );

    const res = await request(app)
      .post(`/api/v1/parent/children/confirm`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ requestId: link.id, code: CODE });

    // Handler returns 410 (expired-or-not-found collapsed) when the
    // scoped findOne returns null, to avoid distinguishing "wrong
    // parent" from "already expired".
    expect(res.status).toBe(410);

    const after = await ParentLinkRequest.findById(link._id);
    expect(after?.status).toBe("pending");

    // Also: the stranger must not now have an attached child record.
    const strangerProfile = await ParentProfile.findOne({ user: stranger.user._id });
    expect(strangerProfile?.children || []).toHaveLength(0);

    // And the student's parent-consent flags must stay unset.
    const studentAfter = await User.findById(student.user._id);
    expect(studentAfter?.parentConsentVerified).toBeFalsy();
  });

  it("a non-parent (student) is refused on every parent-link endpoint (role gate → 403)", async () => {
    const impostor = await makeUser("student", "impostor");
    const otherParent = await makeUser("parent", "other-parent");
    const student = await makeUser("student", "role-gate-target");
    const link = await seedPendingLink(
      otherParent.user._id as Types.ObjectId,
      student.user._id as Types.ObjectId,
    );

    const cancel = await request(app)
      .delete(`/api/v1/parent/children/requests/${link.id}`)
      .set("Authorization", `Bearer ${impostor.token}`);
    expect(cancel.status).toBe(403);

    const confirm = await request(app)
      .post(`/api/v1/parent/children/confirm`)
      .set("Authorization", `Bearer ${impostor.token}`)
      .send({ requestId: link.id, code: "123456" });
    expect(confirm.status).toBe(403);

    const remove = await request(app)
      .delete(`/api/v1/parent/children/${new Types.ObjectId().toString()}`)
      .set("Authorization", `Bearer ${impostor.token}`);
    expect(remove.status).toBe(403);
  });

  async function approvalFixture(suffix: string, ownerLinked: boolean) {
    const owner = await makeUser("parent", `approval-owner-${suffix}`);
    const stranger = await makeUser("parent", `approval-stranger-${suffix}`);
    const student = await makeUser("student", `approval-child-${suffix}`);
    const tutor = await makeUser("tutor", `approval-tutor-${suffix}`);
    await ParentProfile.create({
      user: owner.user._id,
      children: ownerLinked ? [{ studentUser: student.user._id, name: "Owned Child", level: "O-Level (Cambridge / Edexcel)", subjects: ["Mathematics"], relationship: "child" }] : [],
      approvalRequiredForBookings: true,
    });
    const parentRequest = await TuitionRequest.create({
      student: student.user._id, subject: "Mathematics", level: "O-Level (Cambridge / Edexcel)", description: "Need help",
      budget: 1000, currency: "USD", teachingMode: "online", schedule: "Mon", status: "awaiting_parent_approval",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const offer = await Bid.create({ request: parentRequest._id, tutor: tutor.user._id, amount: 1000, initialStudentRate: 1000,
      currency: "USD", message: "Offer", status: "submitted", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    const approval = await ParentBookingApproval.create({ parent: owner.user._id, student: student.user._id, request: parentRequest._id,
      bid: offer._id, amount: 1000, currency: "USD", status: "pending", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } as never);
    return { owner, stranger, parentRequest, approval };
  }

  it("a stranger parent cannot decide another parent's booking approval (indistinguishable from not found)", async () => {
    const { stranger, parentRequest, approval } = await approvalFixture("stranger", true);

    const res = await request(app)
      .post(`/api/v1/parent/booking-approvals/${approval.id}`)
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ decision: "rejected" });

    // The approval is scoped to its parent, so a stranger gets the same
    // answer as for a missing approval and learns nothing about it.
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("APPROVAL_NOT_PENDING");
    expect((await ParentBookingApproval.findById(approval._id))?.status).toBe("pending");
    expect((await TuitionRequest.findById(parentRequest._id))?.status).toBe("awaiting_parent_approval");
  });

  it("a parent whose link to the child was revoked cannot decide (403)", async () => {
    const { owner, parentRequest, approval } = await approvalFixture("revoked", false);

    const res = await request(app)
      .post(`/api/v1/parent/booking-approvals/${approval.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "approved" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PARENT_LINK_REVOKED");
    expect((await ParentBookingApproval.findById(approval._id))?.status).toBe("pending");
    expect((await TuitionRequest.findById(parentRequest._id))?.status).toBe("awaiting_parent_approval");
  });
});
