import request from "supertest";
import app from "../app";
import User from "../models/User.model";

beforeAll(() => { process.env.JWT_SECRET = "test-secret-at-least-16-chars"; });

async function signIn(adminRole: "super_admin" | "support") {
  const email = `${adminRole}-${Date.now()}-${Math.random()}@test.com`;
  await User.create({ name: "Payout Admin", email, password: "password123", role: "admin", adminRole });
  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({ email, password: "password123" }).expect(200);
  return agent;
}

describe("admin tutor-payout routes are read-only", () => {
  it("requires authentication and the payout.read permission", async () => {
    await request(app).get("/api/v1/admin/tutor-payouts").expect(401);
    await (await signIn("support")).get("/api/v1/admin/tutor-payouts").expect(403);
  });

  it("lets a finance-capable admin list payouts and read the queue summary", async () => {
    const admin = await signIn("super_admin");
    const list = await admin.get("/api/v1/admin/tutor-payouts").expect(200);
    expect(list.body).toMatchObject({ success: true, total: 0, items: [] });
    const queue = await admin.get("/api/v1/admin/tutor-payouts/queue").expect(200);
    expect(queue.body.result).toMatchObject({ scanned: 0, processed: 0, failed: 0 });
    await admin.get("/api/v1/admin/tutor-payouts?tutorId=not-an-id").expect(400);
  });

  it("does not expose any route that settles or creates payouts", async () => {
    const admin = await signIn("super_admin");
    await admin.post("/api/v1/admin/tutor-payouts/PYOUT-X/complete").send({ evidenceRef: "BANK-REF-0001" }).expect(404);
    await admin.post("/api/v1/admin/tutor-payouts/PYOUT-X/fail").send({ adminNote: "refused by bank" }).expect(404);
    await admin.post("/api/v1/admin/tutor-payouts/scan?apply=true").expect(404);
  });
});
