// src/controllers/adminControlTower.controller.ts
// Centralized Controller for Marketplace Control Tower, At-Risk Requests,
// Supply Gaps, Safety Cases, Reconciliation, Markets, and RBAC Roles

import { Response } from "express";
import { AuthRequest } from "../types";
import Request from "../models/Request.model";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import TutorProfile from "../models/TutorProfile.model";
import User from "../models/User.model";
import SafetyCase from "../models/SafetyCase.model";
import FeeConfig from "../models/FeeConfig.model";
import MarketConfig from "../models/MarketConfig.model";
import PaymentLedger from "../models/PaymentLedger.model";
import RefundRequest from "../models/RefundRequest.model";
import AcademicDiscipline from "../models/AcademicDiscipline.model";
import Subject from "../models/Subject.model";
import TeachingEligibilityRule from "../models/TeachingEligibilityRule.model";
import { resolveTeachingEligibility } from "../services/subjectEligibility.service";
import { AtRiskRequestService } from "../services/atRiskRequest.service";
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, hasPermission, Permission } from "../config/rbac";
import mongoose from "mongoose";
import logger from "../config/logger";
import { logAudit } from "../utils/logAudit";

// ─── 1. Control Tower Operational Pulse & Action Triage ───────────────────────

export const getControlTowerPulse = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600000);
  const expiringCutoff = new Date(now.getTime() + 24 * 3600000);

  const [
    activeRequests,
    successfulBookings,
    zeroOfferRequests,
    expiringToday,
    verificationBacklog,
    failedPayments,
    openSafetyCases,
    disputedBookings,
    atRiskItems,
  ] = await Promise.all([
    Request.countDocuments({
      status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
      expiresAt: { $gt: now },
    }),
    Booking.countDocuments({ status: { $in: ["upcoming", "ongoing", "completed"] } }),
    Request.countDocuments({
      status: { $in: ["open", "published", "receiving_offers"] },
      expiresAt: { $gt: now },
      createdAt: { $lte: dayAgo },
    }),
    Request.countDocuments({
      status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
      expiresAt: { $gt: now, $lte: expiringCutoff },
    }),
    TutorProfile.countDocuments({
      verificationStatus: "pending",
      createdAt: { $lte: twoDaysAgo },
    }),
    Booking.countDocuments({ paymentStatus: "failed" }),
    SafetyCase.countDocuments({ status: { $in: ["open", "under_investigation"] } }),
    Booking.countDocuments({ paymentStatus: "disputed" }),
    AtRiskRequestService.getAtRiskRequests(15, _req.app.get("io")),
  ]);

  // Compile "Requires Action Now" list
  const urgentActions = [];

  if (zeroOfferRequests > 0) {
    urgentActions.push({
      id: "zero-offers",
      type: "liquidity",
      severity: "high",
      title: `${zeroOfferRequests} tuition requests have received no tutor offers >24h`,
      detail: "Students risk abandoning platform without relevant tutor outreach.",
      actionLabel: "Triage Requests",
      link: "/admin/at-risk-requests",
    });
  }

  if (expiringToday > 0) {
    urgentActions.push({
      id: "expiring-today",
      type: "lifecycle",
      severity: "medium",
      title: `${expiringToday} requests expire within 24 hours`,
      detail: "Review pending offers or extend request validity.",
      actionLabel: "Review Expiring",
      link: "/admin/at-risk-requests?filter=expiring",
    });
  }

  if (verificationBacklog > 0) {
    urgentActions.push({
      id: "verification-sla",
      type: "verification",
      severity: "high",
      title: `${verificationBacklog} tutor applications exceed 48-hour review SLA`,
      detail: "Tutors are waiting for marketplace credential approval.",
      actionLabel: "Review Tutors",
      link: "/admin/applications?status=UNDER_REVIEW",
    });
  }

  if (failedPayments > 0) {
    urgentActions.push({
      id: "failed-payments",
      type: "finance",
      severity: "critical",
      title: `${failedPayments} student checkouts failed payment processing`,
      detail: "Follow up with students to assist with gateway completion.",
      link: "/admin/payments?status=failed",
      actionLabel: "Inspect Payments",
    });
  }

  if (openSafetyCases > 0) {
    urgentActions.push({
      id: "safety-cases",
      type: "safety",
      severity: "critical",
      title: `${openSafetyCases} trust & safety incident cases require investigation`,
      detail: "Conduct or harassment reports awaiting officer resolution.",
      link: "/admin/safety-cases",
      actionLabel: "Manage Cases",
    });
  }

  if (disputedBookings > 0) {
    urgentActions.push({
      id: "disputed-bookings",
      type: "finance",
      severity: "high",
      title: `${disputedBookings} booking payment dispute${disputedBookings !== 1 ? "s" : ""} awaiting resolution`,
      detail: "Students or tutors have contested payment — needs finance decision.",
      link: "/admin/disputes",
      actionLabel: "Resolve Disputes",
    });
  }

  res.json({
    success: true,
    pulse: {
      activeRequests,
      successfulBookings,
      requestsAtRisk: atRiskItems.length,
      zeroOfferRequests,
      expiringToday,
      verificationBacklog,
      failedPayments,
      openSafetyCases,
      disputedBookings,
    },
    urgentActions,
    atRiskPreview: atRiskItems.slice(0, 5),
  });
};

// ─── 2. At-Risk Requests Queue & Actions ─────────────────────────────────────

