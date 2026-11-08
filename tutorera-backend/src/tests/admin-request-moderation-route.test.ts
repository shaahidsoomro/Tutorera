import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import RequestStatusHistory from "../models/RequestStatusHistory.model";

async function admin(adminRole: "marketplace_operations" | "support") {
  const user = await User.create({
    name: adminRole,
    email: `moderation-${adminRole}-${Math.random()}@test.local`,
    password: "password123",
    role: "admin",
    adminRole,
  });
  return {
    user,
    token: jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" }),
  };
}

describe("admin marketplace request moderation route", () => {
  it("requires request.moderate and records a held request atomically", async () => {
    const operator = await admin("marketplace_operations");
    const support = await admin("support");
    const student = await User.create({ name: "Student", email: `moderation-student-${Math.random()}@test.local`, password: "password123", role: "student", countryCode: "PK" });
    const tutor = await User.create({ name: "Tutor", email: `moderation-tutor-${Math.random()}@test.local`, password: "password123", role: "tutor", countryCode: "PK" });
    const tuitionRequest = await Request.create({
      student: student._id,
      subject: "Mathematics",
      level: "Matric",
      description: "Need help with maths",
      budget: 1000,
      currency: "PKR",
      schedule: "Evenings",
      teachingMode: "online",
      countryCode: "PK",
      status: "open",
    });
    const offer = await Bid.create({
      request: tuitionRequest._id,
      tutor: tutor._id,
      amount: 1000,
      initialStudentRate: 1000,
      currency: "PKR",
      message: "I can help",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const path = `/api/v1/admin/marketplace/requests/${tuitionRequest.id}/moderation`;
    await request(app)
      .post(path)
      .set("Authorization", `Bearer ${support.token}`)
      .send({ action: "hold", reason: "Safety review", countryCode: "PK" })
      .expect(403);

    const response = await request(app)
      .post(path)
      .set("Authorization", `Bearer ${operator.token}`)
      .send({ action: "hold", reason: "Safety review", countryCode: "PK" })
      .expect(200);

    expect(response.body.request).toMatchObject({ status: "closed", moderationStatus: "held", moderationReason: "Safety review" });
    expect((await Bid.findById(offer._id))?.status).toBe("not_selected");
    const history = await RequestStatusHistory.findOne({ request: tuitionRequest._id }).lean();
    expect(history).toMatchObject({ fromStatus: "open", toStatus: "closed", action: "hold", reason: "Safety review" });

    const timeline = await request(app)
      .get(`/api/v1/admin/marketplace/requests/${tuitionRequest.id}/moderation-history`)
      .set("Authorization", `Bearer ${operator.token}`)
      .expect(200);
    expect(timeline.body.history).toHaveLength(1);
  });
});
