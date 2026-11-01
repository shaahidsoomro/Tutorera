import { Router } from "express";
import {
  createOrUpdateProfile,
  getMyProfile,
  saveOnboardingStep,
  getOnboardingStatus,
} from "../controllers/tutor.controller";
import {
  getPublicTutorById,
  getPublicTutors,
  getPublicTutorSeoFacets,
} from "../controllers/publicTutor.controller";
import {
  saveAvailability,
  getTutorAvailability,
  getMyAvailability,
} from "../controllers/availability.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import { validate, tutorProfileSchema } from "../validators/tutor.validator";
import { validate as validateAvailability, saveAvailabilitySchema } from "../validators/availability.validator";
import { uploadVerification } from "../middlewares/upload.middleware";

const router = Router();

// Specific static paths MUST come before /:id to avoid being swallowed by the wildcard
// Availability (tutor)
router.post("/availability", protect, authorize("tutor"), validateAvailability(saveAvailabilitySchema), saveAvailability);
router.get("/availability/me", protect, authorize("tutor"), getMyAvailability);

// Onboarding
router.get("/onboarding/status", protect, authorize("tutor"), getOnboardingStatus);
router.post("/onboarding/step", protect, authorize("tutor"), uploadVerification.fields([
  { name: "avatar", maxCount: 1 },
  { name: "degreeDoc", maxCount: 1 },
  { name: "cnicFront", maxCount: 1 },
  { name: "cnicBack", maxCount: 1 },
  { name: "policeCertificate", maxCount: 1 },
]), saveOnboardingStep);

// Profile
router.post("/profile", protect, authorize("tutor"), validate(tutorProfileSchema), createOrUpdateProfile);
router.get("/profile/me", protect, authorize("tutor"), getMyProfile);

// Public — all tutor exposure is gated by the canonical marketplace eligibility rule.
// These wildcard/parameterized routes MUST be last
router.get("/seo-facets", getPublicTutorSeoFacets);
router.get("/", getPublicTutors);
router.get("/:tutorUserId/availability", getTutorAvailability);
router.get("/:id", getPublicTutorById);

export default router;