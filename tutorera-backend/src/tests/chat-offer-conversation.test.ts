import request from "supertest";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import Booking from "../models/Booking.model";
import Bid from "../models/Bid.model";
import RequestModel from "../models/Request.model";
import Conversation from "../models/Conversation.model";

const tokenFor = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
async function makeUser(role: "student" | "tutor", suffix: string) {
  const user = await User.create({ name: `${role} ${suffix}`, email: `${role}-${suffix}@offer-chat.test`, password: "password123", role, isActive: true });
  return { user, token: tokenFor(user.id) };
}
async function seed(suffix: string, status = "submitted") {
  const student = await makeUser("student", `s-${suffix}`);
  const tutor = await makeUser("tutor", `t-${suffix}`);
  const stranger = await makeUser("student", `x-${suffix}`);
  const req = await RequestModel.create({ student: student.user._id, subject: "Physics", level: "O-Level", description: "Tuition",
    budget: 1000, schedule: "Evenings", status: "open" });
  const bid = await Bid.create({ request: req._id, tutor: tutor.user._id, amount: 1000, initialStudentRate: 1000,
    expiresAt: new Date(Date.now() + 86400000), message: "I can help", status } as never);
  return { student, tutor, stranger, bid };
}
const openOffer = (token: string, offerId: string) => request(app).post("/api/v1/chat/offer-conversation")
  .set("Authorization", `Bearer ${token}`).send({ offerId });

describe("offer-stage conversations", () => {
  it("lets both parties open the same offer conversation; strangers get 403", async () => {
    const { student, tutor, stranger, bid } = await seed("a");
    const fromStudent = await openOffer(student.token, bid.id);
    expect(fromStudent.status).toBe(200);
    expect(fromStudent.body.conversation.stage).toBe("offer");
    const fromTutor = await openOffer(tutor.token, bid.id);
    expect(fromTutor.body.conversation._id).toBe(fromStudent.body.conversation._id);
    expect((await openOffer(stranger.token, bid.id)).status).toBe(403);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it("rejects closed offers and unknown offers", async () => {
    const { student, bid } = await seed("b", "withdrawn");
    expect((await openOffer(student.token, bid.id)).status).toBe(409);
    expect((await openOffer(student.token, new Types.ObjectId().toString())).status).toBe(404);
  });

  it("the booking chat reuses the pair's offer conversation, even under concurrency", async () => {
    const { student, tutor, bid } = await seed("c");
    const offerChat = (await openOffer(student.token, bid.id)).body.conversation;
    const booking = await Booking.create({ student: student.user._id, tutor: tutor.user._id, amount: 1000, finalAgreedRate: 1000,
      pricingUnit: "hour", sessionCount: 1, subtotal: 1000, studentFee: 0, tutorFee: 200, tax: 30, studentTotal: 1000, tutorNet: 770,
      feeConfig: { version: "test" }, platformFee: 230, tutorPayout: 770, schedule: "Evening", teachingMode: "online",
      paymentStatus: "received", payoutStatus: "pending" } as never);
    const open = () => request(app).post("/api/v1/chat/conversation").set("Authorization", `Bearer ${student.token}`).send({ bookingId: booking.id });
    const results = await Promise.all([open(), open()]);
    for (const res of results) { expect(res.status).toBe(200); expect(res.body.conversation._id).toBe(offerChat._id); }
    const saved = (await Conversation.findById(offerChat._id))!;
    expect(saved.stage).toBe("booking");
    expect(saved.bookings.map(String)).toEqual([booking.id]);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it("enforces one conversation per student-tutor pair at the database level", async () => {
    await Conversation.init();
    const student = new Types.ObjectId(), tutor = new Types.ObjectId();
    await Conversation.create({ student, tutor });
    await expect(Conversation.create({ student, tutor })).rejects.toMatchObject({ code: 11000 });
  });
});
