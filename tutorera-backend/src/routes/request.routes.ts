import { Router } from "express";
import {
  createRequest, getAllRequests, getMyRequests,
  cancelRequest, placeBid, getBidsForRequest,
  createDirectBookingRequest, getMyDirectRequests, rejectBid,
  getPublicRequestsPreview, getRequestSeoFacets,
  saveRequestDraftProgress,
  extendRequest,
  repostRequest,
  closeRequest,
  initiateAcceptBid,
} from "../controllers/request.controller";
import { protect, authorize, optionalAuth } from "../middlewares/auth.middleware";
import { validate, createRequestSchema, placeBidSchema, createDirectBookingRequestSchema } from "../validators/request.validator";

const router = Router();

router.get("/seo-facets", getRequestSeoFacets);
router.get("/public/preview", getPublicRequestsPreview);
router.get("/", optionalAuth, getAllRequests);
router.post("/direct", protect, authorize("student"), validate(createDirectBookingRequestSchema), createDirectBookingRequest);
router.get("/direct/my", protect, authorize("tutor"), getMyDirectRequests);
router.post("/draft", protect, authorize("student"), saveRequestDraftProgress);
router.patch("/:id/bids/:bidId/reject", protect, rejectBid);
router.post("/", protect, authorize("student"), validate(createRequestSchema), createRequest);
router.get("/my", protect, authorize("student"), getMyRequests);
router.patch("/:id/cancel", protect, authorize("student"), cancelRequest);
router.patch("/:id/close", protect, authorize("student"), closeRequest);
router.post("/:id/extend", protect, authorize("student"), extendRequest);
router.post("/:id/repost", protect, authorize("student"), repostRequest);
router.post("/:id/bids", protect, authorize("tutor"), validate(placeBidSchema), placeBid);
router.get("/:id/bids", protect, authorize("student"), getBidsForRequest);
router.patch("/:id/bids/:bidId/accept", protect, initiateAcceptBid);

export default router;
