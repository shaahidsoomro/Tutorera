/**
 * Unit tests for payout.service.ts
 *
 * Verifies: currency-qualified thresholds, in-flight deduplication, unique
 * transferRef generation, evidence-required completion, note-required failure,
 * and booking state transitions.
 *
 * No real MongoDB — all models are mocked so this runs on any environment.
 */

/** Returns a mongoose-like query stub that supports .select().limit().lean() chains. */
function mockQuery(value: unknown) {
  const q: Record<string, unknown> = {};
  q.select = jest.fn().mockReturnValue(q);
  q.limit = jest.fn().mockReturnValue(q);
  q.lean = jest.fn().mockResolvedValue(value);
  return q;
}

jest.mock("../models/Booking.model", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("../models/PaymentLedger.model", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("../models/TutorPayout.model", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  return { ...actual, startSession: jest.fn() };
});

import mongoose from "mongoose";
import Booking from "../models/Booking.model";
import TutorPayout from "../models/TutorPayout.model";
import PaymentLedger from "../models/PaymentLedger.model";
import {
  createPayoutRequests,
  markPayoutComplete,
  markPayoutFailed,
} from "../services/payout.service";

const tutorId = new mongoose.Types.ObjectId();
const bookingId = new mongoose.Types.ObjectId();
const ledgerId = new mongoose.Types.ObjectId();
const payoutId = new mongoose.Types.ObjectId();

function makeMockSession() {
  return {
    withTransaction: jest.fn().mockImplementation(async (fn: () => Promise<void>) => fn()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
}

describe("createPayoutRequests", () => {
  let session: ReturnType<typeof makeMockSession>;

  beforeEach(() => {
    jest.clearAllMocks();
    session = makeMockSession();
    (mongoose.startSession as jest.Mock).mockResolvedValue(session);
    (TutorPayout.find as jest.Mock).mockReturnValue(mockQuery([]));
    (PaymentLedger.create as jest.Mock).mockResolvedValue([{ _id: ledgerId }]);
    (TutorPayout.create as jest.Mock).mockResolvedValue([{ _id: payoutId }]);
  });

  it("skips bookings below the currency minimum (PKR 2500)", async () => {
    (Booking.find as jest.Mock).mockReturnValue(mockQuery([{
      _id: bookingId, tutor: tutorId, tutorPayout: 2000, currency: "PKR",
    }]));
    const result = await createPayoutRequests();
    expect(result.skippedBelowThreshold).toBe(1);
    expect(result.requested).toBe(0);
    expect(TutorPayout.create).not.toHaveBeenCalled();
  });

  it("creates a payout request for a PKR booking above threshold", async () => {
    (Booking.find as jest.Mock).mockReturnValue(mockQuery([{
      _id: bookingId, tutor: tutorId, tutorPayout: 3000, currency: "PKR",
    }]));
    const result = await createPayoutRequests();
    expect(result.requested).toBe(1);
    expect(result.skippedBelowThreshold).toBe(0);
    expect(TutorPayout.create).toHaveBeenCalledTimes(1);
    const [[payoutDoc]] = (TutorPayout.create as jest.Mock).mock.calls[0];
    expect(payoutDoc.currency).toBe("PKR");
    expect(payoutDoc.totalAmount).toBe(3000);
    expect(payoutDoc.transferRef).toMatch(/^PYOUT-/);
    expect(payoutDoc.state).toBe("requested");
  });

  it("applies USD default minimum (10) for unknown currencies", async () => {
    (Booking.find as jest.Mock).mockReturnValue(mockQuery([{
      _id: bookingId, tutor: tutorId, tutorPayout: 5, currency: "XYZ",
    }]));
    const result = await createPayoutRequests();
    expect(result.skippedBelowThreshold).toBe(1);
  });

  it("skips bookings already under an in-flight payout", async () => {
    (TutorPayout.find as jest.Mock).mockReturnValue(mockQuery([{ bookings: [bookingId] }]));
    (Booking.find as jest.Mock).mockReturnValue(mockQuery([{
      _id: bookingId, tutor: tutorId, tutorPayout: 50, currency: "USD",
    }]));
    const result = await createPayoutRequests();
    expect(result.skippedAlreadyPending).toBe(1);
    expect(TutorPayout.create).not.toHaveBeenCalled();
  });

  it("generates unique transferRef values per call", async () => {
    (Booking.find as jest.Mock).mockReturnValue(mockQuery([{
      _id: bookingId, tutor: tutorId, tutorPayout: 50, currency: "USD",
    }]));
    await createPayoutRequests();
    await createPayoutRequests();
    const refs = (TutorPayout.create as jest.Mock).mock.calls.map(([docs]: [Array<{ transferRef: string }>]) => docs[0].transferRef);
    expect(refs[0]).not.toBe(refs[1]);
  });

  it("calls endSession even when the transaction throws", async () => {
    session.withTransaction.mockRejectedValue(new Error("DB failure"));
    (Booking.find as jest.Mock).mockReturnValue(mockQuery([{
      _id: bookingId, tutor: tutorId, tutorPayout: 50, currency: "USD",
    }]));
    const result = await createPayoutRequests();
    expect(result.failed).toBe(1);
    expect(session.endSession).toHaveBeenCalled();
  });
});

describe("markPayoutComplete", () => {
  let session: ReturnType<typeof makeMockSession>;
  const initiator = new mongoose.Types.ObjectId();
  const reviewer = new mongoose.Types.ObjectId();
  const REF = "BANK-TXN-0001";
  const basePayout = {
    _id: payoutId,
    transferRef: "PYOUT-TEST",
    tutor: tutorId,
    bookings: [bookingId],
    currency: "USD",
    totalAmount: 50,
    state: "initiated",
    initiatedBy: initiator,
    settlementReference: REF,
    ledgerEntry: ledgerId,
  };
  const complete = (over: Partial<Parameters<typeof markPayoutComplete>[0]> = {}) =>
    markPayoutComplete({ transferRef: "PYOUT-TEST", evidenceRef: "STATEMENT-LINE-77", settlementReference: REF, adminId: reviewer.toString(), ...over });

  beforeEach(() => {
    jest.clearAllMocks();
    session = makeMockSession();
    (mongoose.startSession as jest.Mock).mockResolvedValue(session);
    (TutorPayout.findOne as jest.Mock).mockResolvedValue({ ...basePayout, save: jest.fn().mockResolvedValue(undefined) });
  });

  it("throws when evidenceRef is blank or too short", async () => {
    await expect(complete({ evidenceRef: "  " })).rejects.toThrow("evidenceRef is required");
    await expect(complete({ evidenceRef: "short" })).rejects.toMatchObject({ statusCode: 400, code: "PAYOUT_EVIDENCE_REQUIRED" });
    expect(session.withTransaction).not.toHaveBeenCalled();
  });

  it("throws when the settlement reference is missing", async () => {
    await expect(complete({ settlementReference: "" })).rejects.toMatchObject({ statusCode: 400, code: "SETTLEMENT_REFERENCE_REQUIRED" });
  });

  it("marks payout completed and records both reviewers on the bookings + ledger", async () => {
    await complete();
    const saved = await (TutorPayout.findOne as jest.Mock).mock.results[0].value;
    expect(saved.state).toBe("completed");
    expect(saved.evidenceRef).toBe("STATEMENT-LINE-77");
    expect(Booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: [bookingId] } }),
      expect.objectContaining({
        $set: expect.objectContaining({
          payoutStatus: "paid",
          payoutSettlementReference: REF,
          payoutInitiatedBy: initiator,
          payoutVerifiedBy: reviewer,
        }),
      }),
      expect.anything()
    );
  });

  it("rejects the same admin who recorded the transfer (second reviewer required)", async () => {
    await expect(complete({ adminId: initiator.toString() })).rejects.toMatchObject({ statusCode: 403, code: "SECOND_REVIEWER_REQUIRED" });
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a settlement reference that differs from the recorded transfer", async () => {
    await expect(complete({ settlementReference: "BANK-TXN-9999" })).rejects.toMatchObject({ statusCode: 409, code: "PAYOUT_REFERENCE_MISMATCH" });
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it("rejects completing a payout whose transfer was never recorded", async () => {
    (TutorPayout.findOne as jest.Mock).mockResolvedValue({ ...basePayout, state: "requested", initiatedBy: undefined, save: jest.fn() });
    await expect(complete()).rejects.toMatchObject({ statusCode: 409, code: "PAYOUT_NOT_INITIATED" });
  });

  it("throws when payout is already completed", async () => {
    (TutorPayout.findOne as jest.Mock).mockResolvedValue({ ...basePayout, state: "completed", save: jest.fn() });
    await expect(complete()).rejects.toThrow("already completed");
  });
});

describe("markPayoutFailed", () => {
  let session: ReturnType<typeof makeMockSession>;
  const mockPayout = {
    _id: payoutId,
    transferRef: "PYOUT-TEST",
    tutor: tutorId,
    bookings: [bookingId],
    currency: "USD",
    totalAmount: 50,
    state: "requested",
    ledgerEntry: ledgerId,
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    session = makeMockSession();
    (mongoose.startSession as jest.Mock).mockResolvedValue(session);
    (TutorPayout.findOne as jest.Mock).mockResolvedValue({ ...mockPayout, save: jest.fn().mockResolvedValue(undefined) });
  });

  it("throws when adminNote is blank", async () => {
    await expect(markPayoutFailed({ transferRef: "PYOUT-TEST", adminId: "abc", adminNote: "  " }))
      .rejects.toThrow("adminNote is required");
  });

  it("returns bookings to payoutStatus=pending on failure", async () => {
    await markPayoutFailed({ transferRef: "PYOUT-TEST", adminId: tutorId.toString(), adminNote: "Bank refused" });
    expect(Booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: [bookingId] } }),
      expect.objectContaining({ $set: expect.objectContaining({ payoutStatus: "pending" }) }),
      expect.anything()
    );
    const saved = await (TutorPayout.findOne as jest.Mock).mock.results[0].value;
    expect(saved.state).toBe("failed");
  });
});
