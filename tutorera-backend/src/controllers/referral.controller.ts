import { Response } from "express";
import { AuthRequest } from "../types";
import User from "../models/User.model";
import Referral from "../models/Referral.model";
import ReferralConfig, { IReferralConfig, IReferralMilestone } from "../models/ReferralConfig.model";
import sendEmail from "../utils/sendEmail";
import { formatCurrencyAmount, SUPPORTED_CURRENCIES } from "../config/countries";
import crypto from "crypto";

const DEFAULT_REFERRAL_CREDIT_AMOUNT = 200;
const DEFAULT_REFERRED_DISCOUNT_AMOUNT = 200;
// New programs settle in the global currency. Records created before currency was
// tracked were all PKR, so they keep that when no currency is stored.
const GLOBAL_SETTLEMENT_CURRENCY = "USD";
const LEGACY_REFERRAL_CURRENCY = "PKR";

// ─── config helpers ──────────────────────────────────────────────────────────

async function getOrCreateConfig(): Promise<IReferralConfig> {
  let config = await ReferralConfig.findOne();
  if (!config) config = await ReferralConfig.create({ currency: GLOBAL_SETTLEMENT_CURRENCY });
  return config;
}

function resolveMilestoneReward(
  creditedCount: number,
  config: IReferralConfig
): { amount: number; milestoneIndex: number } {
  if (!config.milestonesEnabled || !config.milestones.length) {
    return { amount: config.referrerRewardAmount, milestoneIndex: 0 };
  }
  const position = creditedCount + 1; // this referral will be the Nth credited one
  for (let i = 0; i < config.milestones.length; i++) {
    const m: IReferralMilestone = config.milestones[i];
    const inRange = position >= m.fromReferral && (m.toReferral === null || position <= m.toReferral);
    if (inRange) return { amount: m.referrerRewardAmount, milestoneIndex: i + 1 };
  }
  // fallback: last milestone
  const last = config.milestones[config.milestones.length - 1];
  return { amount: last.referrerRewardAmount, milestoneIndex: config.milestones.length };
}

// ─── code generation ─────────────────────────────────────────────────────────

