import { Router } from "express";
import { createBlog, getAllBlogs, getBlogCategories, getBlogBySlug, updateBlog, deleteBlog, getAdminBlogs, getAdminBlogById } from "../controllers/blog.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.get("/admin", protect, authorize("admin"), getAdminBlogs);
router.get("/admin/:id", protect, authorize("admin"), getAdminBlogById);
router.get("/", getAllBlogs);
router.get("/categories", getBlogCategories);
router.get("/:slug", getBlogBySlug);
router.post("/", protect, authorize("admin"), createBlog);
router.put("/:id", protect, authorize("admin"), updateBlog);
router.delete("/:id", protect, authorize("admin"), deleteBlog);

export default router;