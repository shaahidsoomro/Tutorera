import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { otpRequestLimiter, otpVerifyLimiter } from "../middlewares/rateLimiters";
import {
  getMyParentProfile,
  addChildAccount,
  confirmChildAccount,
  cancelChildLinkRequest,
  decideBookingApproval,
  removeChildAccount,
  updateParentSettings,
  getPendingBookingApprovals,
  saveParentOnboarding,
} from "../controllers/parent.controller";

const router = Router();

router.get("/profile", protect, getMyParentProfile);
router.post("/children", protect, otpRequestLimiter, addChildAccount);
router.post("/children/confirm", protect, otpVerifyLimiter, confirmChildAccount);
router.delete("/children/requests/:requestId", protect, cancelChildLinkRequest);
router.post("/booking-approvals/:requestId", protect, decideBookingApproval);
router.delete("/children/:childId", protect, removeChildAccount);
router.patch("/settings", protect, updateParentSettings);
router.get("/booking-approvals", protect, getPendingBookingApprovals);
router.post("/booking-approvals/:id/decision", protect, decideBookingApproval);
router.post("/onboarding", protect, saveParentOnboarding);

export default router;
