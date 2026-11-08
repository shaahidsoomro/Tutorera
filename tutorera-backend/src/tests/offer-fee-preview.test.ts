import { Response } from "express";
import User from "../models/User.model";
import Request from "../models/Request.model";
import { previewOfferFees } from "../controllers/request.controller";
import { AuthRequest } from "../types";

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
}

async function setup(overrides: Record<string, unknown> = {}) {
  const student = await User.create({ name: "Student", email: `s${Date.now()}${Math.random()}@test.com`, password: "password123", role: "student" });
  const tutor = await User.create({ name: "Tutor", email: `t${Date.now()}${Math.random()}@test.com`, password: "password123", role: "tutor" });
  const request = await Request.create({
    student: student._id, subject: "Math", level: "Matric", description: "Need help", budget: 1000,
    schedule: "Evenings", status: "open", countryCode: "PK", currency: "PKR", ...overrides,
  });
  return { tutor, request };
}

function call(tutorId: unknown, requestId: unknown, amount: unknown) {
  const res = mockResponse();
  const req = { params: { id: String(requestId) }, body: { amount }, user: { _id: tutorId, role: "tutor" } } as unknown as AuthRequest;
  return previewOfferFees(req, res).then(() => res);
}

describe("POST /requests/:id/fee-preview", () => {
  it("returns a market quote whose net matches fee and tax", async () => {
    const { tutor, request } = await setup();
    const res = await call(tutor._id, request._id, 1000);
    expect(res.status).not.toHaveBeenCalled();
    const { quote } = res.json.mock.calls[0][0];
    expect(quote.currency).toBe("PKR");
    expect(quote.subtotal).toBe(1000);
    expect(quote.tutorNet).toBe(quote.subtotal - quote.tutorFee - quote.tax);
  });

  it("rejects invalid amounts", async () => {
    const { tutor, request } = await setup();
    expect((await call(tutor._id, request._id, -5)).status).toHaveBeenCalledWith(422);
    expect((await call(tutor._id, request._id, "1000")).status).toHaveBeenCalledWith(422);
  });

  it("refuses a quote when the market currency does not match the request", async () => {
    const { tutor, request } = await setup({ currency: "USD" });
    const res = await call(tutor._id, request._id, 1000);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "FEE_CURRENCY_MISMATCH" }));
  });

  it("does not reveal another tutor's direct request", async () => {
    const other = await User.create({ name: "Other", email: `o${Date.now()}@test.com`, password: "password123", role: "tutor" });
    const { tutor, request } = await setup({ isDirect: true, targetTutor: other._id });
    expect((await call(tutor._id, request._id, 1000)).status).toHaveBeenCalledWith(404);
  });
});