export const listAtRiskRequests = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const io = _req.app.get("io");
    const items = await AtRiskRequestService.getAtRiskRequests(100, io);
    res.json({ success: true, count: items.length, items });
  } catch (err: any) {
    logger.error({ err }, "Failed to load at-risk requests");
    res.status(500).json({ success: false, message: "Failed to evaluate at-risk requests" });
  }
};

export const handleAtRiskAction = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { action } = req.body;
  const io = req.app.get("io");

  if (!["rematch", "extend", "suggest_online", "escalate"].includes(action)) {
    res.status(400).json({ success: false, message: "Invalid rescue action." });
    return;
  }

  const permissionByAction: Record<string, Permission> = {
    rematch: "request.rematch",
    suggest_online: "request.rematch",
    extend: "request.extend",
    escalate: "request.escalate",
  };
  const requiredPermission = permissionByAction[action];
  if (!hasPermission(req.user?.adminRole, req.user?.adminPermissions, requiredPermission)) {
    res.status(403).json({
      success: false,
      code: "PERMISSION_DENIED",
      message: `You do not have permission to ${action.replace("_", " ")} this request.`,
    });
    return;
  }

  const result = await AtRiskRequestService.executeRescueAction(
    id,
    action,
    req.user?._id?.toString() || "admin",
    io
  );
  if (result.success) {
    await logAudit({
      action: `request_${action}`,
      actor: req.user?.name || "Administrator",
      actorId: req.user?._id?.toString(),
      entity: "Request",
      targetId: id,
      metadata: { source: "admin_control_tower" },
    });
  }
  res.json(result);
};

// ─── 3. Supply Gaps Intelligence ─────────────────────────────────────────────

export const getSupplyGapsIntelligence = async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  // Aggregate demand by subject and city
  const demandAgg = await Request.aggregate([
    {
      $match: {
        status: { $in: ["open", "published", "receiving_offers", "negotiating"] },
        expiresAt: { $gt: now },
      },
    },
    {
      $group: {
        _id: { subject: "$subject", city: { $ifNull: ["$city", "All Cities"] }, mode: "$teachingMode" },
        requestCount: { $sum: 1 },
      },
    },
    { $sort: { requestCount: -1 } },
    { $limit: 40 },
  ]);

  // Aggregate tutor supply by subject and city
  const tutorAgg = await TutorProfile.aggregate([
    {
      $match: {
        isVerified: true,
      },
    },
    { $unwind: "$subjects" },
    {
      $group: {
        _id: { subject: "$subjects", city: { $ifNull: ["$city", "All Cities"] } },
        tutorCount: { $sum: 1 },
        policeVerifiedCount: {
          $sum: { $cond: [{ $eq: ["$policeVerificationStatus", "approved"] }, 1, 0] },
        },
      },
    },
  ]);

  const tutorMap = new Map<string, { tutorCount: number; policeVerifiedCount: number }>();
  for (const t of tutorAgg) {
    const key = `${t._id.subject.toLowerCase()}|${t._id.city.toLowerCase()}`;
    tutorMap.set(key, { tutorCount: t.tutorCount, policeVerifiedCount: t.policeVerifiedCount });
  }

  const gaps = demandAgg.map((d) => {
    const sub = d._id.subject;
    const city = d._id.city;
    const key = `${sub.toLowerCase()}|${city.toLowerCase()}`;
    const supply = tutorMap.get(key) || { tutorCount: 0, policeVerifiedCount: 0 };
    const ratio = d.requestCount > 0 ? supply.tutorCount / d.requestCount : 1;

    let gapStatus: "CRITICAL_GAP" | "MODERATE_GAP" | "HEALTHY" = "HEALTHY";
    if (ratio < 0.25) gapStatus = "CRITICAL_GAP";
    else if (ratio < 0.6) gapStatus = "MODERATE_GAP";

    return {
      subject: sub,
      city,
      teachingMode: d._id.mode,
      activeRequests: d.requestCount,
      eligibleTutors: supply.tutorCount,
      policeVerifiedTutors: supply.policeVerifiedCount,
      supplyDemandRatio: Number(ratio.toFixed(2)),
      gapStatus,
    };
  });

  // Sort critical gaps first
  gaps.sort((a, b) => a.supplyDemandRatio - b.supplyDemandRatio);

  res.json({ success: true, gaps });
};

// ─── 4. Finance Reconciliation Ledger ────────────────────────────────────────