function generateReferralCode(name: string): string {
  const base = name.replace(/\s+/g, "").toUpperCase().slice(0, 5);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${base}${random}`;
}

// ─── public routes ───────────────────────────────────────────────────────────

// @desc    Get my referral info (code + stats + credit balance + milestone progress)
// @route   GET /api/referral/my
// @access  Private
export const getMyReferral = async (req: AuthRequest, res: Response): Promise<void> => {
  let user = await User.findById(req.user?._id);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  if (!user.referralCode) {
    user.referralCode = generateReferralCode(user.name);
    await user.save();
  }

  const referrals = await Referral.find({ referrer: user._id })
    .populate("referred", "name createdAt")
    .sort("-createdAt");

  const creditedReferrals = referrals.filter(r => r.status === "credited");
  const totalEarned = creditedReferrals.reduce((sum, r) => sum + r.creditAmount, 0);

  const config = await getOrCreateConfig();

  // Milestone progress for the UI
  let milestoneProgress: object | null = null;
  if (config.milestonesEnabled && config.milestones.length > 0) {
    const creditedCount = creditedReferrals.length;
    const position = creditedCount + 1;
    let currentMilestone: IReferralMilestone | null = null;
    let nextMilestone: IReferralMilestone | null = null;
    for (let i = 0; i < config.milestones.length; i++) {
      const m = config.milestones[i];
      if (position >= m.fromReferral && (m.toReferral === null || position <= m.toReferral)) {
        currentMilestone = m;
        nextMilestone = config.milestones[i + 1] ?? null;
        break;
      }
    }
    const progressInTier = currentMilestone
      ? creditedCount - currentMilestone.fromReferral + 1
      : 0;
    const tierSize = currentMilestone?.toReferral
      ? currentMilestone.toReferral - currentMilestone.fromReferral + 1
      : null;
    milestoneProgress = {
      creditedCount,
      currentMilestone,
      nextMilestone,
      progressInTier,
      tierSize,
    };
  }

  res.status(200).json({
    success: true,
    referralCode: user.referralCode,
    referralLink: `${process.env.CLIENT_URL}/register?ref=${user.referralCode}`,
    referralCredit: user.referralCredit,
    referralCreditCurrency: user.referralCreditCurrency || (user.referralCredit > 0 ? LEGACY_REFERRAL_CURRENCY : (config.currency || LEGACY_REFERRAL_CURRENCY)),
    program: {
      referrerRewardAmount: config.referrerRewardAmount,
      referredDiscountAmount: config.referredDiscountAmount,
      currency: config.currency || LEGACY_REFERRAL_CURRENCY,
      isActive: config.isActive,
      milestonesEnabled: config.milestonesEnabled,
      milestones: config.milestones,
    },
    milestoneProgress,
    stats: {
      totalReferred: referrals.length,
      creditedCount: creditedReferrals.length,
      pendingCount: referrals.filter(r => r.status === "pending").length,
      totalEarned,
    },
    referrals,
  });
};

// @desc    Apply referral code during/after registration
// @route   POST /api/referral/apply
// @access  Private (newly registered user)
export const applyReferralCode = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ success: false, message: "Referral code is required." });
    return;
  }

  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  if (currentUser.referredBy) {
    res.status(400).json({ success: false, message: "You have already applied a referral code." });
    return;
  }

  const referrer = await User.findOne({ referralCode: code.trim().toUpperCase() });
  if (!referrer) {
    res.status(404).json({ success: false, message: "Invalid referral code." });
    return;
  }

  if (referrer._id.toString() === req.user?._id?.toString()) {
    res.status(400).json({ success: false, message: "You can't use your own referral code." });
    return;
  }

  // Guard against duplicate referral record (belt-and-suspenders alongside unique index)
  const existing = await Referral.findOne({ referred: currentUser._id });
  if (existing) {
    res.status(400).json({ success: false, message: "You have already applied a referral code." });
    return;
  }

  const config = await getOrCreateConfig();
  if (!config.isActive) {
    res.status(400).json({ success: false, message: "The referral program is currently paused." });
    return;
  }

  const currency = config.currency || LEGACY_REFERRAL_CURRENCY;
  const referredDiscountAmount = config.referredDiscountAmount ?? DEFAULT_REFERRED_DISCOUNT_AMOUNT;

  const hasBalance = (currentUser.referralCredit || 0) > 0;
  const balanceCurrency = hasBalance ? (currentUser.referralCreditCurrency || LEGACY_REFERRAL_CURRENCY) : currency;
  if (hasBalance && balanceCurrency !== currency) {
    res.status(400).json({
      success: false,
      message: `Your referral credit balance is held in ${balanceCurrency} and cannot also receive a ${currency} reward.`,
    });
    return;
  }

  currentUser.referredBy = referrer._id;
  currentUser.referralCredit = (currentUser.referralCredit || 0) + referredDiscountAmount;
  currentUser.referralCreditCurrency = balanceCurrency;
  await currentUser.save();

  // Store the base flat referrerRewardAmount as a placeholder; the actual
  // milestone-computed amount will be written when the referral is credited.
  await Referral.create({
    referrer: referrer._id,
    referred: currentUser._id,
    status: "pending",
    creditAmount: config.referrerRewardAmount ?? DEFAULT_REFERRAL_CREDIT_AMOUNT,
    creditCurrency: currency,
  });

  await sendEmail({
    to: referrer.email,
    subject: "🎉 Someone used your TUTORERA® referral code!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Your referral link worked! 🎉</h2>
        <p><strong>${currentUser.name}</strong> just signed up using your referral code.</p>
        <p>You'll receive credit once they complete their first booking.</p>
        <hr />
        <p style="color: #9ca3af; font-size: 0.875rem;">TUTORERA® Referral Program</p>
      </div>
    `,
  });

  res.status(200).json({
    success: true,
    message: `Referral code applied! You've received ${formatCurrencyAmount(referredDiscountAmount, balanceCurrency)} credit to use on your first booking.`,
    creditAdded: referredDiscountAmount,
    creditCurrency: balanceCurrency,
  });
};

