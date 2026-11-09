import request from "supertest";
import app from "../app";
import User from "../models/User.model";
import Blog from "../models/Blog.model";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-at-least-16-chars";
});

describe("PUT /blogs/:id (updateBlog)", () => {
  async function adminAgent() {
    const admin = await User.create({ name: "Admin", email: "blog-update-admin@test.com", password: "password123", role: "admin" });
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/login").send({ email: admin.email, password: "password123" }).expect(200);
    return { agent, admin };
  }

  it("ignores author, _id, and isPublished spoofing attempts (mass-assignment guard)", async () => {
    const { agent, admin } = await adminAgent();
    const someoneElse = await User.create({ name: "Someone Else", email: "someone-else@test.com", password: "password123", role: "admin" });
    const blog = await Blog.create({ title: "Original", slug: "mass-assign-guard", content: "content", excerpt: "e", author: admin._id, isPublished: true });

    const res = await agent.put(`/api/v1/blogs/${blog._id}`).send({
      title: "Updated Title",
      author: someoneElse._id.toString(), // should be ignored - not in the whitelist
      _id: "000000000000000000000000", // should be ignored
      isPublished: false, // IS whitelisted - this one should apply
    }).expect(200);

    expect(res.body.blog.title).toBe("Updated Title");
    expect(res.body.blog.author.toString()).toBe(admin._id.toString()); // unchanged despite the spoof attempt
    expect(res.body.blog._id.toString()).toBe(blog._id.toString()); // unchanged
    expect(res.body.blog.isPublished).toBe(false); // legitimate whitelisted field did apply
  });

  it("rejects changing slug to one already used by another post", async () => {
    const { agent } = await adminAgent();
    const admin2 = await User.create({ name: "Admin2", email: "blog-update-admin2@test.com", password: "password123", role: "admin" });
    await Blog.create({ title: "Taken", slug: "already-taken-slug", content: "content", excerpt: "e", author: admin2._id, isPublished: true });
    const blog = await Blog.create({ title: "Mine", slug: "my-own-slug", content: "content", excerpt: "e", author: admin2._id, isPublished: true });

    const res = await agent.put(`/api/v1/blogs/${blog._id}`).send({ slug: "already-taken-slug" }).expect(409);
    expect(res.body.success).toBe(false);
  });

  it("allows keeping a post's own unchanged slug", async () => {
    const { agent, admin } = await adminAgent();
    const blog = await Blog.create({ title: "Keep Slug", slug: "keep-my-slug", content: "content", excerpt: "e", author: admin._id, isPublished: true });

    const res = await agent.put(`/api/v1/blogs/${blog._id}`).send({ slug: "keep-my-slug", title: "Keep Slug Updated" }).expect(200);
    expect(res.body.blog.slug).toBe("keep-my-slug");
    expect(res.body.blog.title).toBe("Keep Slug Updated");
  });
});
