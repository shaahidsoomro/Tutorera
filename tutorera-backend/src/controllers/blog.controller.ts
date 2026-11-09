import { Response, Request } from "express";
import { AuthRequest } from "../types";
import Blog from "../models/Blog.model";

// @desc    Create blog post
// @route   POST /api/blogs
// @access  Private (admin)
export const createBlog = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, slug, content, excerpt, coverImage, tags, isPublished } = req.body;

  if (typeof title !== "string" || !title.trim() || typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || typeof content !== "string" || !content.trim() || typeof excerpt !== "string" || !excerpt.trim()) {
    res.status(400).json({ success: false, message: "Valid title, slug, content and excerpt are required" });
    return;
  }
  const existing = await Blog.findOne({ slug });
  if (existing) {
    res.status(400).json({ success: false, message: "Slug already exists" });
    return;
  }

  const blog = await Blog.create({
    title, slug, content, excerpt,
    coverImage, tags, isPublished: isPublished === true,
    author: req.user?._id,
  });

  res.status(201).json({ success: true, message: "Blog post created", blog });
};

// @desc    Get all published blogs
// @route   GET /api/blogs
// @access  Public
const WORDS_PER_MINUTE = 200;
const DEFAULT_CATEGORY = "Guides";

function readingTime(content: unknown): string {
  const words = typeof content === "string" ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

export const getAllBlogs = async (req: Request, res: Response): Promise<void> => {
  const { page = "1", limit = "9", tag, category, featured } = req.query;
  const filter: Record<string, unknown> = { isPublished: true };
  if (tag) filter.tags = { $in: [tag] };
  if (typeof category === "string" && category) {
    // A category matches the category field or a tag of the same name, so the
    // site's tag-based category pages keep working. Posts that predate the
    // category field count as "Guides".
    filter.$or = [{ category }, { tags: category }, ...(category === DEFAULT_CATEGORY ? [{ category: { $exists: false } }, { category: null }] : [])];
  }
  if (featured === "true") filter.featured = true;

  const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(String(limit), 10) || 9));
  const skip = (pageNum - 1) * limitNum;

  const total = await Blog.countDocuments(filter);
  const docs = await Blog.find(filter)
    .populate("author", "name avatar")
    .sort("-createdAt")
    .skip(skip)
    .limit(limitNum);

  // Content is read only to derive the reading time and is never returned in listings.
  const blogs = docs.map((doc) => {
    const { content, ...rest } = doc.toJSON() as unknown as Record<string, unknown>;
    return { ...rest, category: rest.category || DEFAULT_CATEGORY, readingTime: readingTime(content) };
  });

  res.status(200).json({ success: true, total, page: pageNum, pages: Math.ceil(total / limitNum), blogs });
};

// @desc    Published categories with post counts
// @route   GET /api/blogs/categories
// @access  Public
export const getBlogCategories = async (_req: Request, res: Response): Promise<void> => {
  const rows = await Blog.aggregate<{ _id: string; count: number }>([
    { $match: { isPublished: true } },
    { $group: { _id: { $ifNull: ["$category", DEFAULT_CATEGORY] }, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  res.status(200).json({ success: true, categories: rows.map((row) => ({ category: row._id, count: row.count })) });
};

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
export const getBlogBySlug = async (req: Request, res: Response): Promise<void> => {
  const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true })
    .populate("author", "name avatar");

  if (!blog) {
    res.status(404).json({ success: false, message: "Blog post not found" });
    return;
  }

  res.status(200).json({ success: true, blog: { ...blog.toJSON(), readingTime: readingTime(blog.content) } });
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private (admin)
export const updateBlog = async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = ["title", "slug", "content", "excerpt", "coverImage", "tags", "isPublished"] as const;
  const changes: Record<string, unknown> = {};
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) changes[field] = req.body[field];
  }
  if (changes.slug !== undefined && (typeof changes.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(changes.slug))) {
    res.status(400).json({ success: false, message: "Invalid article slug" });
    return;
  }
  if (changes.isPublished !== undefined && typeof changes.isPublished !== "boolean") {
    res.status(400).json({ success: false, message: "isPublished must be a boolean" });
    return;
  }
  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    { $set: changes },
    { new: true, runValidators: true }
  );

  if (!blog) {
    res.status(404).json({ success: false, message: "Blog not found" });
    return;
  }

  res.status(200).json({ success: true, message: "Blog updated", blog });
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (admin)
export const deleteBlog = async (req: AuthRequest, res: Response): Promise<void> => {
  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) {
    res.status(404).json({ success: false, message: "Blog not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Blog deleted" });
};

// Private editorial listing, including drafts. Public routes remain published-only.
export const getAdminBlogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || "50"), 10) || 50));
  const total = await Blog.countDocuments({});
  const blogs = await Blog.find({}).populate("author", "name avatar").sort("-updatedAt").skip((page - 1) * limit).limit(limit).select("-content");
  res.json({ success: true, blogs, total, page, pages: Math.ceil(total / limit) });
};

export const getAdminBlogById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  if (!/^[a-f\d]{24}$/i.test(id)) { res.status(400).json({ success: false, message: "Invalid article ID" }); return; }
  const blog = await Blog.findById(id).populate("author", "name avatar");
  if (!blog) { res.status(404).json({ success: false, message: "Blog not found" }); return; }
  res.json({ success: true, blog });
};