export const getFinanceReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = "1", limit = "30", status } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 30));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (status) filter.paymentStatus = status;

  const [total, bookings, ledgerStatusRows, recentLedgerRows] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate("student", "name email")
      .populate("tutor", "name email")
      .populate("request", "subject level")
      .sort("-createdAt")
      .skip(skip)
      .limit(limitNum)
      .lean(),
    PaymentLedger.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, grossAmount: { $sum: "$grossAmount" }, platformNet: { $sum: "$platformNet" }, tutorPayable: { $sum: "$tutorPayable" } } },
    ]),
    PaymentLedger.find()
      .populate("student", "name email")
      .populate("tutor", "name email")
      .sort("-createdAt")
      .limit(20)
      .lean(),
  ]);

  const [unreconciledPaymentEvents, payoutsAwaitingVerification, approvedRefundsAwaitingSettlement] = await Promise.all([
    PaymentLedger.countDocuments({ settlementStatus: "exception" }),
    Booking.countDocuments({ payoutStatus: "processing" }),
    RefundRequest.countDocuments({ status: "approved" }),
  ]);

  // Reconciliation summary
  const allBookings = await Booking.find({ paymentStatus: "confirmed" }).select("studentTotal subtotal tutorFee studentFee platformFee tax paymentStatus tutorNet currency").lean();
  let totalGMV = 0;
  let totalTutorNet = 0;
  let totalPlatformGross = 0;
  // Gateway fees must come from real settlement statements; this API does not
  // know the provider fee and must not manufacture 2.9% + PKR 30.
  const totalEstimatedGatewayFees: number | null = null;

  for (const b of allBookings) {
    if (b.paymentStatus === "confirmed") {
      const gmv = b.studentTotal || b.subtotal || 0;
      totalGMV += gmv;
      totalTutorNet += b.tutorNet || 0;
      totalPlatformGross += (b.studentFee || 0) + (b.tutorFee || b.platformFee || 0);

    }
  }

  res.json({
    success: true,
    summary: {
      unreconciledPaymentEvents,
      payoutsAwaitingVerification,
      approvedRefundsAwaitingSettlement,
      totalGMV,
      totalTutorNet,
      totalPlatformGross,
      totalEstimatedGatewayFees,
      netPlatformSettlement: null, // unavailable until actual gateway settlement fees are supplied
      gatewayFeeEstimateAvailable: false,
      ledger: ledgerStatusRows.reduce((acc, row) => {
        acc[row._id || "unknown"] = {
          count: row.count,
          grossAmount: row.grossAmount,
          platformNet: row.platformNet,
          tutorPayable: row.tutorPayable,
        };
        return acc;
      }, {} as Record<string, { count: number; grossAmount: number; platformNet: number; tutorPayable: number }>),
    },
    ledger: recentLedgerRows,
    bookings: bookings.map((b) => {
      const gmv = b.studentTotal || b.subtotal || 0;
      const expectedSettlement = null;
      return {
        ...b,
        estimatedGatewayFee: null,
        expectedSettlement,
        settlementDiscrepancy: (b as any).gatewaySettlementStatus === "discrepancy",
      };
    }),
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
};

// Explicit finance exception queue (not inferred from report totals).
export const getFinanceExceptions = async (req: AuthRequest, res: Response): Promise<void> => {
  const pageNum = Math.max(1, Number.parseInt(String(req.query.page || 1), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || 25), 10) || 25));
  const filter = { settlementStatus: "exception" as const };
  const [total, exceptions] = await Promise.all([
    PaymentLedger.countDocuments(filter),
    PaymentLedger.find(filter).populate("student", "name email").populate("tutor", "name email")
      .populate("booking", "status paymentStatus currency studentTotal").sort("-createdAt")
      .skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ success: true, total, page: pageNum,
    pages: Math.ceil(total / limitNum), exceptions });
};

// ─── 5. System Health & Jobs ─────────────────────────────────────────────────

export const getSystemHealth = async (_req: AuthRequest, res: Response): Promise<void> => {
  const dbStatus = mongoose.connection.readyState === 1 ? "healthy" : "degraded";
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  res.json({
    success: true,
    health: {
      api: "healthy",
      database: dbStatus,
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
      jobs: [
        { name: "request_lifecycle_worker", interval: "15 minutes", status: "running" },
        { name: "day_5_liquidity_escalation", interval: "15 minutes", status: "running" },
        { name: "24h_expiry_warning_worker", interval: "15 minutes", status: "running" },
        { name: "offer_24h_expiry_cleaner", interval: "15 minutes", status: "running" },
      ],
    },
  });
};

// ─── 6. Trust & Safety Cases ─────────────────────────────────────────────────

export const listSafetyCases = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, severity, category } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;

  const cases = await SafetyCase.find(filter)
    .populate("reporter", "name email avatar")
    .populate("reportedUser", "name email avatar role")
    .populate("assignedOfficer", "name")
    .sort("-createdAt")
    .limit(100)
    .lean();

  res.json({ success: true, cases });
};

export const createSafetyCase = async (req: AuthRequest, res: Response): Promise<void> => {
  const count = await SafetyCase.countDocuments();
  const caseId = `CASE-2026-${String(count + 1).padStart(4, "0")}`;

  const newCase = await SafetyCase.create({
    caseId,
    reporter: req.user?._id,
    reportedUser: req.body.reportedUserId,
    booking: req.body.bookingId,
    request: req.body.requestId,
    category: req.body.category,
    severity: req.body.severity || "medium",
    evidence: req.body.evidence || [],
    internalNotes: req.body.initialNote
      ? [{ author: req.user?._id, text: req.body.initialNote, createdAt: new Date() }]
      : [],
  });

  res.status(201).json({ success: true, case: newCase });
};

