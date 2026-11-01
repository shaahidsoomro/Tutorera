import { Router } from "express";
import { bookAgainFromBooking, getMyBookings, updateBookingStatus, raiseBookingDispute } from "../controllers/booking.controller";
import { submitRefundRequest, getMyRefundRequests } from "../controllers/refundRequest.controller";
import { protect } from "../middlewares/auth.middleware";
import { validate, updateBookingStatusSchema } from "../validators/booking.validator";

const router = Router();

router.get("/", protect, getMyBookings);
router.post("/:id/book-again", protect, bookAgainFromBooking);
router.patch("/:id/status", protect, validate(updateBookingStatusSchema), updateBookingStatus);
router.post("/:id/dispute", protect, raiseBookingDispute);
router.post("/:id/refund-request", protect, submitRefundRequest);
router.get("/refund-requests", protect, getMyRefundRequests);

export default router;
