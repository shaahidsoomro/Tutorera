import request from "supertest";
import mongoose from "mongoose";
import app from "../app";

describe("canonical API deployment health checks", () => {
  it("returns a non-cached liveness response", async () => {
    const res = await request(app).get("/health/live").expect(200);
    expect(res.body).toEqual({ status: "alive" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });
  it("reports ready when the database is connected", async () => {
    expect(mongoose.connection.readyState).toBe(1);
    const res = await request(app).get("/health/ready").expect(200);
    expect(res.body).toEqual({ status: "ready" });
  });
});