export const resolveSafetyCase = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { actionTaken, resolutionSummary, paymentAction } = req.body;

  const safetyCase = await SafetyCase.findById(id).populate("booking");
  if (!safetyCase) {
    res.status(404).json({ success: false, message: "Safety case not found" });
    return;
  }

  safetyCase.status = "resolved";
  safetyCase.actionTaken = actionTaken || "none";
  safetyCase.resolutionSummary = resolutionSummary;
  safetyCase.resolvedAt = new Date();

  // If action is suspend/ban, update reported user
  if (["account_suspended", "account_banned"].includes(actionTaken)) {
    await User.findByIdAndUpdate(safetyCase.reportedUser, { isActive: false });
  }

  // Finance resolution for disputed bookings
  if (safetyCase.booking && paymentAction) {
    const bookingId = (safetyCase.booking as any)._id ?? safetyCase.booking;
    if (paymentAction === "refund") {
      await Booking.findByIdAndUpdate(bookingId, { $set: { paymentStatus: "refunded" } });
    } else if (paymentAction === "dismiss") {
      await Booking.findByIdAndUpdate(bookingId, { $set: { paymentStatus: "confirmed" } });
    }
  }

  await safetyCase.save();

  await logAudit({
    action: "safety_case_resolved",
    actor: req.user?.name ?? "admin",
    actorId: req.user?._id?.toString(),
    entity: "SafetyCase",
    targetId: safetyCase._id.toString(),
    metadata: { actionTaken, paymentAction: paymentAction ?? null },
  });

  res.json({ success: true, message: "Safety case resolved successfully." });
};

// @desc    List disputed bookings for finance triage
// @route   GET /api/admin/disputes
// @access  Private (admin, claims.read)
export const getDisputedBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = "1", limit = "20", status = "disputed" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
  const skip = (pageNum - 1) * limitNum;

  const validStatuses = ["disputed", "refunded"] as const;
  type PSFilter = typeof validStatuses[number];
  const paymentStatusFilter: PSFilter = validStatuses.includes(status as PSFilter) ? (status as PSFilter) : "disputed";

  const [bookings, total] = await Promise.all([
    Booking.find({ paymentStatus: paymentStatusFilter })
      .populate("student", "name email avatar")
      .populate("tutor", "name email avatar")
      .populate("request", "subject")
      .sort("-updatedAt")
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Booking.countDocuments({ paymentStatus: paymentStatusFilter }),
  ]);

  // Attach linked safety case info
  const bookingIds = bookings.map((b) => b._id);
  const cases = await SafetyCase.find({ booking: { $in: bookingIds } })
    .select("booking caseId status category severity resolvedAt actionTaken")
    .lean();
  const casesByBooking = new Map(cases.map((c) => [c.booking?.toString() ?? "", c]));

  const enriched = bookings.map((b) => ({
    ...b,
    safetyCase: casesByBooking.get(b._id.toString()) ?? null,
  }));

  res.json({ success: true, total, page: pageNum, pages: Math.ceil(total / limitNum), bookings: enriched });
};

// ─── 7. Fee Configuration ────────────────────────────────────────────────────

export const getFeeConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  let active = await FeeConfig.findOne({ isActive: true }).sort("-updatedAt").lean();
  if (!active) {
    active = await FeeConfig.create({
      version: "2026.1",
      countryCode: "GLOBAL",
      currency: "PKR",
      studentFeePercent: 0,
      tutorFeePercent: 20,
      minimumFee: 0,
      maximumFee: 5000,
      taxPercent: 15,
    });
  }
  const history = await FeeConfig.find().sort("-createdAt").limit(10).lean();
  res.json({ success: true, config: active, history });
};

export const updateFeeConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const { studentFeePercent, tutorFeePercent, minimumFee, maximumFee, taxPercent, notes } = req.body;
  const values = {
    studentFeePercent: Number(studentFeePercent ?? 0),
    tutorFeePercent: Number(tutorFeePercent ?? 20),
    minimumFee: Number(minimumFee ?? 0),
    maximumFee: Number(maximumFee ?? 5000),
    taxPercent: Number(taxPercent ?? 15),
  };
  if (!Object.values(values).every(Number.isFinite) || values.studentFeePercent < 0 || values.studentFeePercent > 100 || values.tutorFeePercent < 0 || values.tutorFeePercent > 100 || values.taxPercent < 0 || values.taxPercent > 100 || values.minimumFee < 0 || values.maximumFee < values.minimumFee) {
    res.status(400).json({ success: false, message: "Provide valid fee percentages and a maximum fee greater than or equal to the minimum fee." });
    return;
  }
  const nextVersion = `2026.${Date.now().toString().slice(-4)}`;
  const session = await mongoose.startSession();
  let created: any;
  try {
    await session.withTransaction(async () => {
      await FeeConfig.updateMany({ isActive: true }, { isActive: false }, { session });
      [created] = await FeeConfig.create([{ version: nextVersion, countryCode: "GLOBAL", currency: "PKR", ...values, notes: notes || "Updated via Admin Console", isActive: true, updatedBy: req.user?._id }], { session });
    });
  } finally {
    await session.endSession();
  }
  await logAudit({ action: "fee_config_updated", actor: req.user?.name || "Administrator", actorId: req.user?._id?.toString(), entity: "FeeConfig", targetId: created._id.toString(), metadata: { version: nextVersion, ...values } });

  res.json({ success: true, message: `Fee configuration updated to version ${nextVersion}`, config: created });
};

// ─── 8. Global Market Configuration ──────────────────────────────────────────

