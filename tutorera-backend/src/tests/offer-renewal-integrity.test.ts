import request from "supertest";
import mongoose from "mongoose";
import SchoolOffering from "../models/SchoolOffering.model";
import { MatchingService } from "../services/matching.service";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import TutorProfile from "../models/TutorProfile.model";
import ParentProfile from "../models/ParentProfile.model";
import ParentBookingApproval from "../models/ParentBookingApproval.model";
import OfferNegotiation from "../models/OfferNegotiation.model";
import { paymentProvider } from "../services/paymentProvider.service";
import { releaseExpiredPaymentHold } from "../controllers/request.controller";

jest.mock("../services/market.service", () => ({
  ...jest.requireActual("../services/market.service"),
  assertMarketFeature: jest.fn().mockResolvedValue(undefined),
  assertAcceptanceAvailable: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../services/tracking.service", () => ({
  ...jest.requireActual("../services/tracking.service"),
  isMarketplaceEligible: jest.fn().mockReturnValue(true),
  isHomeTuitionEligible: jest.fn().mockReturnValue(true),
}));
jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
jest.mock("../utils/socket", () => ({ sendNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../services/paymentProvider.service", () => ({
  ...jest.requireActual("../services/paymentProvider.service"),
  paymentProvider: { ...jest.requireActual("../services/paymentProvider.service").paymentProvider, createCheckout: jest.fn().mockResolvedValue({ sessionId: "checkout-test-session", clientSecret: "cs_test_secret", publishableKey: "pk_test_key" }) },
}));

async function fixture(status: string, approved = true) {
  const suffix = `${Date.now()}-${Math.random()}`;
  const student = await User.create({ name: "Student", email: `s-${suffix}@test.local`, password: "password123", phone: "03001234567", role: "student", isActive: true });
  const tutor = await User.create({ name: "Tutor", email: `t-${suffix}@test.local`, password: "password123", role: "tutor", isActive: true });
  await TutorProfile.create({ user: tutor._id, subjectEligibility: [{ subject: "Mathematics", levels: ["Matric"], status: approved ? "approved" : "rejected" }] });
  const requirement = await Request.create({ student: student._id, subject: "Mathematics", level: "Matric", description: "Need help with algebra.", budget: 1000, currency: "USD", schedule: "Evenings", status: "open", teachingMode: "online", allowCounterOffers: true, expiresAt: new Date(Date.now() + 86400000) });
  const offer = await Bid.create({ request: requirement._id, tutor: tutor._id, amount: 1000, initialStudentRate: 1000, currency: "USD", message: "I can teach.", status, expiresAt: new Date(Date.now() - 1000) });
  const token = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
  return { student, tutor, requirement, offer, studentToken: token(student.id), tutorToken: token(tutor.id) };
}

async function attachSchoolOffering(f: Awaited<ReturnType<typeof fixture>>, status: "active" | "inactive") {
  const id = `test-board:ssc:class-9:mathematics-${f.requirement.id}`;
  await SchoolOffering.create({ _id: id, boardCode: "test-board", boardName: "Test board", qualificationCode: "ssc", qualificationName: "SSC", classLevel: "Class 9", subjectRef: new mongoose.Types.ObjectId(), subject: "Mathematics", subjectDisplay: "Mathematics", approvalLevel: "Matric", status });
  await Request.updateOne({ _id: f.requirement._id }, { $set: { schoolOfferingId: id } });
  await TutorProfile.updateOne({ user: f.tutor._id }, { $set: { schoolOfferingIds: [id] } });
  return id;
}

