import { Router } from "express";
import {
  createRequest, getAllRequests, getMyRequests, getRequestById, getRequestTimeline,
  cancelRequest, placeBid, getBidsForRequest,
  createDirectBookingRequest, getMyDirectRequests, rejectBid,
  getPublicRequestsPreview, getRequestSeoFacets,
  saveRequestDraftProgress,
  extendRequest,
  repostRequest,
  closeRequest,
  initiateAcceptBid,
  inviteTutorToRequest,
} from "../controllers/request.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import { validate, createRequestSchema, placeBidSchema, createDirectBookingRequestSchema } from "../validators/request.validator";

const router = Router();

router.get("/seo-facets", getRequestSeoFacets);
router.get("/public/preview", getPublicRequestsPreview);
// Full demand feed is for verified tutors only. Public discovery uses the
// separately redacted `/public/preview` endpoint above.
router.get("/", protect, authorize("tutor"), getAllRequests);
router.post("/direct", protect, authorize("student", "parent"), validate(createDirectBookingRequestSchema), createDirectBookingRequest);
router.get("/direct/my", protect, authorize("tutor"), getMyDirectRequests);
router.post("/draft", protect, authorize("student", "parent"), saveRequestDraftProgress);
router.patch("/:id/bids/:bidId/reject", protect, rejectBid);
router.post("/", protect, authorize("student", "parent"), validate(createRequestSchema), createRequest);
router.get("/my", protect, authorize("student", "parent"), getMyRequests);
router.get("/:id", protect, getRequestById);
router.get("/:id/timeline", protect, getRequestTimeline);
router.post("/:id/invitations", protect, authorize("student", "parent"), inviteTutorToRequest);
router.patch("/:id/cancel", protect, authorize("student", "parent"), cancelRequest);
router.patch("/:id/close", protect, authorize("student", "parent"), closeRequest);
router.post("/:id/extend", protect, authorize("student", "parent"), extendRequest);
router.post("/:id/repost", protect, authorize("student", "parent"), repostRequest);
router.post("/:id/bids", protect, authorize("tutor"), validate(placeBidSchema), placeBid);
router.get("/:id/bids", protect, authorize("student", "parent"), getBidsForRequest);
router.patch("/:id/bids/:bidId/accept", protect, initiateAcceptBid);

export default router;