// @desc    Credit referrer when referred user completes first booking.
//          Called internally from booking completion flow.
//          Uses findOneAndUpdate for atomic pending→credited flip (idempotent).
export const creditReferrerOnFirstBooking = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user?.referredBy) return;

    const config = await getOrCreateConfig();
    const creditCurrency = config.currency || LEGACY_REFERRAL_CURRENCY;

    // Count how many referrals this referrer has already credited
    const creditedCount = await Referral.countDocuments({
      referrer: user.referredBy,
      status: "credited",
    });

    const { amount: creditAmount, milestoneIndex } = resolveMilestoneReward(creditedCount, config);

    // Atomic flip: only one concurrent call can transition pending→credited
    const referral = await Referral.findOneAndUpdate(
      { referred: userId, status: "pending" },
      { $set: { status: "credited", creditAmount, creditCurrency, milestoneIndex } },
      { new: true }
    );
    if (!referral) return; // already credited or no pending referral

    await User.findByIdAndUpdate(user.referredBy, {
      $inc: { referralCredit: creditAmount },
      $set: { referralCreditCurrency: creditCurrency },
    });

    const referrer = await User.findById(user.referredBy);
    if (referrer) {
      await sendEmail({
        to: referrer.email,
        subject: `💰 You earned ${formatCurrencyAmount(creditAmount, creditCurrency)} referral credit — TUTORERA®`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">${formatCurrencyAmount(creditAmount, creditCurrency)} credit added! 💰</h2>
            <p>Your referral <strong>${user.name}</strong> just completed their first booking.</p>
            <p>We've added <strong>${formatCurrencyAmount(creditAmount, creditCurrency)}</strong> to your TUTORERA® credit balance.</p>
            <hr />
            <p style="color: #6b7280; font-size: 0.875rem;">Share your referral link to earn more credit.</p>
            <p style="color: #9ca3af; font-size: 0.875rem;">TUTORERA® Referral Program</p>
          </div>
        `,
      });
    }
  } catch (err) {
    console.error("Error crediting referrer:", err);
  }
};

// @desc    Reverse a credited referral (chargeback / refund scenario).
//          Deducts the credited amount from the referrer's balance.
//          Called internally from refund/chargeback flow.
export const reverseReferralCredit = async (referredUserId: string, reason: string): Promise<void> => {
  try {
    const referral = await Referral.findOneAndUpdate(
      { referred: referredUserId, status: "credited" },
      { $set: { status: "reversed", reversedAt: new Date(), fraudReason: reason } },
      { new: true }
    );
    if (!referral) return;

    // Deduct the credited amount from referrer; floor at zero
    const referrer = await User.findById(referral.referrer);
    if (referrer) {
      const newBalance = Math.max(0, (referrer.referralCredit || 0) - referral.creditAmount);
      await User.findByIdAndUpdate(referral.referrer, { $set: { referralCredit: newBalance } });
    }
  } catch (err) {
    console.error("Error reversing referral credit:", err);
  }
};

// ─── admin routes ─────────────────────────────────────────────────────────────

// @desc    Get all referrals with pagination + filters
// @route   GET /api/admin/referrals
// @access  Private (admin)
export const getAllReferrals = async (req: AuthRequest, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"), 10));
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const skip  = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const fraud  = req.query.fraud === "true";

  const filter: Record<string, unknown> = {};
  if (status && ["pending", "credited", "reversed", "fraud_hold"].includes(status)) {
    filter.status = status;
  }
  if (fraud) filter.fraudFlag = true;

  const [referrals, total] = await Promise.all([
    Referral.find(filter)
      .populate("referrer", "name email")
      .populate("referred", "name email createdAt")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Referral.countDocuments(filter),
  ]);

  const allCredited = await Referral.find({ status: "credited" }).select("creditAmount creditCurrency");
  const creditedByCurrency = allCredited.reduce((grouped, r) => {
    const cur = r.creditCurrency || LEGACY_REFERRAL_CURRENCY;
    grouped[cur] = (grouped[cur] || 0) + (r.creditAmount || 0);
    return grouped;
  }, {} as Record<string, number>);

  const creditByCurrency = Object.entries(creditedByCurrency).map(([currency, total]) => ({ currency, total }));

  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    limit,
    creditByCurrency,
    // Credit in different currencies is never summed into one figure.
    totalCreditIssued: creditByCurrency.length === 0 ? 0 : creditByCurrency.length === 1 ? creditByCurrency[0].total : null,
    referrals,
  });
};

// @desc    Export referrals as CSV
// @route   GET /api/admin/referrals/export
// @access  Private (admin)
export const exportReferralsAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  const referrals = await Referral.find()
    .populate("referrer", "name email")
    .populate("referred", "name email createdAt")
    .sort("-createdAt");

  const rows = [
    ["Referrer Name", "Referrer Email", "Referred Name", "Referred Email", "Referred Joined", "Status", "Credit Amount", "Currency", "Milestone Tier", "Fraud Flag", "Created At"],
    ...referrals.map(r => {
      const referrer = r.referrer as unknown as { name: string; email: string };
      const referred = r.referred as unknown as { name: string; email: string; createdAt: string };
      return [
        referrer?.name ?? "",
        referrer?.email ?? "",
        referred?.name ?? "",
        referred?.email ?? "",
        referred?.createdAt ? new Date(referred.createdAt).toISOString().split("T")[0] : "",
        r.status,
        String(r.creditAmount),
        r.creditCurrency || LEGACY_REFERRAL_CURRENCY,
        String(r.milestoneIndex ?? ""),
        r.fraudFlag ? "Yes" : "No",
        new Date(r.createdAt).toISOString().split("T")[0],
      ];
    }),
  ];

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="referrals-${Date.now()}.csv"`);
  res.status(200).send(csv);
};

// @desc    Flag / unflag a referral as fraud
// @route   PATCH /api/admin/referrals/:id/fraud
// @access  Private (admin)
export const flagReferralFraud = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fraudFlag, fraudReason } = req.body;
  const referral = await Referral.findByIdAndUpdate(
    req.params.id,
    { $set: { fraudFlag: Boolean(fraudFlag), fraudReason: fraudReason ?? "", status: fraudFlag ? "fraud_hold" : "pending" } },
    { new: true }
  );
  if (!referral) {
    res.status(404).json({ success: false, message: "Referral not found" });
    return;
  }
  res.status(200).json({ success: true, referral });
};

