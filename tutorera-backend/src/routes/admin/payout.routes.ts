import { Router, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../types";
import { requirePermission } from "../../middlewares/rbac.middleware";
import {
  PayoutError,
  createPayoutRequests,
  initiatePayoutTransfer,
  listPayouts,
  markPayoutComplete,
  markPayoutFailed,
  processPendingPayouts,
} from "../../services/payout.service";
import { logAudit } from "../../utils/logAudit";

const router = Router();
// protect + authorize("admin") is already applied by the parent admin router

/**
 * Settling a tutor payout takes TWO different finance reviewers, mirroring
 * POST /admin/bookings/:id/payout/verify:
 *   1. POST /:transferRef/initiate  - reviewer A records the external transfer and its reference.
 *   2. POST /:transferRef/complete  - reviewer B (not A) repeats the reference and supplies evidence.
 * Nothing becomes "paid" from a scan, a report or a single actor.
 */

function actorOf(req: AuthRequest, res: Response): string | null {
  const id = req.user?._id?.toString();
  if (!id) {
    res.status(403).json({ success: false, code: "REVIEWER_ID_REQUIRED", message: "An identifiable finance reviewer is required." });
    return null;
  }
  return id;
}

/** Maps a PayoutError to its status and stable code; anything else goes to the global handler. */
function sendPayoutError(err: unknown, res: Response): boolean {
  if (err instanceof PayoutError) {
    res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
    return true;
  }
  return false;
}

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

/**
 * Create payout requests for eligible bookings (completed lesson, confirmed payment, payout
 * requested by the tutor). Requires ?apply=true; without it this is a read-only queue summary.
 */
router.post("/scan", requirePermission("payout.process"), async (req, res) => {
  if (req.query.apply !== "true") {
    res.json({ success: true, dryRun: true, result: await processPendingPayouts() });
    return;
  }
  const authReq = req as AuthRequest;
  const actor = actorOf(authReq, res);
  if (!actor) return;
  const result = await createPayoutRequests();
  await logAudit({
    action: "payout_requests_created",
    actor: authReq.user?.name || authReq.user?.email,
    actorId: actor,
    entity: "TutorPayout",
    metadata: { requested: result.requested, skippedBelowThreshold: result.skippedBelowThreshold, failed: result.failed },
  });
  res.json({ success: true, dryRun: false, result });
});

/** Step 1: record the external transfer and its reference. Does not mark anything paid. */
router.post("/:transferRef/initiate", requirePermission("payout.process"), async (req, res) => {
  const authReq = req as AuthRequest;
  const actor = actorOf(authReq, res);
  if (!actor) return;
  const { settlementReference } = (req.body || {}) as { settlementReference?: string };
  try {
    await initiatePayoutTransfer({ transferRef: String(req.params.transferRef), adminId: actor, settlementReference: settlementReference ?? "" });
  } catch (err) {
    if (sendPayoutError(err, res)) return;
    throw err;
  }
  await logAudit({
    action: "payout_transfer_recorded",
    actor: authReq.user?.name || authReq.user?.email,
    actorId: actor,
    entity: "TutorPayout",
    targetId: String(req.params.transferRef),
    metadata: { settlementReference: settlementReference?.trim() },
  });
  res.json({ success: true });
});

/** Step 2: a different reviewer confirms with the same reference and written evidence. */
router.post("/:transferRef/complete", requirePermission("payout.process"), async (req, res) => {
  const authReq = req as AuthRequest;
  const actor = actorOf(authReq, res);
  if (!actor) return;
  const { settlementReference, evidenceRef, adminNote } = (req.body || {}) as { settlementReference?: string; evidenceRef?: string; adminNote?: string };
  try {
    await markPayoutComplete({
      transferRef: String(req.params.transferRef),
      settlementReference: settlementReference ?? "",
      evidenceRef: evidenceRef ?? "",
      adminId: actor,
      adminNote,
    });
  } catch (err) {
    if (sendPayoutError(err, res)) return;
    throw err;
  }
  await logAudit({
    action: "payout_completed",
    actor: authReq.user?.name || authReq.user?.email,
    actorId: actor,
    entity: "TutorPayout",
    targetId: String(req.params.transferRef),
    metadata: { settlementReference: settlementReference?.trim() },
  });
  res.json({ success: true });
});

/** Mark a payout failed and return its bookings to pending. A note is required. */
router.post("/:transferRef/fail", requirePermission("payout.process"), async (req, res) => {
  const authReq = req as AuthRequest;
  const actor = actorOf(authReq, res);
  if (!actor) return;
  const { adminNote } = (req.body || {}) as { adminNote?: string };
  try {
    await markPayoutFailed({ transferRef: String(req.params.transferRef), adminId: actor, adminNote: adminNote ?? "" });
  } catch (err) {
    if (sendPayoutError(err, res)) return;
    throw err;
  }
  await logAudit({
    action: "payout_failed",
    actor: authReq.user?.name || authReq.user?.email,
    actorId: actor,
    entity: "TutorPayout",
    targetId: String(req.params.transferRef),
    metadata: { note: adminNote?.trim() },
  });
  res.json({ success: true });
});

export default router;
