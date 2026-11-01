import { Router } from "express";
import { downloadEarningsPDF, getEligiblePayouts, getMyEarnings, getMyPayouts, requestPayout } from "../controllers/earnings.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", protect, getMyEarnings);
router.get("/report/pdf", protect, downloadEarningsPDF);
router.get("/payouts", protect, getMyPayouts);
router.get("/payouts/eligible", protect, getEligiblePayouts);
router.post("/payouts/:bookingId/request", protect, requestPayout);

export default router;