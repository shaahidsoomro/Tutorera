import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User.model";
import AccountEnforcement from "../models/AccountEnforcement.model";

async function makeUser(role: "admin" | "student", extra: Record<string, unknown> = {}) {
  const user = await User.create({
    name: `${role}-${Math.random()}`,
    email: `${role}-${Math.random()}@test.local`,
    password: "password123",
    role,
    ...extra,
  });
  return { user, token: jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: "1h" }) };
}

describe("admin account enforcement route", () => {
  it("uses one auditable implementation for suspend and legacy reactivation", async () => {
    const admin = await makeUser("admin", { adminRole: "super_admin" });
    const target = await makeUser("student", { countryCode: "PK" });
    const enforcementPath = `/api/v1/admin/users/${target.user.id}/enforcement`;

    const suspended = await request(app)
      .post(enforcementPath)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ action: "suspend", reason: "Awaiting safety review" })
      .expect(200);
    expect(suspended.body.user).toMatchObject({ isActive: false, moderationStatus: "suspended" });

    const reinstated = await request(app)
      .patch(`/api/v1/admin/users/${target.user.id}/moderate`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ action: "reactivate", reason: "Review completed" })
      .expect(200);
    expect(reinstated.body.user).toMatchObject({ isActive: true, moderationStatus: "active" });

    const rows = await AccountEnforcement.find({ user: target.user._id }).sort("createdAt").lean();
    expect(rows.map((row) => row.action)).toEqual(["suspended", "reinstated"]);
    const history = await request(app)
      .get(`/api/v1/admin/users/${target.user.id}/enforcement-history`)
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
    expect(history.body.history).toHaveLength(2);
  });
});
