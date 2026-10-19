import { Response } from "express";
import { AuthRequest } from "../types";
import AgeReviewRequest from "../models/AgeReviewRequest.model";
import { logAudit } from "../utils/logAudit";

// Intake only: no DOB updates, uploads, automatic age classification, or consent grants.
export const requestAgeReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user || user.role !== "student") {
    res.status(403).json({ success: false, code: "STUDENT_ACCOUNT_REQUIRED" }); return;
  }
  const reason = req.body?.reason;
  if (reason !== "missing_date_of_birth" && reason !== "incorrect_date_of_birth") {
    res.status(400).json({ success: false, code: "INVALID_AGE_REVIEW_REASON" }); return;
  }
  const existing = await AgeReviewRequest.findOne({ student: user._id, status: "pending" });
  if (existing) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ success: true, status: "pending", requestId: existing._id }); return;
  }
  const review = await AgeReviewRequest.create({ student: user._id, reason, status: "pending" });
  await logAudit({ action: "student_age_review_requested", actorId: user._id.toString(),
    actor: "Student", entity: "AgeReviewRequest", targetId: review._id.toString(),
    metadata: { reason } });
  res.setHeader("Cache-Control", "no-store");
  res.status(201).json({ success: true, status: "pending", requestId: review._id,
    message: "Your request has been recorded. Support will explain secure verification steps." });
};

export const getMyAgeReviewRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== "student") {
    res.status(403).json({ success: false, code: "STUDENT_ACCOUNT_REQUIRED" }); return;
  }
  const review = await AgeReviewRequest.findOne({ student: req.user._id }).sort({ createdAt: -1 })
    .select("status reason createdAt updatedAt").lean();
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, review: review || null });
};