export const getMarketConfigs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { ensureLaunchMarkets } = await import("../services/market.service");
  await ensureLaunchMarkets();
  let markets = await MarketConfig.find(req.countryScopeCode ? { countryCode: req.countryScopeCode } : {}).sort("countryCode").lean();
  if (markets.length === 0) {
    // Seed standard initial markets
    await MarketConfig.create([
      {
        countryCode: "PK",
        countryName: "Pakistan",
        currency: "PKR",
        currencySymbol: "Rs",
        timezone: "Asia/Karachi",
        onlineEnabled: true,
        homeTuitionEnabled: true,
        backgroundCheckRequired: true,
        isActive: true,
        launchStatus: "live",
        supportedCities: ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad"],
      },
      {
        countryCode: "SA",
        countryName: "Kingdom of Saudi Arabia",
        currency: "SAR",
        currencySymbol: "SR",
        timezone: "Asia/Riyadh",
        onlineEnabled: true,
        homeTuitionEnabled: true,
        backgroundCheckRequired: true,
        isActive: true,
        launchStatus: "live",
        supportedCities: ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina"],
      },
      {
        countryCode: "AE",
        countryName: "United Arab Emirates",
        currency: "AED",
        currencySymbol: "AED",
        timezone: "Asia/Dubai",
        onlineEnabled: true,
        homeTuitionEnabled: true,
        backgroundCheckRequired: true,
        isActive: true,
        launchStatus: "live",
        supportedCities: ["Dubai", "Abu Dhabi", "Sharjah"],
      },
      {
        countryCode: "GB",
        countryName: "United Kingdom",
        currency: "GBP",
        currencySymbol: "£",
        timezone: "Europe/London",
        onlineEnabled: true,
        homeTuitionEnabled: false,
        backgroundCheckRequired: true,
        isActive: true,
        launchStatus: "beta",
        supportedCities: ["London", "Manchester", "Birmingham"],
      },
    ]);
    markets = await MarketConfig.find().sort("countryCode").lean();
  }
  res.json({ success: true, markets });
};

export const updateMarketConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const current = await MarketConfig.findById(id);
  if (!current) { res.status(404).json({ success: false, message: "Market configuration not found." }); return; }
  if (req.countryScopeCode && current.countryCode !== req.countryScopeCode) { res.status(404).json({ success: false, message: "Market configuration not found." }); return; }
  const allowed = ["onlineEnabled", "homeTuitionEnabled", "studentRegistration", "tutorRegistration", "backgroundCheckRequired", "isActive", "supportedCities", "supportedLanguages", "defaultLanguage", "verificationPolicy"];
  const changes = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
  // Payment activation is intentionally code/provider gated; an admin toggle cannot make an unconfigured market transactional.
  if (["AE", "GB"].includes(current.countryCode)) Object.assign(changes, { paymentsEnabled: false, payoutsEnabled: false, paymentProvider: "none", launchStatus: "beta", "featureFlags.acceptance": false });
  const updated = await MarketConfig.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true });
  await logAudit({ action: "market_config_updated", actor: req.user?.name || "Administrator", actorId: req.user?._id?.toString(), entity: "MarketConfig", targetId: id as string, metadata: { countryCode: current.countryCode, changes } });
  res.json({ success: true, market: updated });
};

// ─── 9. Admin RBAC Roles Management ──────────────────────────────────────────

export const getAdminRolesOverview = async (_req: AuthRequest, res: Response): Promise<void> => {
  const adminUsers = await User.find({ role: "admin" })
    .select("name email avatar adminRole adminPermissions createdAt")
    .lean();

  res.json({
    success: true,
    availableRoles: Object.keys(ROLE_PERMISSIONS),
    allPermissions: ALL_PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
    adminUsers,
  });
};

export const updateAdminUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { adminRole, adminPermissions } = req.body;

  const target = await User.findById(userId);
  if (!target || target.role !== "admin") {
    res.status(404).json({ success: false, message: "Admin user not found" });
    return;
  }

  // Only super_admin may assign or modify the super_admin role
  const callerRole = req.user?.adminRole;
  if (
    (adminRole === "super_admin" || target.adminRole === "super_admin") &&
    callerRole !== "super_admin"
  ) {
    res.status(403).json({ success: false, message: "Only a super administrator may assign or modify the super_admin role." });
    return;
  }

  target.adminRole = adminRole || target.adminRole;
  if (adminPermissions) target.adminPermissions = adminPermissions;
  await target.save();

  await logAudit({
    action: "admin_role_updated",
    actor: req.user?.name || "Admin",
    actorId: req.user?._id?.toString(),
    entity: "User",
    targetId: target._id.toString(),
    targetName: target.name,
    metadata: { adminRole: target.adminRole, adminPermissions: target.adminPermissions },
  });

  res.json({ success: true, message: `Admin role updated to '${target.adminRole}'`, user: { id: target._id, name: target.name, adminRole: target.adminRole } });
};

