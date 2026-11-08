import { getAllBookings, getAnalytics, updatePaymentStatus } from "../controllers/admin.controller";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import AuditLog from "../models/AuditLog.model";

jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("admin financial updates", () => {
  it("keeps analytics totals separate by currency and flags records without currency", async () => {
    const now = new Date();
    const tutorA = await User.create({ name: "Tutor A", email: "analytics-a@example.test", password: "password123", role: "tutor" });
    const tutorB = await User.create({ name: "Tutor B", email: "analytics-b@example.test", password: "password123", role: "tutor" });
    await Booking.collection.insertMany([
      { tutor: tutorA._id, status: "completed", paymentStatus: "confirmed", payoutStatus: "pending", currency: "USD", studentTotal: 100, platformFee: 20, tutorPayout: 80, createdAt: now },
      { tutor: tutorA._id, status: "completed", paymentStatus: "confirmed", payoutStatus: "pending", currency: "PKR", studentTotal: 200, platformFee: 40, tutorPayout: 160, createdAt: now },
      { tutor: tutorB._id, status: "completed", paymentStatus: "confirmed", payoutStatus: "paid", studentTotal: 300, createdAt: now },
    ] as any);
    const res = response();
    await getAnalytics({ query: {} } as any, res as any);
    const data = res.json.mock.calls[0][0];
    const overview = data.overview;
    expect(overview.financialByCurrency.USD).toMatchObject({ revenueThisMonth: 100, platformFeeThisMonth: 20, pendingPayouts: 80 });
    expect(overview.financialByCurrency.PKR).toMatchObject({ revenueThisMonth: 200, platformFeeThisMonth: 40, pendingPayouts: 160 });
    expect(overview.missingCurrencyRecords).toBe(1);
    expect(overview.revenueThisMonth).toBeUndefined();
    expect(data.bookingStatusBreakdown.completed).toBe(3);
    expect(data.topTutors).toEqual([{ name: "Tutor A", count: 2 }, { name: "Tutor B", count: 1 }]);
    expect(data.signupTrend.reduce((total: number, week: { count: number }) => total + week.count, 0)).toBe(2);
  });
  it("does not turn missing historical financial amounts into defaults in the admin listing", async () => {
    await Booking.collection.insertOne({ status: "completed", amount: 100, createdAt: new Date() } as any);
    const res = response();
    await getAllBookings({ query: {} } as any, res as any);
    const row = res.json.mock.calls[0][0].bookings[0];
    expect(row.platformFee).toBeUndefined();
    expect(row.tutorPayout).toBeUndefined();
    expect(row.studentTotal).toBeUndefined();
  });
  it.each([
    [{ paymentStatus: "confirmed", payoutStatus: "approved" }, ["payment.manage"]],
    [{ paymentStatus: "confirmed", payoutNote: "Change payout note" }, ["payment.manage"]],
    [{ paymentNote: "Change payment note", payoutStatus: "approved" }, ["payout.approve"]],
  ])("requires every permission when payment and payout fields are combined", async (body, permissions) => {
    const res = response();
    await updatePaymentStatus({ body, user: { adminPermissions: permissions } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "PERMISSION_DENIED" }));
  });

  it("preserves the original confirmation time when a dispute is resolved", async () => {
    const student = await User.create({ name: "Student", email: "student-finance@example.test", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor", email: "tutor-finance@example.test", password: "password123", role: "tutor" });
    const original = new Date("2026-01-01T12:00:00Z");
    const booking = await Booking.create({ student: student._id, tutor: tutor._id, amount: 100, finalAgreedRate: 100, subtotal: 100, studentTotal: 100, tutorNet: 80, feeConfig: { tutorFeePercent: 20 }, schedule: "Monday", teachingMode: "online", paymentStatus: "disputed", paymentConfirmedAt: original });
    const res = response();
    await updatePaymentStatus({ body: { paymentStatus: "confirmed" }, params: { id: booking.id }, user: { adminRole: "super_admin" } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(200);
    expect((await Booking.findById(booking.id))?.paymentConfirmedAt?.toISOString()).toBe(original.toISOString());
  });

  it("rejects a financial update when the booking changes before the write", async () => {
    const student = await User.create({ name: "Student", email: "student-race@example.test", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor", email: "tutor-race@example.test", password: "password123", role: "tutor" });
    const booking = await Booking.create({ student: student._id, tutor: tutor._id, amount: 100, finalAgreedRate: 100, subtotal: 100, studentTotal: 100, tutorNet: 80, feeConfig: { tutorFeePercent: 20 }, schedule: "Monday", teachingMode: "online", paymentStatus: "received" });
    const update = jest.spyOn(Booking, "findOneAndUpdate").mockReturnValue({ populate: () => ({ populate: async () => null }) } as any);
    try {
      const res = response();
      await updatePaymentStatus({ body: { paymentStatus: "confirmed" }, params: { id: booking.id }, user: { adminRole: "super_admin" } } as any, res as any);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "FINANCIAL_STATE_CHANGED" }));
      expect((await Booking.findById(booking.id))?.paymentStatus).toBe("received");
    } finally { update.mockRestore(); }
  });

  it("rolls back the financial update if its audit event cannot be stored", async () => {
    const student = await User.create({ name: "Student", email: "student-audit@example.test", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor", email: "tutor-audit@example.test", password: "password123", role: "tutor" });
    const booking = await Booking.create({ student: student._id, tutor: tutor._id, amount: 100, finalAgreedRate: 100, subtotal: 100, studentTotal: 100, tutorNet: 80, feeConfig: { tutorFeePercent: 20 }, schedule: "Monday", teachingMode: "online", paymentStatus: "received" });
    const audit = jest.spyOn(AuditLog, "create").mockRejectedValueOnce(new Error("Audit unavailable") as never);
    try {
      await expect(updatePaymentStatus({ body: { paymentStatus: "confirmed" }, params: { id: booking.id }, user: { adminRole: "super_admin" } } as any, response() as any)).rejects.toThrow("Audit unavailable");
      expect((await Booking.findById(booking.id))?.paymentStatus).toBe("received");
    } finally { audit.mockRestore(); }
  });

  it("blocks legacy payment confirmation when the student account is missing", async () => {
    const student = await User.create({ name: "Student", email: "student-missing@example.test", password: "password123", role: "student" });
    const tutor = await User.create({ name: "Tutor", email: "tutor-missing@example.test", password: "password123", role: "tutor" });
    const booking = await Booking.create({ student: student._id, tutor: tutor._id, amount: 100, finalAgreedRate: 100, subtotal: 100, studentTotal: 100, tutorNet: 80, feeConfig: { tutorFeePercent: 20 }, schedule: "Monday", teachingMode: "online", paymentStatus: "received" });
    await User.deleteOne({ _id: student._id });
    const res = response();
    await updatePaymentStatus({ body: { paymentStatus: "confirmed" }, params: { id: booking.id }, user: { adminRole: "super_admin" } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "STUDENT_ACCOUNT_UNAVAILABLE" }));
    expect((await Booking.findById(booking.id))?.paymentStatus).toBe("received");
  });

  it("requires guardian reconciliation for a minor's legacy booking without offer links", async () => {
    const student = await User.create({ name: "Student", email: "student-minor@example.test", password: "password123", role: "student", isMinor: true });
    const tutor = await User.create({ name: "Tutor", email: "tutor-minor@example.test", password: "password123", role: "tutor" });
    const booking = await Booking.create({ student: student._id, tutor: tutor._id, amount: 100, finalAgreedRate: 100, subtotal: 100, studentTotal: 100, tutorNet: 80, feeConfig: { tutorFeePercent: 20 }, schedule: "Monday", teachingMode: "online", paymentStatus: "received" });
    const res = response();
    await updatePaymentStatus({ body: { paymentStatus: "confirmed" }, params: { id: booking.id }, user: { adminRole: "super_admin" } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "PARENT_POLICY_RECONCILIATION_REQUIRED" }));
    expect((await Booking.findById(booking.id))?.paymentStatus).toBe("received");
  });
});