describe("offer renewal and acceptance integrity", () => {
  it("blocks renewal, acceptance, counters and matching after an offering is deactivated", async () => {
    const f = await fixture("expired");
    await attachSchoolOffering(f, "inactive");
    const renew = await request(app).post(`/api/v1/offers/${f.offer.id}/renew`).set("Authorization", `Bearer ${f.tutorToken}`).send({ amount: 1000 });
    expect(renew.status).toBe(409);
    await Bid.updateOne({ _id: f.offer._id }, { $set: { status: "submitted", expiresAt: new Date(Date.now() + 86400000) } });
    const counter = await request(app).post(`/api/v1/offers/${f.offer.id}/counter`).set("Authorization", `Bearer ${f.studentToken}`).send({ amount: 900 });
    expect(counter.status).toBe(409);
    expect(counter.body.code).toBe("SCHOOL_OFFERING_UNAVAILABLE");
    const accept = await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(accept.status).toBe(409);
    expect(accept.body.code).toBe("SCHOOL_OFFERING_UNAVAILABLE");
    const requirement = await Request.findById(f.requirement._id);
    expect(await MatchingService.getEligibleTutors(requirement!)).toEqual([]);
    expect((await Bid.findById(f.offer._id))?.status).toBe("submitted");
    expect((await Request.findById(f.requirement._id))?.status).toBe("open");
  });

  it("requires the exact board and qualification preference before renewing a school offer", async () => {
    const f = await fixture("expired");
    const id = await attachSchoolOffering(f, "active");
    await TutorProfile.updateOne({ user: f.tutor._id }, { $set: { schoolOfferingIds: [] } });
    const renew = () => request(app).post(`/api/v1/offers/${f.offer.id}/renew`).set("Authorization", `Bearer ${f.tutorToken}`).send({ amount: 1000 });
    const denied = await renew();
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("SCHOOL_OFFERING_NOT_SELECTED");
    expect((await Bid.findById(f.offer._id))?.status).toBe("expired");
    await TutorProfile.updateOne({ user: f.tutor._id }, { $set: { schoolOfferingIds: [id] } });
    expect((await renew()).status).toBe(200);
  });

  it.each(["accepted", "rejected", "withdrawn", "not_selected"])("does not revive a %s offer after its expiry timestamp", async (status) => {
    const f = await fixture(status);
    const res = await request(app).post(`/api/v1/offers/${f.offer.id}/renew`).set("Authorization", `Bearer ${f.tutorToken}`).send({ amount: 1000 });
    expect(res.status).toBe(409);
    expect((await Bid.findById(f.offer._id))?.status).toBe(status);
    expect(await OfferNegotiation.countDocuments({ offer: f.offer._id })).toBe(0);
  });

  it("accepts exactly one simultaneous renewal and preserves a single history row", async () => {
    await OfferNegotiation.init();
    const f = await fixture("expired");
    const renew = () => request(app).post(`/api/v1/offers/${f.offer.id}/renew`).set("Authorization", `Bearer ${f.tutorToken}`).send({ amount: 1000, message: "Available again" });
    const responses = await Promise.all([renew(), renew()]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const offer = await Bid.findById(f.offer._id);
    expect(offer?.status).toBe("submitted");
    expect(offer?.renewalCount).toBe(1);
    expect(await OfferNegotiation.countDocuments({ offer: f.offer._id })).toBe(1);
  });

  it("cannot renew an offer after the tutor's subject approval is revoked", async () => {
    const f = await fixture("expired", false);
    const res = await request(app).post(`/api/v1/offers/${f.offer.id}/renew`).set("Authorization", `Bearer ${f.tutorToken}`).send({ amount: 1000 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SUBJECT_NOT_APPROVED");
    expect(await OfferNegotiation.countDocuments({ offer: f.offer._id })).toBe(0);
  });

  it("requires a real student phone before reserving a gateway checkout", async () => {
    const f = await fixture("submitted");
    await User.updateOne({ _id: f.student._id }, { $unset: { phone: "" } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const res = await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(res.status).toBe(422); expect(res.body.code).toBe("PHONE_REQUIRED");
    expect((await Request.findById(f.requirement._id))?.status).toBe("open");
    expect((await Bid.findById(f.offer._id))?.status).toBe("submitted");
  });

  it("rejects acceptance after subject approval is revoked before any payment reservation", async () => {
    const f = await fixture("submitted", false);
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const res = await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SUBJECT_NOT_APPROVED");
    expect((await Request.findById(f.requirement._id))?.status).toBe("open");
    expect((await Bid.findById(f.offer._id))?.status).toBe("submitted");
  });

  it.each(["payment_pending", "accepted", "rejected", "withdrawn", "expired", "not_selected"])("cannot decline or withdraw a %s offer", async (status) => {
    const f = await fixture(status);
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const res = await request(app).post(`/api/v1/offers/${f.offer.id}/withdraw`).set("Authorization", `Bearer ${f.tutorToken}`).send({});
    expect(res.status).toBe(409);
    expect((await Bid.findById(f.offer._id))?.status).toBe(status);
  });

  it("does not decline or mark an expired unprocessed offer as viewed", async () => {
    const f = await fixture("submitted");
    const decline = await request(app).post(`/api/v1/offers/${f.offer.id}/decline`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(decline.status).toBe(409);
    const view = await request(app).post(`/api/v1/offers/${f.offer.id}/view`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(view.status).toBe(200);
    expect(view.body.offer.status).toBe("submitted");
    expect(view.body.offer.viewedAt).toBeUndefined();
  });

  it("acceptance and withdrawal racing produce only one successful transition", async () => {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const [accept, withdraw] = await Promise.all([
      request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({ cnic: "4210112345671" }),
      request(app).post(`/api/v1/offers/${f.offer.id}/withdraw`).set("Authorization", `Bearer ${f.tutorToken}`).send({}),
    ]);
    expect([accept.status, withdraw.status].filter((status) => status === 200)).toHaveLength(1);
    const requirement = await Request.findById(f.requirement._id);
    const offer = await Bid.findById(f.offer._id);
    if (accept.status === 200) {
      expect(requirement?.status).toBe("awaiting_payment");
      expect(offer?.status).toBe("payment_pending");
    } else {
      expect([409, 410]).toContain(accept.status);
      expect(requirement?.status).toBe("open");
      expect(offer?.status).toBe("withdrawn");
    }
  });

  async function pendingGuardianSelection() {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const parent = await User.create({ name: "Parent", email: `parent-${Date.now()}-${Math.random()}@test.local`, password: "password123", role: "parent", isActive: true });
    await ParentProfile.create({ user: parent._id, children: [{ studentUser: f.student._id, name: "Student" }], approvalRequiredForBookings: true });
    const selected = await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(selected.status).toBe(409); expect(selected.body.code).toBe("PARENT_APPROVAL_REQUIRED");
    const approval = await ParentBookingApproval.findOne({ parent: parent._id, bid: f.offer._id }); expect(approval).not.toBeNull();
    const token = jwt.sign({ id: parent.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    return { ...f, parent, approval: approval!, parentToken: token };
  }

  it("queues price-specific guardian consent without starting checkout", async () => {
    jest.mocked(paymentProvider.createCheckout).mockClear();
    const f = await pendingGuardianSelection();
    expect(f.approval.status).toBe("pending"); expect((await Request.findById(f.requirement._id))?.status).toBe("open");
    expect((await Bid.findById(f.offer._id))?.status).toBe("submitted"); expect(paymentProvider.createCheckout).not.toHaveBeenCalled();
  });

  it("requires an explicit guardian decision before the student starts checkout", async () => {
    const f = await pendingGuardianSelection();
    const decide = (decision?: string) => request(app).post(`/api/v1/parent/booking-approvals/${f.approval.id}/decision`).set("Authorization", `Bearer ${f.parentToken}`).send(decision ? { decision } : {});
    expect((await decide()).status).toBe(400); expect((await decide("typo")).status).toBe(400);
    jest.mocked(paymentProvider.createCheckout).mockClear(); expect((await decide("approved")).status).toBe(200); expect(paymentProvider.createCheckout).not.toHaveBeenCalled();
    expect((await decide("approved")).status).toBe(409);
    expect((await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({})).status).toBe(200);
    expect((await Request.findById(f.requirement._id))?.status).toBe("awaiting_payment"); expect((await Bid.findById(f.offer._id))?.paymentReservationId).toBeTruthy();
  });

  it("does not approve a parent selection after tutor subject approval is revoked", async () => {
    const f = await pendingGuardianSelection();
    await TutorProfile.updateOne({ user: f.tutor._id }, { $set: { "subjectEligibility.0.status": "rejected" } });
    const result = await request(app).post(`/api/v1/parent/booking-approvals/${f.approval.id}/decision`).set("Authorization", `Bearer ${f.parentToken}`).send({ decision: "approved" });
    expect(result.status).toBe(403); expect(result.body.code).toBe("SUBJECT_NOT_APPROVED"); expect((await ParentBookingApproval.findById(f.approval._id))?.status).toBe("pending");
  });

  it("rejects an unrelated parent and applies only one simultaneous guardian decision", async () => {
    const f = await pendingGuardianSelection();
    const stranger = await User.create({ name: "Stranger", email: `stranger-${Date.now()}-${Math.random()}@test.local`, password: "password123", role: "parent", isActive: true });
    const strangerToken = jwt.sign({ id: stranger.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    const decide = (token: string, decision: string) => request(app).post(`/api/v1/parent/booking-approvals/${f.approval.id}/decision`).set("Authorization", `Bearer ${token}`).send({ decision });
    expect((await decide(strangerToken, "approved")).status).toBe(409);
    const results = await Promise.all([decide(f.parentToken, "approved"), decide(f.parentToken, "rejected")]);
    expect(results.filter(result => result.status === 200)).toHaveLength(1); expect((await Request.findById(f.requirement._id))?.status).toBe("open");
  });

  it("does not cancel a request while a dispatched checkout awaits reconciliation", async () => {
    const f = await fixture("payment_pending");
    await Request.updateOne({ _id: f.requirement._id }, { $set: { status: "awaiting_payment", acceptedOffer: f.offer._id } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentReservationId: "hold", checkoutStartedAt: new Date(), paymentPendingExpiresAt: new Date(Date.now() + 60000) } });
    const result = await request(app).patch(`/api/v1/requests/${f.requirement.id}/cancel`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(result.status).toBe(409); expect(result.body.code).toBe("PAYMENT_RECONCILIATION_REQUIRED");
    expect((await Request.findById(f.requirement._id))?.status).toBe("awaiting_payment"); expect((await Bid.findById(f.offer._id))?.status).toBe("payment_pending");
  });

  it("does not cancel a direct booking after checkout dispatch", async () => {
    const f = await fixture("submitted");
    await Request.updateOne({ _id: f.requirement._id }, { $set: { isDirect: true, targetTutor: f.tutor._id } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const accepted = await request(app).patch(`/api/v1/requests/${f.requirement.id}/bids/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.tutorToken}`).send({});
    expect(accepted.status).toBe(200);
    await Bid.updateOne({ _id: f.offer._id }, { $set: { checkoutStartedAt: new Date() } });
    const result = await request(app).patch(`/api/v1/bookings/${accepted.body.bookingId}/status`).set("Authorization", `Bearer ${f.studentToken}`).send({ status: "cancelled" });
    expect(result.status).toBe(409); expect(result.body.code).toBe("PAYMENT_RECONCILIATION_REQUIRED");
    expect((await Bid.findById(f.offer._id))?.status).toBe("payment_pending");
    expect((await Request.findById(f.requirement._id))?.status).toBe("awaiting_payment");
  });

  it("blocks a second checkout when a session has already been dispatched", async () => {
    const f = await fixture("payment_pending");
    await Request.updateOne({ _id: f.requirement._id }, { $set: { status: "awaiting_payment", acceptedOffer: f.offer._id } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentReservationId: "held-checkout", checkoutStartedAt: new Date(), paymentPendingExpiresAt: new Date(Date.now() + 60000) } });
    jest.mocked(paymentProvider.createCheckout).mockClear();
    const result = await request(app).post(`/api/v1/offers/${f.offer.id}/retry-payment`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(result.status).toBe(409); expect(result.body.code).toBe("PAYMENT_ATTEMPT_BLOCKED");
    expect(paymentProvider.createCheckout).not.toHaveBeenCalled();
  });

  it("keeps an ambiguous gateway failure fenced from retry and expiry cleanup", async () => {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    jest.mocked(paymentProvider.createCheckout).mockRejectedValueOnce(new Error("gateway timeout"));
    const result = await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(result.status).toBe(503); expect(result.body.code).toBe("PAYMENT_OUTCOME_UNKNOWN");
    const held = await Bid.findById(f.offer._id); expect(held?.paymentReservationId).toBeTruthy(); expect(held?.paymentOutcomeUnknown).toBe(true);
    const retry = await request(app).post(`/api/v1/offers/${f.offer.id}/retry-payment`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(retry.status).toBe(409); expect(retry.body.code).toBe("PAYMENT_OUTCOME_UNKNOWN");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentPendingExpiresAt: new Date(Date.now() - 1000) } });
    expect(await releaseExpiredPaymentHold(f.requirement._id)).toBe(false);
    expect((await Request.findById(f.requirement._id))?.status).toBe("awaiting_payment");
  });

  it("a late checkout failure cannot release a newer reservation for the same offer", async () => {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    let started!: () => void;
    let rejectCheckout!: (error: Error) => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const checkout = new Promise<object>((_resolve, reject) => { rejectCheckout = reject; });
    jest.mocked(paymentProvider.createCheckout).mockImplementationOnce(() => { started(); return checkout; });
    const pending = request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({ cnic: "4210112345671" }).then((response) => response);
    await entered;
    const old = await Bid.findById(f.offer._id);
    expect(old?.paymentReservationId).toBeTruthy();
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentReservationId: "new-reservation-fixture", paymentPendingExpiresAt: new Date(Date.now() + 86400000) } });
    rejectCheckout(new Error("fixture checkout failure"));
    const res = await pending;
    expect(res.status).toBe(503);
    expect((await Request.findById(f.requirement._id))?.status).toBe("awaiting_payment");
    const after = await Bid.findById(f.offer._id);
    expect(after?.status).toBe("payment_pending");
    expect(after?.paymentReservationId).toBe("new-reservation-fixture");
  });

  it("releases its own reservation when checkout fails before dispatch", async () => {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    jest.mocked(paymentProvider.createCheckout).mockRejectedValueOnce(Object.assign(new Error("missing phone"), { code: "PHONE_REQUIRED", statusCode: 422 }));
    const res = await request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({ cnic: "4210112345671" });
    expect(res.status).toBe(422);
    const requirement = await Request.findById(f.requirement._id);
    const offer = await Bid.findById(f.offer._id);
    expect(requirement?.status).toBe("receiving_offers");
    expect(requirement?.acceptedOffer).toBeUndefined();
    expect(offer?.status).toBe("submitted");
    expect(offer?.paymentReservationId).toBeUndefined();
  });

  it("does not expose a late checkout URL after a different reservation supersedes it", async () => {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    let started!: () => void; let resolveCheckout!: (result: object) => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const checkout = new Promise<object>((resolve) => { resolveCheckout = resolve; });
    jest.mocked(paymentProvider.createCheckout).mockImplementationOnce(() => { started(); return checkout; });
    const pending = request(app).post(`/api/v1/offers/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({ cnic: "4210112345671" }).then((response) => response);
    await entered;
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentReservationId: "new-reservation-fixture" } });
    resolveCheckout({ sessionId: "obsolete-session", clientSecret: "cs_obsolete", publishableKey: "pk_obsolete" });
    const res = await pending;
    expect(res.status).toBe(409);
    expect(res.body.sessionId).toBeUndefined();
    expect((await Bid.findById(f.offer._id))?.paymentReservationId).toBe("new-reservation-fixture");
  });

  it("releases the selected expired hold and clears its request snapshot atomically", async () => {
    const f = await fixture("payment_pending");
    await Request.updateOne({ _id: f.requirement._id }, { $set: { status: "awaiting_payment", acceptedOffer: f.offer._id, finalAgreedRate: 1000 } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentPendingExpiresAt: new Date(Date.now() - 1000), paymentReservationId: "expired-fixture" } });
    await releaseExpiredPaymentHold(f.requirement._id);
    const requirement = await Request.findById(f.requirement._id);
    const bid = await Bid.findById(f.offer._id);
    expect(requirement?.status).toBe("open");
    expect(requirement?.acceptedOffer).toBeUndefined();
    expect(bid?.status).toBe("submitted");
    expect(bid?.paymentReservationId).toBeUndefined();
  });

  it("does not release an expired offer when a different offer is selected", async () => {
    const f = await fixture("payment_pending");
    const other = await User.create({ name: "Other", email: `other-${Date.now()}-${Math.random()}@test.local`, password: "password123", role: "tutor" });
    const selected = await Bid.create({ request: f.requirement._id, tutor: other._id, amount: 1000, initialStudentRate: 1000, message: "Other offer", status: "payment_pending", expiresAt: new Date(Date.now() + 86400000), paymentPendingExpiresAt: new Date(Date.now() + 86400000) });
    await Request.updateOne({ _id: f.requirement._id }, { $set: { status: "awaiting_payment", acceptedOffer: selected._id } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { paymentPendingExpiresAt: new Date(Date.now() - 1000) } });
    await releaseExpiredPaymentHold(f.requirement._id);
    expect((await Request.findById(f.requirement._id))?.acceptedOffer?.toString()).toBe(selected.id);
    expect((await Bid.findById(selected._id))?.status).toBe("payment_pending");
    expect((await Bid.findById(f.offer._id))?.status).toBe("payment_pending");
  });

  it("a tutor accepting a direct request notifies the student without opening tutor checkout", async () => {
    const f = await fixture("submitted");
    await Request.updateOne({ _id: f.requirement._id }, { $set: { isDirect: true, targetTutor: f.tutor._id } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    jest.mocked(paymentProvider.createCheckout).mockClear();
    const res = await request(app).patch(`/api/v1/requests/${f.requirement.id}/bids/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.tutorToken}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeUndefined();
    expect(jest.mocked(paymentProvider.createCheckout)).not.toHaveBeenCalled();
    const requirement = await Request.findById(f.requirement._id);
    const bid = await Bid.findById(f.offer._id);
    expect(requirement?.status).toBe("awaiting_payment");
    expect(requirement?.acceptedOffer?.toString()).toBe(f.offer.id);
    expect(bid?.paymentReservationId).toBeTruthy();
  });

  it("keeps an ambiguous legacy checkout on hold instead of allowing a duplicate", async () => {
    const f = await fixture("submitted");
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    jest.mocked(paymentProvider.createCheckout).mockRejectedValueOnce(new Error("gateway timeout"));
    const result = await request(app).patch(`/api/v1/requests/${f.requirement.id}/bids/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(result.status).toBe(503); expect(result.body.code).toBe("PAYMENT_OUTCOME_UNKNOWN");
    const held = await Bid.findById(f.offer._id); expect(held?.paymentReservationId).toBeTruthy(); expect(held?.paymentOutcomeUnknown).toBe(true);
    expect((await Request.findById(f.requirement._id))?.acceptedOffer?.toString()).toBe(f.offer.id);
  });

  it("allows only one direct-booking checkout to be dispatched", async () => {
    const f = await fixture("submitted");
    await Request.updateOne({ _id: f.requirement._id }, { $set: { isDirect: true, targetTutor: f.tutor._id } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const accepted = await request(app).patch(`/api/v1/requests/${f.requirement.id}/bids/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.tutorToken}`).send({});
    expect(accepted.status).toBe(200); expect(accepted.body.bookingId).toBeTruthy();
    jest.mocked(paymentProvider.createCheckout).mockClear();
    const checkout = () => request(app).post(`/api/v1/payments/booking/${accepted.body.bookingId}/checkout`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    const results = await Promise.all([checkout(), checkout()]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]); expect(paymentProvider.createCheckout).toHaveBeenCalledTimes(1);
  });

  it("legacy acceptance refuses missing student payment details without reserving", async () => {
    const f = await fixture("submitted");
    await User.updateOne({ _id: f.student._id }, { $unset: { phone: "" } });
    await Bid.updateOne({ _id: f.offer._id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    const res = await request(app).patch(`/api/v1/requests/${f.requirement.id}/bids/${f.offer.id}/accept`).set("Authorization", `Bearer ${f.studentToken}`).send({});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("PHONE_REQUIRED");
    expect((await Request.findById(f.requirement._id))?.status).toBe("open");
    expect((await Bid.findById(f.offer._id))?.status).toBe("submitted");
  });
});