// @desc    Get the current referral reward configuration
// @route   GET /api/admin/referral-config
// @access  Private (admin)
export const getReferralConfigAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  const config = await getOrCreateConfig();
  res.status(200).json({ success: true, config });
};

// @desc    Update the referral reward configuration
// @route   PUT /api/admin/referral-config
// @access  Private (admin)
export const updateReferralConfigAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  const { referrerRewardAmount, referredDiscountAmount, currency, isActive, milestonesEnabled, milestones } = req.body;

  const config = await getOrCreateConfig();

  if (currency !== undefined) {
    const code = String(currency).trim().toUpperCase();
    if (!SUPPORTED_CURRENCIES[code]) {
      res.status(400).json({ success: false, message: `Unsupported currency: ${code}` });
      return;
    }
    config.currency = code;
  }

  if (referrerRewardAmount !== undefined) {
    if (referrerRewardAmount < 0) { res.status(400).json({ success: false, message: "Reward amount can't be negative" }); return; }
    config.referrerRewardAmount = referrerRewardAmount;
  }
  if (referredDiscountAmount !== undefined) {
    if (referredDiscountAmount < 0) { res.status(400).json({ success: false, message: "Discount amount can't be negative" }); return; }
    config.referredDiscountAmount = referredDiscountAmount;
  }
  if (isActive !== undefined) config.isActive = Boolean(isActive);
  if (milestonesEnabled !== undefined) config.milestonesEnabled = Boolean(milestonesEnabled);

  if (milestones !== undefined) {
    if (!Array.isArray(milestones) || milestones.length === 0) {
      res.status(400).json({ success: false, message: "milestones must be a non-empty array" });
      return;
    }
    for (const m of milestones) {
      if (typeof m.fromReferral !== "number" || m.fromReferral < 1) {
        res.status(400).json({ success: false, message: "Each milestone must have fromReferral >= 1" });
        return;
      }
      if (typeof m.referrerRewardAmount !== "number" || m.referrerRewardAmount < 0) {
        res.status(400).json({ success: false, message: "Each milestone must have a non-negative referrerRewardAmount" });
        return;
      }
    }
    config.milestones = milestones;
  }

  config.updatedBy = req.user?._id;
  await config.save();
  res.status(200).json({ success: true, config });
};
