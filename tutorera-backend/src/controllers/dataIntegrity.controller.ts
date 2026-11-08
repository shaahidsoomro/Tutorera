import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types";
import DataIntegrityIssue from "../models/DataIntegrityIssue.model";
import { logAudit } from "../utils/logAudit";

const allowedStatuses = new Set(["open", "reviewing", "resolved", "ignored"]);

export async function listDataIntegrityIssues(req: AuthRequest, res: Response): Promise<void> {
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
  const filter: Record<string, unknown> = {};
  if (req.countryScopeCode) filter.countryCode = req.countryScopeCode;
  if (typeof req.query.status === "string" && allowedStatuses.has(req.query.status)) filter.status = req.query.status;
  if (typeof req.query.type === "string") filter.type = req.query.type;
  if (typeof req.query.severity === "string" && ["high", "critical"].includes(req.query.severity)) filter.severity = req.query.severity;
  const [total, issues] = await Promise.all([
    DataIntegrityIssue.countDocuments(filter),
    DataIntegrityIssue.find(filter)
      .select("fingerprint type severity entityType entityId relation countryCode details status detectedAt resolvedAt resolutionNote createdAt updatedAt")
      .sort({ status: 1, severity: -1, detectedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, total, page, limit, pages: Math.ceil(total / limit), issues });
}

export async function updateDataIntegrityIssue(req: AuthRequest, res: Response): Promise<void> {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ success: false, message: "Invalid integrity issue identifier." }); return; }
  const status = typeof req.body?.status === "string" ? req.body.status : "";
  const note = typeof req.body?.resolutionNote === "string" ? req.body.resolutionNote.trim() : "";
  if (!allowedStatuses.has(status)) { res.status(422).json({ success: false, message: "A valid issue status is required." }); return; }
  if (["resolved", "ignored"].includes(status) && (!note || note.length > 1000)) {
    res.status(422).json({ success: false, message: "A resolution note of up to 1,000 characters is required." }); return;
  }
  const issue = await DataIntegrityIssue.findById(req.params.id);
  if (!issue || (req.countryScopeCode && issue.countryCode !== req.countryScopeCode)) { res.status(404).json({ success: false, message: "Integrity issue not found." }); return; }
  const priorStatus = issue.status;
  issue.status = status as typeof issue.status;
  if (["resolved", "ignored"].includes(status)) {
    issue.resolvedAt = new Date();
    issue.resolvedBy = req.user?._id;
    issue.resolutionNote = note;
  } else {
    issue.resolvedAt = undefined;
    issue.resolvedBy = undefined;
    issue.resolutionNote = undefined;
  }
  await issue.save();
  await logAudit({
    action: "data_integrity_issue_updated",
    actor: req.user?.name || "Administrator",
    actorId: req.user?._id?.toString(),
    entity: "DataIntegrityIssue",
    targetId: issue._id.toString(),
    metadata: { fingerprint: issue.fingerprint, priorStatus, status, resolutionNote: note || undefined },
  });
  res.json({ success: true, issue });
}
