import { Router } from "express";
import { bookAgainFromBooking, getMyBookings, updateBookingStatus, raiseBookingDispute } from "../controllers/booking.controller";
import { submitRefundRequest, getMyRefundRequests } from "../controllers/refundRequest.controller";
import { submitProgressReport, getProgressReports, setStudentMood } from "../controllers/learningProgress.controller";
import { protect, authorize } from "../middlewares/auth.middleware";
import { validate, updateBookingStatusSchema } from "../validators/booking.validator";

const router = Router();

router.get("/", protect, getMyBookings);
router.post("/:id/book-again", protect, bookAgainFromBooking);
router.patch("/:id/status", protect, validate(updateBookingStatusSchema), updateBookingStatus);
router.post("/:id/dispute", protect, raiseBookingDispute);
router.post("/:id/refund-request", protect, submitRefundRequest);
router.get("/refund-requests", protect, getMyRefundRequests);
router.post("/:id/progress-reports", protect, authorize("tutor"), submitProgressReport);
router.get("/:id/progress-reports", protect, getProgressReports);
router.patch("/:bookingId/progress-reports/:reportId/mood", protect, authorize("student"), setStudentMood);

export default router;