// @desc    Promote any user to an admin role, or demote an admin back to a base role
// @route   POST /api/admin/users/:id/promote
// @access  super_admin only
export const promoteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const callerRole = req.user?.adminRole;
  if (callerRole !== "super_admin") {
    res.status(403).json({ success: false, message: "Only a super administrator may promote or demote users." });
    return;
  }

  const { id } = req.params;
  const { role, adminRole, adminPermissions } = req.body;

  const VALID_ROLES = ["student", "tutor", "parent", "admin"];
  const VALID_ADMIN_ROLES = Object.keys(ROLE_PERMISSIONS);

  if (role && !VALID_ROLES.includes(role)) {
    res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }
  if (adminRole && !VALID_ADMIN_ROLES.includes(adminRole)) {
    res.status(400).json({ success: false, message: `Invalid adminRole. Must be one of: ${VALID_ADMIN_ROLES.join(", ")}` });
    return;
  }

  const target = await User.findById(id);
  if (!target) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  // Prevent self-demotion
  if (target._id.toString() === req.user?._id?.toString() && role && role !== "admin") {
    res.status(400).json({ success: false, message: "You cannot demote your own super_admin account." });
    return;
  }

  const prevRole = target.role;
  const prevAdminRole = target.adminRole;

  if (role) target.role = role;
  if (role === "admin" && adminRole) {
    target.adminRole = adminRole;
    target.adminPermissions = adminPermissions || (ROLE_PERMISSIONS[adminRole as keyof typeof ROLE_PERMISSIONS] as string[]) || [];
  } else if (role && role !== "admin") {
    // Demoting from admin: strip admin fields
    target.adminRole = undefined as any;
    target.adminPermissions = [];
  }
  if (role === "admin" && adminPermissions) {
    target.adminPermissions = adminPermissions;
  }

  await target.save({ validateBeforeSave: false });

  await logAudit({
    action: role === "admin" ? "user_promoted_to_admin" : "admin_demoted",
    actor: req.user?.name || "Super Admin",
    actorId: req.user?._id?.toString(),
    entity: "User",
    targetId: target._id.toString(),
    targetName: target.name,
    metadata: { prevRole, prevAdminRole, newRole: target.role, newAdminRole: target.adminRole },
  });

  res.json({
    success: true,
    message: role === "admin"
      ? `${target.name} promoted to admin with role '${target.adminRole}'.`
      : `${target.name} demoted from admin to '${target.role}'.`,
    user: { id: target._id, name: target.name, email: target.email, role: target.role, adminRole: target.adminRole },
  });
};

