import { Router } from "express";
import {
  getApplicationStatus,
  rotateTrackingToken,
  acceptTutorAgreement,
  getPublicTracking,
  listApplications,
  getApplicationDetail,
  updateCnic,
  updateDegree,
  updateDemoVideo,
  updatePolice,
  updateAvatar,
  setMarketplaceEligibility,
  setHomeTuitionEligibility,
  setSuspended,
  setReverification,
  setAdminExempt,
  setPoliceNotRequired,
  setExperiencedTutorBadge,
  getApplicationHistory,
  uploadApplicationDocumentOnBehalf,
  reviewSubjectEligibility,
  getSubjectEligibilityEvidenceUrl,
  reviewSubjectEligibilityEvidence,
} from "../controllers/tracking.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/rbac.middleware";
import { enforceCountryScope } from "../middlewares/countryScope.middleware";
import { trackingLimiter, tutorRotateLimiter } from "../middlewares/rateLimiters";
import { uploadVerification } from "../middlewares/upload.middleware";

const router = Router();

// ─── Tutor authenticated ────────────────────────────────────────────────────
router.get("/application-status", protect, authorize("tutor"), getApplicationStatus);
router.post("/application-status/rotate-token", protect, authorize("tutor"), tutorRotateLimiter, rotateTrackingToken);
router.post("/application-status/accept-agreement", protect, authorize("tutor"), acceptTutorAgreement);

// ─── Admin ───────────────────────────────────────────────────────────────────
// Audit P0-3: country-scope enforcement on every tutor application review
// route. enforceCountryScope is a no-op for super_admin and lets a
// single-country admin's requests through without an explicit country
// filter (it defaults to their one allowed country). A multi-country
// admin must pass ?countryCode= on reads and the handlers below guard
// mutations against profile.countryCode mismatch.
router.use("/admin/applications", protect, authorize("admin"), enforceCountryScope);

router.get("/admin/applications", protect, authorize("admin"), requirePermission("tutor.read"), listApplications);
router.get("/admin/applications/:id", protect, authorize("admin"), requirePermission("tutor.read"), getApplicationDetail);
router.get("/admin/applications/:id/history", protect, authorize("admin"), requirePermission("audit.read"), getApplicationHistory);
router.patch("/admin/applications/:id/cnic", protect, authorize("admin"), requirePermission("tutor.verify"), updateCnic);
router.patch("/admin/applications/:id/degree", protect, authorize("admin"), requirePermission("tutor.verify"), updateDegree);
router.patch("/admin/applications/:id/demo-video", protect, authorize("admin"), requirePermission("tutor.verify"), updateDemoVideo);
router.patch("/admin/applications/:id/police", protect, authorize("admin"), requirePermission("tutor.verify"), updatePolice);
router.patch("/admin/applications/:id/avatar", protect, authorize("admin"), requirePermission("tutor.verify"), updateAvatar);
router.patch("/admin/applications/:id/marketplace", protect, authorize("admin"), requirePermission("tutor.verify"), setMarketplaceEligibility);
router.patch("/admin/applications/:id/home-tuition", protect, authorize("admin"), requirePermission("tutor.verify"), setHomeTuitionEligibility);
router.patch("/admin/applications/:id/suspended", protect, authorize("admin"), requirePermission("tutor.suspend"), setSuspended);
router.patch("/admin/applications/:id/reverification", protect, authorize("admin"), requirePermission("tutor.verify"), setReverification);
router.patch("/admin/applications/:id/exempt", protect, authorize("admin"), requirePermission("tutor.verify"), setAdminExempt);
router.patch("/admin/applications/:id/police-not-required", protect, authorize("admin"), requirePermission("tutor.verify"), setPoliceNotRequired);
router.patch("/admin/applications/:id/experienced-tutor-badge", protect, authorize("admin"), requirePermission("tutor.verify"), setExperiencedTutorBadge);
router.patch("/admin/applications/:id/subject-eligibility", protect, authorize("admin"), requirePermission("tutor.verify"), reviewSubjectEligibility);
router.get("/admin/applications/:id/subject-eligibility/:subject/evidence/:index", protect, authorize("admin"), requirePermission("tutor.verify"), getSubjectEligibilityEvidenceUrl);
router.patch("/admin/applications/:id/subject-eligibility/:subject/evidence/:index", protect, authorize("admin"), requirePermission("tutor.verify"), reviewSubjectEligibilityEvidence);

// Admin upload document on tutor's behalf
router.post(
  "/admin/applications/:id/upload-document",
  protect,
  authorize("admin"),
  requirePermission("tutor.verify"),
  uploadVerification.fields([
    { name: "file", maxCount: 1 },
    { name: "cnicFront", maxCount: 1 },
    { name: "cnicBack", maxCount: 1 },
    { name: "degree", maxCount: 1 },
    { name: "policeCertificate", maxCount: 1 },
    { name: "videoIntro", maxCount: 1 },
  ]),
  uploadApplicationDocumentOnBehalf
);

// ─── Public token tracking — MUST be last (wildcard catches everything) ──────
router.get("/:token", trackingLimiter, getPublicTracking);

export default router;
