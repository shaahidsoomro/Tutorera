import { Router } from "express";
import mongoose from "mongoose";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { listPayouts, processPendingPayouts } from "../../services/payout.service";

const router = Router();
// protect + authorize("admin") is already applied by the parent admin router

// Read-only visibility into the TutorPayout workflow.
//
// Deliberately NOT exposed: scan-with-apply, complete and fail. The live money path is
// POST /admin/bookings/:id/payout/verify, which requires a second, different finance
// reviewer and a matching settlement reference. markPayoutComplete / markPayoutFailed /
// createPayoutRequests in payout.service.ts let a single admin settle a payout, so they
// must not be routed until they enforce the same four-eyes rule.

/** List payout requests, optionally filtered by state or tutorId. */
router.get("/", requirePermission("payout.read"), async (req, res) => {
  const { state, tutorId, page = "1", limit = "20" } = req.query as Record<string, string>;
  if (tutorId && !mongoose.isValidObjectId(tutorId)) {
    res.status(400).json({ success: false, message: "tutorId must be a valid id" });
    return;
  }
  const result = await listPayouts({ state, tutorId, page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 });
  res.json({ success: true, ...result });
});

/** Counts of work awaiting finance action. Read-only; never changes payout state. */
router.get("/queue", requirePermission("payout.read"), async (_req, res) => {
  const result = await processPendingPayouts();
  res.json({ success: true, result });
});

export default router;