// @desc    Ban, suspend, or reactivate any user
// @route   PATCH /api/admin/users/:id/moderate
// @access  Private (admin) — super_admin required for admin targets
export const moderateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { action, reason, suspendUntil } = req.body;
  const VALID_ACTIONS = ["ban", "suspend", "reactivate"];
  if (!VALID_ACTIONS.includes(action)) {
    res.status(400).json({ success: false, message: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` });
    return;
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  // Only super_admin may moderate another admin
  if (target.role === "admin" && req.user?.adminRole !== "super_admin") {
    res.status(403).json({ success: false, message: "Only a super administrator may moderate an administrator account." });
    return;
  }
  // Prevent self-moderation
  if (target._id.toString() === req.user?._id?.toString()) {
    res.status(400).json({ success: false, message: "You cannot moderate your own account." });
    return;
  }

  const now = new Date();
  if (action === "ban") {
    target.isActive = false;
    target.sessionInvalidBefore = now;
    (target as any).banReason = reason || "Banned by administrator";
    (target as any).bannedAt = now;
    (target as any).suspendedUntil = undefined;
  } else if (action === "suspend") {
    target.isActive = false;
    target.sessionInvalidBefore = now;
    (target as any).suspendReason = reason || "Suspended by administrator";
    (target as any).suspendedAt = now;
    (target as any).suspendedUntil = suspendUntil ? new Date(suspendUntil) : undefined;
  } else {
    // reactivate
    target.isActive = true;
    target.sessionInvalidBefore = undefined as any;
    (target as any).banReason = undefined;
    (target as any).bannedAt = undefined;
    (target as any).suspendReason = undefined;
    (target as any).suspendedAt = undefined;
    (target as any).suspendedUntil = undefined;
  }

  await target.save({ validateBeforeSave: false });

  await logAudit({
    action: `user_${action}ned`,
    actor: req.user?.name || "Admin",
    actorId: req.user?._id?.toString(),
    entity: "User",
    targetId: target._id.toString(),
    targetName: target.name,
    metadata: { action, reason, suspendUntil },
  });

  const statusLabel = action === "ban" ? "banned" : action === "suspend" ? "suspended" : "reactivated";
  const moderationStatus = action === "ban" ? "banned" : action === "suspend" ? "suspended" : "active";
  res.json({
    success: true,
    message: `${target.name} has been ${statusLabel}.`,
    user: { _id: target._id, id: target._id, name: target.name, email: target.email, isActive: target.isActive, moderationStatus },
  });
};

// ─── 10. Student & Tutor 360° Profiles ───────────────────────────────────────

export const getStudent360 = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id).select("-password").lean();
  if (!user) {
    res.status(404).json({ success: false, message: "Student not found" });
    return;
  }

  const [requests, bookings] = await Promise.all([
    Request.find({ student: id }).sort("-createdAt").lean(),
    Booking.find({ student: id }).populate("tutor", "name email").sort("-createdAt").lean(),
  ]);

  const totalSpent = bookings
    .filter((b) => ["received", "confirmed"].includes(b.paymentStatus))
    .reduce((s, b) => s + (b.studentTotal || b.subtotal || 0), 0);

  res.json({
    success: true,
    student: {
      ...user,
      requests,
      bookings,
      lifetimeSpend: totalSpent,
      totalRequestsCount: requests.length,
      completedBookingsCount: bookings.filter((b) => b.status === "completed").length,
    },
  });
};

export const getTutor360 = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const tutorProfile = await TutorProfile.findOne({ user: id }).populate("user", "-password").lean();
  if (!tutorProfile) {
    res.status(404).json({ success: false, message: "Tutor profile not found" });
    return;
  }

  const [bids, bookings] = await Promise.all([
    Bid.find({ tutor: id }).populate("request", "subject level budget").sort("-createdAt").lean(),
    Booking.find({ tutor: id }).populate("student", "name email").sort("-createdAt").lean(),
  ]);

  const acceptedBids = bids.filter((b) => b.status === "accepted").length;
  const winRate = bids.length ? Math.round((acceptedBids / bids.length) * 100) : 0;
  const totalEarnings = bookings
    .filter((b) => ["received", "confirmed"].includes(b.paymentStatus))
    .reduce((s, b) => s + (b.tutorNet || b.tutorPayout || 0), 0);

  res.json({
    success: true,
    tutor: {
      ...tutorProfile,
      bids,
      bookings,
      winRate,
      totalEarnings,
      offersSubmittedCount: bids.length,
      completedBookingsCount: bookings.filter((b) => b.status === "completed").length,
    },
  });
};

// ─── Maintenance: Seed Zoology eligibility rules ──────────────────────────────
// POST /admin/maintenance/seed-zoology-rules
// Super-admin only. Idempotent — existing rules are never duplicated.
export const seedZoologyEligibilityRules = async (req: AuthRequest, res: Response): Promise<void> => {
  const ZOOLOGY_RULES: { subjectName: string; eligibilityType: "direct" | "conditional"; evidenceRequired: boolean; notes: string }[] = [
    { subjectName: "Biology",              eligibilityType: "direct",      evidenceRequired: false, notes: "Biology is the core subject of a Zoology degree — direct eligibility." },
    { subjectName: "General Science",      eligibilityType: "direct",      evidenceRequired: false, notes: "General Science at school level is fully covered by a Zoology qualification." },
    { subjectName: "Environmental Science",eligibilityType: "direct",      evidenceRequired: false, notes: "Ecology and environmental biology are core components of a Zoology degree." },
    { subjectName: "Chemistry",            eligibilityType: "conditional", evidenceRequired: true,  notes: "Biochemistry studied within Zoology; conditional — transcript evidence required." },
    { subjectName: "Botany",               eligibilityType: "conditional", evidenceRequired: true,  notes: "Plant biology overlaps with zoology; conditional — botany coursework evidence required." },
  ];

  const zoologyDiscipline = await AcademicDiscipline.findOne({ name: /^zoology$/i, status: "active" }).lean();
  if (!zoologyDiscipline) {
    res.status(404).json({ success: false, message: "No active AcademicDiscipline named 'Zoology' found. Create it first." });
    return;
  }

  const report = { created: 0, skipped: 0, missing_subjects: [] as string[] };

  for (const spec of ZOOLOGY_RULES) {
    const subject = await Subject.findOne({ name: new RegExp(`^${spec.subjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), status: "active" }).lean();
    if (!subject) { report.missing_subjects.push(spec.subjectName); continue; }

    const exists = await TeachingEligibilityRule.exists({ discipline: zoologyDiscipline._id, subject: subject._id });
    if (exists) { report.skipped++; continue; }

    await TeachingEligibilityRule.create({
      discipline: zoologyDiscipline._id,
      subject: subject._id,
      eligibilityType: spec.eligibilityType,
      evidenceRequired: spec.evidenceRequired,
      notes: spec.notes,
      status: "active",
    });
    report.created++;
  }

  await logAudit({ action: "maintenance_seed_zoology_rules", actor: (req.user as any)?.name || "admin", entity: "TeachingEligibilityRule", targetId: zoologyDiscipline._id.toString() });
  res.json({ success: true, message: "Zoology eligibility rules seeded.", report });
};

// ─── Maintenance: Recalculate matchesDiscipline for all pending subjects ──────
// POST /admin/maintenance/recalculate-matches-discipline
// Super-admin only. Updates only pending/needs_evidence/rejected entries.
export const recalculateMatchesDiscipline = async (req: AuthRequest, res: Response): Promise<void> => {
  const RECALCULATE_STATUSES = new Set(["pending", "needs_evidence", "rejected"]);
  const report = { profilesScanned: 0, entriesScanned: 0, entriesUpdated: 0, profilesUpdated: 0 };

  const cursor = TutorProfile.find({ "subjectEligibility.0": { $exists: true } }).cursor();

  for await (const profile of cursor) {
    report.profilesScanned++;
    const qualifications = profile.education || [];
    let dirty = false;

    for (const entry of profile.subjectEligibility || []) {
      if (!RECALCULATE_STATUSES.has(entry.status)) continue;
      report.entriesScanned++;

      const targetQualifications = entry.qualificationIndex != null && qualifications[entry.qualificationIndex]
        ? [qualifications[entry.qualificationIndex]]
        : qualifications;

      const disciplines: string[] = [];
      for (const q of targetQualifications) {
        if (q.disciplineRef) {
          const disc = await AcademicDiscipline.findById(q.disciplineRef).lean();
          if (disc?.name) disciplines.push(disc.name);
        } else if (q.discipline?.trim()) {
          disciplines.push(q.discipline.trim());
        }
      }
      if (disciplines.length === 0) continue;

      const resolutions = await Promise.all(disciplines.map((d) => resolveTeachingEligibility(d, entry.subject)));
      const best = resolutions.find((r) => r.eligibilityType === "direct") ?? resolutions.find((r) => r.eligibilityType === "conditional") ?? resolutions[0];

      const newMatch = best.eligibilityType !== "unmapped";
      const changed = entry.matchesDiscipline !== newMatch || entry.eligibilityType !== best.eligibilityType || entry.evidenceRequired !== best.evidenceRequired;
      if (!changed) continue;

      entry.matchesDiscipline = newMatch;
      entry.eligibilityType = best.eligibilityType as typeof entry.eligibilityType;
      entry.evidenceRequired = best.evidenceRequired;
      if (best.subjectId) entry.subjectRef = best.subjectId;
      if (best.ruleId) entry.eligibilityRuleRef = best.ruleId;
      if (entry.status === "pending" && best.eligibilityType === "conditional" && best.evidenceRequired) {
        entry.status = "needs_evidence";
      }

      report.entriesUpdated++;
      dirty = true;
    }

    if (dirty) {
      await profile.save({ validateModifiedOnly: true });
      report.profilesUpdated++;
    }
  }

  await logAudit({ action: "maintenance_recalculate_matches_discipline", actor: (req.user as any)?.name || "admin", entity: "TutorProfile", targetId: "batch" });
  res.json({ success: true, message: "matchesDiscipline recalculated.", report });
};

