import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../app";
import User from "../models/User.model";
import TutorProfile from "../models/TutorProfile.model";
import SchoolOffering from "../models/SchoolOffering.model";
import Request from "../models/Request.model";
import { MatchingService } from "../services/matching.service";

jest.mock("../services/market.service", () => ({ ...jest.requireActual("../services/market.service"), resolveMarket: jest.fn().mockResolvedValue({ countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi", isActive: true, studentRegistration: true, onlineEnabled: true, homeTuitionEnabled: true }), assertMarketFeature: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../services/locationReference.service", () => ({ resolveLocationReferences: jest.fn().mockResolvedValue({}) }));
jest.mock("../services/tracking.service", () => ({ ...jest.requireActual("../services/tracking.service"), isMarketplaceEligible: jest.fn().mockReturnValue(true), isHomeTuitionEligible: jest.fn().mockReturnValue(true) }));
jest.mock("../utils/sendEmail", () => jest.fn().mockResolvedValue(undefined));
jest.mock("../utils/socket", () => ({ sendNotification: jest.fn().mockResolvedValue(undefined) }));

const token = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
async function offering(status: "active" | "inactive" = "active") {
 const id = `fbise:ssc:class-9:math-${new mongoose.Types.ObjectId()}`;
 await SchoolOffering.create({ _id: id, boardCode: "fbise", boardName: "FBISE", qualificationCode: "ssc", qualificationName: "SSC / Matric", classLevel: "Class 9", subjectRef: new mongoose.Types.ObjectId(), subject: "Mathematics", subjectDisplay: "Mathematics", approvalLevel: "Matric (9th & 10th)", status });
 return id;
}
async function user(role: "student" | "tutor") { return User.create({ name: role, email: `${new mongoose.Types.ObjectId()}@test.local`, password: "password123", role, isActive: true }); }
const payload = { subject: "Physics", level: "University / Degree", description: "Need help studying algebra", budget: 20, teachingMode: "online", schedule: "Evenings", countryCode: "PK" };

describe("school catalogue marketplace integration", () => {
 beforeEach(() => { jest.spyOn(MatchingService, "dispatchProgressiveNotifications").mockResolvedValue({ notifiedCount: 0, tier1Count: 0 } as any); });
 afterEach(() => jest.restoreAllMocks());
 it("creates requests using authoritative offering snapshots and rejects inactive offerings", async () => {
   const student = await user("student"); const id = await offering();
   const post = (schoolOfferingId: string) => request(app).post("/api/v1/requests").set("Authorization", `Bearer ${token(student.id)}`).send({ ...payload, schoolOfferingId, curriculum: "untrusted" });
   const created = await post(id); expect(created.status).toBe(201); expect(created.body.request).toMatchObject({ subject: "Mathematics", level: "Matric (9th & 10th)", schoolBoard: "FBISE", schoolClass: "Class 9", schoolOfferingId: id });
   const inactive = await offering("inactive"); const denied = await post(inactive); expect(denied.status).toBe(422); expect(denied.body.code).toBe("SCHOOL_OFFERING_UNAVAILABLE"); expect(await Request.countDocuments()).toBe(1);
 });
 it("restricts preference changes and the tutor feed to approved exact offerings", async () => {
   const tutor = await user("tutor"); const student = await user("student"); const id = await offering(); const other = await offering();
   await TutorProfile.create({ user: tutor._id, teachingMode: "online", subjects: ["Mathematics"], subjectEligibility: [{subject: "Mathematics", status: "approved", levels: ["Matric (9th & 10th)"]}] });
   const put = (ids: string[]) => request(app).put("/api/v1/tutors/school-offerings/me").set("Authorization", `Bearer ${token(tutor.id)}`).send({schoolOfferingIds: ids});
   expect((await put([id])).status).toBe(200);
   const base = { student: student._id, subject: "Mathematics", level: "Matric (9th & 10th)", description: "Need help with algebra", budget: 20, schedule: "Evenings", teachingMode: "online", status: "open", expiresAt: new Date(Date.now()+86400000) };
   await Request.create([{ ...base, schoolOfferingId: id }, { ...base, schoolOfferingId: other }, base]);
   const result = await request(app).get("/api/v1/requests").set("Authorization", `Bearer ${token(tutor.id)}`); expect(result.status).toBe(200); expect(result.body.requests).toHaveLength(2); expect(result.body.requests.some((r: any) => r.schoolOfferingId === other)).toBe(false);
   await SchoolOffering.updateOne({_id:id}, {$set:{status:"inactive"}}); expect((await put([id])).status).toBe(422);
   const after = await request(app).get("/api/v1/requests").set("Authorization", `Bearer ${token(tutor.id)}`); expect(after.body.requests).toHaveLength(1);
 });
});
