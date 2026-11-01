import { Router } from "express";
import { createReview, getTutorReviews, respondToReview } from "../controllers/review.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import { rateStudent } from "../controllers/studentRating.controller";

const router = Router();

router.post("/student-ratings", protect, authorize("tutor"), rateStudent);

router.get("/:tutorId", getTutorReviews);
router.post("/:tutorId", protect, authorize("student"), createReview);
router.patch("/:tutorId/:reviewId/respond", protect, authorize("tutor"), respondToReview);

export default router;