export const getGlobalAnalytics = async (req: AuthRequest, res: Response) => {
  const [markets, tutorsByCountry, studentsByCountry, requestsByCountry, bookingsByCountry] = await Promise.all([
    MarketConfig.find({}, { countryCode: 1, countryName: 1, launchStatus: 1, flagEmoji: 1, flag: 1 }).lean(),
    User.aggregate([
      { $match: { role: "tutor" } },
      { $group: { _id: "$countryCode", total: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { role: { $in: ["student", "parent"] } } },
      { $group: { _id: "$countryCode", total: { $sum: 1 } } },
    ]),
    Request.aggregate([
      { $group: { _id: "$countryCode", total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ["$status", ["open", "published", "receiving_offers", "negotiating"]] }, 1, 0] } } } },
    ]),
    Booking.aggregate([
      { $group: { _id: "$countryCode", total: { $sum: 1 }, revenueUSD: { $sum: "$amount" } } },
    ]),
  ]);

  const verifiedTutorsByCountry = await TutorProfile.aggregate([
    { $match: { isVerified: true } },
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "u" } },
    { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    { $group: { _id: "$u.countryCode", verified: { $sum: 1 }, avgRating: { $avg: "$averageRating" } } },
  ]);

  const toMap = <T extends { _id: string | null }>(arr: T[]) =>
    Object.fromEntries(arr.map((r) => [r._id ?? "UNKNOWN", r]));

  const tutorMap = toMap(tutorsByCountry as any[]);
  const studentMap = toMap(studentsByCountry as any[]);
  const requestMap = toMap(requestsByCountry as any[]);
  const bookingMap = toMap(bookingsByCountry as any[]);
  const verifiedMap = toMap(verifiedTutorsByCountry as any[]);

  const knownCodes = new Set([
    ...markets.map((m) => m.countryCode),
    ...Object.keys(tutorMap),
    ...Object.keys(studentMap),
    ...Object.keys(requestMap),
    ...Object.keys(bookingMap),
  ].filter(Boolean));

  const marketByCode = Object.fromEntries(markets.map((m) => [m.countryCode, m]));

  const countries = Array.from(knownCodes).map((cc) => {
    const m = marketByCode[cc];
    const t = (tutorMap[cc] as any) ?? { total: 0 };
    const s = (studentMap[cc] as any) ?? { total: 0 };
    const r = (requestMap[cc] as any) ?? { total: 0, active: 0 };
    const b = (bookingMap[cc] as any) ?? { total: 0, revenueUSD: 0 };
    const v = (verifiedMap[cc] as any) ?? { verified: 0, avgRating: 0 };
    const totalReqs = r.total || 0;
    const totalBookings = b.total || 0;
    return {
      countryCode: cc,
      countryName: m?.countryName ?? cc,
      flag: (m as any)?.flagEmoji ?? (m as any)?.flag ?? undefined,
      launchStatus: m?.launchStatus ?? "coming_soon",
      totalTutors: t.total,
      verifiedTutors: v.verified,
      totalStudents: s.total,
      totalRequests: totalReqs,
      activeRequests: r.active,
      totalBookings,
      totalRevenueUSD: Math.round(b.revenueUSD ?? 0),
      avgRating: v.avgRating ? Math.round(v.avgRating * 10) / 10 : 0,
      matchRate: totalReqs > 0 ? Math.round((totalBookings / totalReqs) * 1000) / 10 : 0,
      avgResponseMin: 0, // placeholder — no response-time data model yet
    };
  });

  countries.sort((a, b) => b.totalBookings - a.totalBookings);

  const liveStatuses = new Set(["live", "beta"]);
  res.json({
    success: true,
    totalCountries: countries.length,
    liveCountries: countries.filter((c) => liveStatuses.has(c.launchStatus)).length,
    totalTutors: countries.reduce((s, c) => s + c.totalTutors, 0),
    totalStudents: countries.reduce((s, c) => s + c.totalStudents, 0),
    totalBookings: countries.reduce((s, c) => s + c.totalBookings, 0),
    totalRevenueUSD: countries.reduce((s, c) => s + c.totalRevenueUSD, 0),
    countries,
  });
};
