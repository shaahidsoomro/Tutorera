// src/services/matching.service.ts
// Production-Ready TUTORERA Smart Matching Engine
// 8-Layer Two-Sided Recommender Architecture with Bayesian Rating, Timezone Normalization & Explainability

import mongoose, { Types } from "mongoose";
import TutorProfile, { ITutorProfile } from "../models/TutorProfile.model";
import Request, { IRequest } from "../models/Request.model";
import User from "../models/User.model";
import Bid, { IBid } from "../models/Bid.model";
import Booking from "../models/Booking.model";
import BookedSlot from "../models/BookedSlot.model";
import TutorAvailability from "../models/TutorAvailability.model";
import { CalendarSnapshot, calendarCoversInterval, isBookedIntervalConflict, normalizeTutorTimezone } from "./availability.service";
import Review from "../models/Review.model";
import GuaranteeClaim from "../models/GuaranteeClaim.model";
import MatchLog, { IMatchLog } from "../models/MatchLog.model";
import MatchingConfig from "../models/MatchingConfig.model";
import {
  DEFAULT_MATCHING_CONFIG,
  MatchingConfigData,
  SUBJECT_ALIASES,
  LEVEL_HIERARCHY,
  normalizeLevel,
} from "../config/matchingConfig";
import { convertCurrencyRate } from "../config/countries";
import { isMarketplaceEligible, isHomeTuitionEligible } from "./tracking.service";
import { checkSubjectEligibility } from "./subjectEligibility.service";
import { schoolOfferingIsActive } from "./schoolOfferingAvailability.service";
import { sendNotification } from "../utils/socket";
import logger from "../config/logger";

export interface MatchReason {
  text: string;
  category: "subject" | "curriculum" | "availability" | "budget" | "location" | "quality" | "verification";
}

export interface MatchScoreResult {
  score: number;
  tier: "excellent" | "great" | "good" | "fair" | "strong" | "other";
  scoreBreakdown: Record<string, number>;
  reasons: string[];
  algorithmVersion: string;
  isColdStartExploration: boolean;
  currencyConversion?: {
    originalRate: number;
    originalCurrency: string;
    convertedRate: number;
    targetCurrency: string;
    exchangeRate: number;
  };
}

export interface RankedTutorMatch {
  tutor: Record<string, unknown>;
  tutorProfile: ITutorProfile;
  score: number;
  matchScore: number;
  tier: "excellent" | "great" | "good" | "fair" | "strong" | "other";
  scoreBreakdown: Record<string, number>;
  reasons: string[];
  isColdStartExploration: boolean;
}

export interface RankedRequestMatch {
  request: IRequest;
  score: number;
  matchScore: number;
  tier: "excellent" | "great" | "good" | "fair" | "strong" | "other";
  scoreBreakdown: Record<string, number>;
  reasons: string[];
  isInvited?: boolean;
}

export interface RankedOffersResult {
  offers: IBid[];
  totalCount: number;
  cappedCount: number;
  isCapped: boolean;
  capLimit: number;
}

export function buildSubjectSearchPatterns(subject: string): RegExp[] {
  const clean = (subject || "").trim().toLowerCase();
  if (!clean) return [];
  const patterns: RegExp[] = [];
  patterns.push(new RegExp(`^${escapeRegExp(clean)}$`, "i"));
  if (clean.length >= 3) {
    patterns.push(new RegExp(`\\b${escapeRegExp(clean)}\\b`, "i"));
  }

  // Alias lookup
  const alias = SUBJECT_ALIASES[clean];
  if (alias) {
    patterns.push(new RegExp(`^${escapeRegExp(alias.primary)}$`, "i"));
    patterns.push(new RegExp(`\\b${escapeRegExp(alias.primary.toLowerCase())}\\b`, "i"));
    alias.related.forEach((rel) => {
      patterns.push(new RegExp(`^${escapeRegExp(rel)}$`, "i"));
      patterns.push(new RegExp(`\\b${escapeRegExp(rel.toLowerCase())}\\b`, "i"));
    });
  }

  // Reverse alias lookup
  for (const [key, val] of Object.entries(SUBJECT_ALIASES)) {
    if (val.primary.toLowerCase() === clean || val.related.some((r) => r.toLowerCase() === clean)) {
      patterns.push(new RegExp(`^${escapeRegExp(key)}$`, "i"));
      patterns.push(new RegExp(`^${escapeRegExp(val.primary)}$`, "i"));
    }
  }

  return patterns;
}

/** Primary-market restriction used before any scoring or preference filters. */
export function primaryMarketplaceTutorFilter(request: Pick<IRequest, "countryCode">): Record<string, unknown> {
  return request.countryCode ? { countryCode: request.countryCode.toUpperCase() } : {};
}

export class MatchingService {
  private static cachedConfig: MatchingConfigData | null = null;
  private static configCacheTime = 0;

  /**
   * Clears in-memory cached matching weights and thresholds immediately
   */
  public static invalidateConfigCache(): void {
    this.cachedConfig = null;
    this.configCacheTime = 0;
  }

  /**
   * Retrieves active matching weights and thresholds from DB or fallback
   */
  public static async getActiveConfig(): Promise<MatchingConfigData> {
    const now = Date.now();
    if (this.cachedConfig && now - this.configCacheTime < 60000) {
      return this.cachedConfig;
    }
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return DEFAULT_MATCHING_CONFIG;
    }
    try {
      const dbConfig = await MatchingConfig.findOne().sort({ updatedAt: -1 }).lean();
      if (dbConfig) {
        this.cachedConfig = {
          algorithmVersion: dbConfig.algorithmVersion || DEFAULT_MATCHING_CONFIG.algorithmVersion,
          onlineWeights: { ...DEFAULT_MATCHING_CONFIG.onlineWeights, ...(dbConfig.onlineWeights as any) },
          homeWeights: { ...DEFAULT_MATCHING_CONFIG.homeWeights, ...(dbConfig.homeWeights as any) },
          thresholds: { ...DEFAULT_MATCHING_CONFIG.thresholds, ...(dbConfig.thresholds as any) },
          bayesian: { ...DEFAULT_MATCHING_CONFIG.bayesian, ...(dbConfig.bayesian as any) },
          coldStart: { ...DEFAULT_MATCHING_CONFIG.coldStart, ...(dbConfig.coldStart as any) },
        };
        this.configCacheTime = now;
        return this.cachedConfig;
      }
    } catch (err) {
      logger.warn({ err }, "Could not fetch dynamic matching config, using defaults.");
    }
    this.cachedConfig = DEFAULT_MATCHING_CONFIG;
    this.configCacheTime = now;
    return this.cachedConfig;
  }

  /**
   * Bayesian Weighted Rating Formula:
   * (v / (v + m)) * R + (m / (v + m)) * C
   */
  public static calculateBayesianRating(
    rating: number,
    reviewCount: number,
    globalMean = DEFAULT_MATCHING_CONFIG.bayesian.globalMeanRating,
    minThreshold = DEFAULT_MATCHING_CONFIG.bayesian.minReviewThreshold
  ): number {
    if (reviewCount === 0) return globalMean;
    return (
      (reviewCount / (reviewCount + minThreshold)) * rating +
      (minThreshold / (reviewCount + minThreshold)) * globalMean
    );
  }

  /** Load the canonical weekly calendar once per tutor, instead of relying on
   * the older TutorProfile.availability snapshot. Batch queries keep the match
   * page from issuing one availability query per candidate tutor. */
  private static async primeTutorCalendars(tutors: ITutorProfile[], request?: IRequest): Promise<void> {
    const uncached = tutors.filter((tutor) => !(tutor as any).__calendarLoaded);
    if (!uncached.length) return;
    // In-memory match scoring also supports profiles not persisted in MongoDB
    // (legacy recommendation tests, cold-start previews). Query canonical
    // calendars only for actual user ObjectIds; otherwise preserve fallback.
    const ids = uncached.map((tutor) => {
      const user = (tutor as any).user;
      return (user?._id || user)?.toString();
    }).filter((id): id is string => !!id && mongoose.isValidObjectId(id));
    // Scoring can run for synthetic/preview tutors without a MongoDB
    // connection. An empty $in query would still buffer until timeout.
    if (ids.length === 0) {
      for (const tutor of uncached) {
        (tutor as any).__calendarLoaded = true;
        (tutor as any).__calendar = null;
        (tutor as any).__occupied = null;
      }
      return;
    }
    const hasFixedInterval = !!(request?.scheduledStartAt && request?.scheduledEndAt);
    const start = request?.scheduledStartAt ? new Date(request.scheduledStartAt) : null;
    const end = request?.scheduledEndAt ? new Date(request.scheduledEndAt) : null;
    const validFixed = hasFixedInterval && !!start && !!end && end > start;
    const minLegacyDate = start ? new Date(start.getTime() - 2 * 86400_000) : null;
    const maxLegacyDate = end ? new Date(end.getTime() + 2 * 86400_000) : null;
    const [calendars, occupied] = await Promise.all([
      TutorAvailability.find({ tutor: { $in: ids } }).lean(),
      validFixed && start && end && minLegacyDate && maxLegacyDate
        ? BookedSlot.find({ tutor: { $in: ids }, $or: [
          { startAt: { $lt: end }, endAt: { $gt: start } },
          { startAt: { $exists: false }, date: { $gte: minLegacyDate, $lt: maxLegacyDate } },
        ] }).lean()
        : Promise.resolve([]),
    ]);
    const calendarById = new Map(calendars.map((calendar) => [calendar.tutor.toString(), calendar]));
    for (const tutor of uncached) {
      const user = (tutor as any).user;
      const tutorId = (user?._id || user)?.toString();
      const calendar = tutorId ? calendarById.get(tutorId) : undefined;
      (tutor as any).__calendarLoaded = true;
      (tutor as any).__calendar = calendar || null;
      (tutor as any).__occupied = validFixed
        ? occupied.filter((slot) => slot.tutor.toString() === tutorId) : null;
    }
  }

  /**
   * Layer 1: Hard Eligibility Filtering
   * Eliminates ineligible tutors before scoring to prevent wasted computation.
   */
  public static async getEligibleTutors(
    request: IRequest,
    options: { limit?: number; skip?: number } = {}
  ): Promise<ITutorProfile[]> {
    if (!(await schoolOfferingIsActive(request.schoolOfferingId))) return [];
    const isOnline = request.teachingMode === "online";
    const isHome = request.teachingMode === "in-person"; // home tuition uses "in-person" enum value

    const query: Record<string, any> = {
      isVerified: true,
      onboardingComplete: true,
      demoVideoStatus: "approved",
      cnicVerificationStatus: "approved",
      degreeVerificationStatus: "approved",
      verificationStatus: "approved",
      suspendedAt: { $exists: false },
      reVerificationRequired: { $exists: false },
    };
    if (request.schoolOfferingId) query.schoolOfferingIds = request.schoolOfferingId;

    // Teaching Mode & Safety Filter
    if (isOnline) {
      query.teachingMode = { $in: ["online", "both"] };
      // A tutor's primary country is the only marketplace they may serve
      // until an explicit marketplace-access membership exists. Currency or
      // client-supplied preferred-country filters must not widen this gate.
      Object.assign(query, primaryMarketplaceTutorFilter(request));
    } else if (isHome) {
      query.teachingMode = { $in: ["in-person", "both"] };
      query.policeVerificationStatus = "approved";
      if (request.countryCode) {
        query.countryCode = request.countryCode;
      }
      if (request.location && request.location.coordinates && request.location.coordinates.length === 2) {
        query.location = {
          $near: {
            $geometry: request.location,
            $maxDistance: (request.travelRadiusKm || 20) * 1000,
          }
        };
      } else if (request.city) {
        query.city = new RegExp(`^${request.city.trim()}$`, "i");
      }
    } else {
      // "both" mode: show online-capable tutors everywhere, and in-person tutors only where police + location match
      const homeSubQuery: Record<string, unknown> = {
        teachingMode: { $in: ["in-person", "both"] },
        policeVerificationStatus: "approved",
      };
      if (request.countryCode) homeSubQuery.countryCode = request.countryCode;
      if (request.location && request.location.coordinates && request.location.coordinates.length === 2) {
        homeSubQuery.location = {
          $near: {
            $geometry: request.location,
            $maxDistance: (request.travelRadiusKm || 20) * 1000,
          }
        };
      } else if (request.city) {
        homeSubQuery.city = new RegExp(`^${request.city.trim()}$`, "i");
      }

      query.$or = [
        {
          teachingMode: { $in: ["online", "both"] },
          ...primaryMarketplaceTutorFilter(request),
        },
        homeSubQuery,
      ];
    }

    // Subject Filtering (case-insensitive, synonym alias and token patterns).
    // Filters on approvedSubjects (admin-approved), not the self-declared
    // subjects list, so unapproved tutors never surface as eligible matches.
    const subjectPatterns = buildSubjectSearchPatterns(request.subject);
    if (subjectPatterns.length > 0) {
      query.approvedSubjects = { $in: subjectPatterns };
    }

    // Level Compatibility (normalized)
    if (request.level) {
      const normLevel = normalizeLevel(request.level);
      query.levels = { $in: [request.level, normLevel, "Other", "Any"] };
    }

    // Gender preference if explicitly chosen by student
    if (request.tutorGenderPreference && request.tutorGenderPreference !== "none") {
      query.gender = request.tutorGenderPreference;
    }

    const limit = options.limit || 100;
    const skip = options.skip || 0;

    return TutorProfile.find(query)
      .populate("user", "name email avatar city countryCode countryName phone isActive")
      .skip(skip)
      .limit(limit)
      .lean() as unknown as Promise<ITutorProfile[]>;
  }

  /**
   * Layer 2-5: Core Scoring & Explainability Engine
   */
  public static async calculateMatchScore(
    request: IRequest,
    tutor: ITutorProfile,
    config?: MatchingConfigData
  ): Promise<MatchScoreResult | null> {
    const cfg = config || (await this.getActiveConfig());
    if (request.schoolOfferingId && !(tutor.schoolOfferingIds || []).includes(request.schoolOfferingId)) return null;
    const subjectEligibility = checkSubjectEligibility(tutor, request.subject, request.level);
    if (!subjectEligibility.eligible) {
      return {
        score: 0,
        tier: "fair",
        scoreBreakdown: { subject: 0 },
        reasons: [subjectEligibility.message || "Tutor is not approved for this subject and level."],
        algorithmVersion: cfg.algorithmVersion,
        isColdStartExploration: false,
      };
    }
    const isOnline = request.teachingMode === "online" || (request.teachingMode === "both" && tutor.teachingMode === "online");
    const weights = isOnline ? cfg.onlineWeights : cfg.homeWeights;

    // Hard gate for in-person/home tuition: Mandatory Police Verification
    const isHomeTuition = request.teachingMode === "in-person" || (request.teachingMode as string) === "home";
    const hasPoliceClearance = tutor.policeVerificationStatus === "approved" || (tutor as any).policeCertificateVerified === true;
    if (isHomeTuition && !hasPoliceClearance) {
      return {
        score: 0,
        tier: "fair",
        scoreBreakdown: { verification: 0 },
        reasons: ["Background and safety verification required for home tuition."],
        algorithmVersion: cfg.algorithmVersion,
        isColdStartExploration: false,
      };
    }

    const breakdown: Record<string, number> = {};
    const reasons: string[] = [];

    // ── 1. Subject Match ──
    const maxSub = weights.subject;
    const reqSubLower = (request.subject || "").trim().toLowerCase();
    const tutorSubsLower = (tutor.approvedSubjects || []).map((s) => (s || "").trim().toLowerCase());

    const isExactSub = tutorSubsLower.includes(reqSubLower);
    const alias = SUBJECT_ALIASES[reqSubLower];
    const isRelatedSub = !isExactSub && alias && alias.related.some((r) => tutorSubsLower.some((ts) => ts === r.toLowerCase() || ts.includes(r.toLowerCase())));
    const isTokenOverlap = !isExactSub && !isRelatedSub && tutorSubsLower.some((ts) => ts.includes(reqSubLower) || reqSubLower.includes(ts));

    if (isExactSub) {
      breakdown.subject = maxSub;
      reasons.push(`Exact ${request.subject} specialist`);
    } else if (isRelatedSub) {
      breakdown.subject = Math.round(maxSub * 0.88);
      reasons.push(`Specialized knowledge in related ${request.subject} domain`);
    } else if (isTokenOverlap) {
      breakdown.subject = Math.round(maxSub * 0.75);
      reasons.push(`Teaches matching curriculum in ${request.subject}`);
    } else {
      breakdown.subject = Math.round(maxSub * 0.5);
    }

    // ── 2. Level & Curriculum Match ──
    const maxLvl = weights.levelCurriculum;
    const reqLvl = request.level;
    const normReqLvl = normalizeLevel(reqLvl);
    const reqCurriculum = (request.curriculum || "").trim().toLowerCase();
    const tutorLevels = (tutor.levels || []).map((l) => (l || "").trim());
    const tutorNormLevels = tutorLevels.map((l) => normalizeLevel(l));
    const tutorCurricula = (tutor.curricula || []).map((c) => (c || "").trim().toLowerCase());

    const hasExactLevel = tutorLevels.includes(reqLvl) || tutorNormLevels.includes(normReqLvl);
    const hasCurriculum = reqCurriculum ? tutorCurricula.some((c) => c.includes(reqCurriculum) || reqCurriculum.includes(c)) : true;

    if (hasExactLevel && hasCurriculum && reqCurriculum) {
      breakdown.levelCurriculum = maxLvl;
      reasons.push(`${request.curriculum} & ${reqLvl} syllabus certified`);
    } else if (hasExactLevel) {
      breakdown.levelCurriculum = Math.round(maxLvl * 0.88);
      reasons.push(`Teaches ${reqLvl} students`);
    } else {
      // Check level hierarchy adjacency
      const reqRank = LEVEL_HIERARCHY[normReqLvl] || 3;
      const hasAdjacent = tutorNormLevels.some((lvl) => Math.abs((LEVEL_HIERARCHY[lvl] || 3) - reqRank) <= 1);
      breakdown.levelCurriculum = hasAdjacent ? Math.round(maxLvl * 0.6) : Math.round(maxLvl * 0.35);
    }

    // ── 3. Availability & Timezone ──
    if (!(tutor as any).__calendarLoaded) await this.primeTutorCalendars([tutor], request);
    const canonicalCalendar = (tutor as any).__calendar as CalendarSnapshot | null;
    const tutorTimezone = normalizeTutorTimezone(tutor.timezone);
    const fixedStart = request.scheduledStartAt ? new Date(request.scheduledStartAt) : null;
    const fixedEnd = request.scheduledEndAt ? new Date(request.scheduledEndAt) : null;
    const validFixed = !!(fixedStart && fixedEnd && Number.isFinite(fixedStart.getTime()) && Number.isFinite(fixedEnd.getTime()) && fixedEnd > fixedStart);
    if ((request.scheduledStartAt || request.scheduledEndAt) && !validFixed) return null;
    // A tutor who explicitly publishes an empty calendar is not currently
    // accepting timed lessons, even if their legacy profile still lists hours.
    if (canonicalCalendar && canonicalCalendar.weeklySlots.length === 0) return null;
    if (validFixed && fixedStart && fixedEnd) {
      if (canonicalCalendar && !calendarCoversInterval(canonicalCalendar, tutorTimezone, fixedStart, fixedEnd)) return null;
      const tutorId = ((tutor as any).user?._id || (tutor as any).user)?.toString();
      const occupied = (tutor as any).__occupied as any[] | null;
      const existing = occupied || (tutorId && mongoose.isValidObjectId(tutorId) ? await BookedSlot.find({ tutor: tutorId,
        $or: [{ startAt: { $lt: fixedEnd }, endAt: { $gt: fixedStart } },
          { startAt: { $exists: false }, date: { $gte: new Date(fixedStart.getTime() - 2 * 86400_000), $lt: new Date(fixedEnd.getTime() + 2 * 86400_000) } }],
      }).lean() : []);
      if (existing.some((slot) => isBookedIntervalConflict(slot, tutorTimezone, fixedStart, fixedEnd))) return null;
    }
    // Recommended-request scoring also receives hydrated Mongoose documents;
    // spreading a Document directly drops schema fields. Normalize first.
    const tutorData = typeof (tutor as any).toObject === "function"
      ? (tutor as any).toObject() : tutor;
    const tutorWithCalendar = canonicalCalendar
      ? { ...tutorData, availability: canonicalCalendar.weeklySlots.map((slot) => ({
          day: slot.day, slots: [`${slot.startTime}-${slot.endTime}`],
        })) } as ITutorProfile
      : tutor;
    const maxAvail = weights.availability;
    const { overlapScore, timezoneAligned, matchingSlotsCount } = validFixed && canonicalCalendar
      ? { overlapScore: 1, timezoneAligned: true, matchingSlotsCount: 1 }
      : calculateScheduleOverlap(request, tutorWithCalendar);

    breakdown.availability = Math.round(maxAvail * overlapScore);
    if (matchingSlotsCount > 0) {
      reasons.push(`Available during your requested schedule`);
    }
    if (timezoneAligned && isOnline) {
      reasons.push(`Convenient timezone alignment`);
    }

    // ── 4. Teaching Mode Match ──
    const maxMode = weights.mode;
    const reqMode = (request.teachingMode as string) === "home" ? "in-person" : (request.teachingMode || "online");
    const tutMode = (tutor.teachingMode as string) === "home" ? "in-person" : (tutor.teachingMode || "online");

    if (reqMode === "both" || tutMode === "both" || reqMode === tutMode) {
      breakdown.mode = maxMode;
      if (tutMode === "both") {
        reasons.push(`Offers both online and in-person sessions`);
      }
    } else {
      breakdown.mode = Math.round(maxMode * 0.7);
    }

    // ── 5. Budget Compatibility & Currency Normalization ──
    const maxBudget = weights.budget;
    const reqCurrency = request.currency || "USD";
    const tutorCurrency = tutor.currency || "USD";
    const tutorRate = tutor.hourlyRate || 0;

    let convertedTutorRate = tutorRate;
    let exchangeRate = 1.0;

    if (reqCurrency.toUpperCase() !== tutorCurrency.toUpperCase()) {
      const conv = convertCurrencyRate(tutorRate, tutorCurrency, reqCurrency);
      convertedTutorRate = conv.converted;
      exchangeRate = conv.rate;
    }

    let comparableTutorRate = convertedTutorRate;
    let budgetDisplayLabel = `${reqCurrency} ${convertedTutorRate.toLocaleString()}/hr`;

    if (request.pricingUnit === "month") {
      const sessionsPerWeek = request.sessionsPerWeek || 3;
      const durationHours = request.sessionDurationMinutes ? request.sessionDurationMinutes / 60 : 1;
      const monthlyHours = Math.max(4, Math.round(sessionsPerWeek * 4 * durationHours));
      comparableTutorRate = Math.round(convertedTutorRate * monthlyHours);
      budgetDisplayLabel = `~${reqCurrency} ${comparableTutorRate.toLocaleString()}/mo (${reqCurrency} ${convertedTutorRate.toLocaleString()}/hr)`;
    }

    const conversionMeta = {
      originalRate: tutorRate,
      originalCurrency: tutorCurrency,
      convertedRate: convertedTutorRate,
      targetCurrency: reqCurrency,
      exchangeRate,
    };

    // Check hard maximum budget if specified by student
    if (request.maximumBudget && comparableTutorRate > request.maximumBudget) {
      return null; // Excluded by student's private maximum budget
    }

    const reqBudget = request.budget || 0;
    if (reqBudget > 0) {
      if (convertedTutorRate <= 0) {
        breakdown.budget = Math.round(maxBudget * 0.5); // Neutral score for unpriced tutors
      } else if (comparableTutorRate <= reqBudget) {
        breakdown.budget = maxBudget;
        reasons.push(`Within your preferred budget (${budgetDisplayLabel})`);
      } else {
        const ratio = (comparableTutorRate - reqBudget) / reqBudget;
        if (ratio <= 0.1) {
          breakdown.budget = Math.round(maxBudget * 0.9);
          reasons.push(`Competitive rate close to your budget (${budgetDisplayLabel})`);
        } else if (ratio <= 0.2) {
          breakdown.budget = Math.round(maxBudget * 0.7);
        } else if (ratio <= 0.35) {
          breakdown.budget = Math.round(maxBudget * 0.5);
        } else {
          breakdown.budget = Math.round(maxBudget * 0.25);
        }
      }
    } else {
      breakdown.budget = maxBudget;
    }

    // ── 6. Location Match (Home Tuition) ──
    const maxLoc = weights.location;
    if (!isOnline && maxLoc > 0) {
      const locScore = calculateLocationScore(request, tutor);
      breakdown.location = Math.round(maxLoc * locScore.ratio);
      if (locScore.reason) reasons.push(locScore.reason);
    } else {
      breakdown.location = 0;
    }

    // ── 7. Language Match ──
    const maxLang = weights.language;
    const reqLang = (request.preferredLanguage || "").trim().toLowerCase();
    const tutorLangs = tutor.languages || [];

    if (!reqLang || reqLang === "any") {
      breakdown.language = maxLang;
    } else {
      const matchedLang = tutorLangs.find((l) => l.language?.toLowerCase() === reqLang);
      if (matchedLang) {
        if (matchedLang.proficiency === "Native" || matchedLang.proficiency === "Fluent") {
          breakdown.language = maxLang;
          reasons.push(`Fluent in ${matchedLang.language}`);
        } else {
          breakdown.language = Math.round(maxLang * 0.75);
        }
      } else {
        // Lingua franca fallback
        const hasEnglish = tutorLangs.some((l) => l.language?.toLowerCase() === "english");
        breakdown.language = hasEnglish ? Math.round(maxLang * 0.5) : 0;
      }
    }

    // ── 8. Tutor Quality (Bayesian Adjusted Rating + Verification) ──
    const maxQual = weights.quality;
    const v = tutor.totalReviews || 0;
    const R = tutor.averageRating || 0;
    const C = cfg.bayesian.globalMeanRating;
    const m = cfg.bayesian.minReviewThreshold;

    let isColdStartExploration = false;
    let bayesianRating = C;

    if (v === 0) {
      // Cold start: newly verified tutor gets baseline quality score
      const daysSinceCreated = (Date.now() - new Date(tutor.createdAt).getTime()) / (1000 * 3600 * 24);
      if (daysSinceCreated <= cfg.coldStart.newTutorDaysWindow) {
        isColdStartExploration = true;
        bayesianRating = cfg.coldStart.newTutorQualityScore;
        reasons.push(`Verified rising educator (New Tutor)`);
      } else {
        bayesianRating = 4.2;
      }
    } else {
      // Bayesian weighted rating
      bayesianRating = MatchingService.calculateBayesianRating(R, v, C, m);
      if (R >= 4.8 && v >= 5) {
        reasons.push(`Top-rated tutor (${R.toFixed(1)} rating from ${v} verified reviews)`);
      }
    }

    const qualRatio = Math.min(1.0, bayesianRating / 5.0);
    const degreeBonus = (tutor.education && tutor.education.length > 0) ? 0.15 : 0;
    breakdown.quality = Math.min(maxQual, Math.round(maxQual * Math.min(1.0, qualRatio + degreeBonus)));

    // ── 9. Experience Score (Diminishing Returns) ──
    const maxExp = weights.experience;
    const expYears = tutor.experience || 0;
    let expRatio = 0.2;
    if (expYears >= 10) expRatio = 1.0;
    else if (expYears >= 6) expRatio = 0.85;
    else if (expYears >= 4) expRatio = 0.7;
    else if (expYears >= 2) expRatio = 0.5;
    else expRatio = 0.3;

    breakdown.experience = Math.round(maxExp * expRatio);
    if (expYears >= 5) {
      reasons.push(`${expYears}+ years teaching experience`);
    }

    // ── 10. Marketplace Reliability Score ──
    const maxRel = weights.reliability;
    const reliabilityRatio = calculateTutorReliability(tutor);
    breakdown.reliability = Math.round(maxRel * reliabilityRatio);

    // ── 11. Verification & Trust ──
    const maxVer = weights.verification;
    let verPoints = 0;
    if (tutor.isVerified || tutor.verificationStatus === "approved") verPoints += maxVer * 0.6;
    if (tutor.policeVerificationStatus === "approved" || (tutor as any).policeCertificateVerified === true) {
      verPoints += maxVer * 0.4;
      if (!isOnline) reasons.push(`Background and safety verification completed for home tuition`);
    } else {
      reasons.push(`Credentials & degree verified`);
    }
    breakdown.verification = Math.round(Math.min(maxVer, verPoints));

    // ── Total Score Sum ──
    const rawTotal = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const score = Math.min(100, Math.max(0, Math.round(rawTotal)));

    let tier: "excellent" | "great" | "good" | "fair" = "fair";
    if (score >= cfg.thresholds.excellent) tier = "excellent";
    else if (score >= cfg.thresholds.strong) tier = "great";
    else if (score >= cfg.thresholds.good) tier = "good";

    return {
      score,
      tier,
      scoreBreakdown: breakdown,
      reasons: reasons.slice(0, 5), // Return top 5 most relevant reasons
      algorithmVersion: cfg.algorithmVersion,
      isColdStartExploration,
      currencyConversion: conversionMeta,
    };
  }

  /**
   * Rank a list of tutors against a request, enforcing controlled diversity & exploration
   */
  public static async rankTutors(
    request: IRequest,
    tutors: ITutorProfile[]
  ): Promise<RankedTutorMatch[]> {
    const config = await this.getActiveConfig();
    await this.primeTutorCalendars(tutors, request);
    const scoredPromises = tutors.map(async (t) => {
      const match = await this.calculateMatchScore(request, t, config);
      if (!match) return null;

      const tutorUser = (t as any).user || {};
      const tutorHydrated = {
        _id: tutorUser._id || (t as any)._id,
        profileId: (t as any)._id,
        name: tutorUser.name || (t as any).fullName || "Tutor",
        email: tutorUser.email,
        avatar: tutorUser.avatar,
        city: (t as any).city || tutorUser.city,
        countryCode: (t as any).countryCode || tutorUser.countryCode,
        countryName: (t as any).countryName || tutorUser.countryName,
        phone: tutorUser.phone || (t as any).phone,
        hourlyRate: (t as any).hourlyRate,
        currency: (t as any).currency || "USD",
        experience: (t as any).experience || 0,
        education: (t as any).education || [],
        subjects: (t as any).subjects || [],
        levels: (t as any).levels || [],
        curricula: (t as any).curricula || [],
        teachingMode: (t as any).teachingMode || "online",
        teachingModes: (t as any).teachingMode === "both" ? ["online", "in-person"] : [(t as any).teachingMode || "online"],
        policeCertificateVerified: (t as any).policeVerificationStatus === "approved" || (t as any).policeCertificateVerified === true,
        averageRating: (t as any).averageRating || 0,
        totalReviews: (t as any).totalReviews || 0,
      };

      return {
        tutor: tutorHydrated,
        tutorProfile: t,
        score: match.score,
        matchScore: match.score,
        tier: match.tier,
        scoreBreakdown: match.scoreBreakdown,
        reasons: match.reasons,
        isColdStartExploration: match.isColdStartExploration,
      };
    });

    const scored = (await Promise.all(scoredPromises)).filter(Boolean) as RankedTutorMatch[];

    // Sort by match score descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    // Controlled diversity: ensure qualified exploration candidates (new tutors) get 10-20% exposure in top 10
    if (scored.length > 5) {
      const explorationCandidates = scored.filter((m) => m.isColdStartExploration && m.matchScore >= config.thresholds.good);
      const establishedCandidates = scored.filter((m) => !m.isColdStartExploration);

      if (explorationCandidates.length > 0 && establishedCandidates.length > 3) {
        const blended: RankedTutorMatch[] = [];
        let expIdx = 0;
        let estIdx = 0;

        while (estIdx < establishedCandidates.length || expIdx < explorationCandidates.length) {
          // Add 4 established tutors then 1 exploration tutor
          for (let i = 0; i < 4 && estIdx < establishedCandidates.length; i++) {
            blended.push(establishedCandidates[estIdx++]);
          }
          if (expIdx < explorationCandidates.length && blended.length < 15) {
            blended.push(explorationCandidates[expIdx++]);
          }
        }
        return blended;
      }
    }

    return scored;
  }

  /**
   * Two-Sided: Recommend student requests to a tutor based on their profile
   */
  public static async getRecommendedRequestsForTutor(
    tutor: ITutorProfile,
    options: { limit?: number; tutorUserId?: string } = {}
  ): Promise<RankedRequestMatch[]> {
    const config = await this.getActiveConfig();
    await this.primeTutorCalendars([tutor]);
    const limit = options.limit || 20;

    // Build base request candidate query — strictly unexpired fresh demand
    const activeStates = ["open", "published", "receiving_offers", "negotiating"];
    const standardQuery: Record<string, any> = {
      status: { $in: activeStates },
      isDirect: false,
      expiresAt: { $gt: new Date() },
    };

    // Mode filter
    if (tutor.teachingMode === "online") {
      standardQuery.teachingMode = { $in: ["online", "both"] };
    } else if (tutor.teachingMode === "in-person") {
      standardQuery.teachingMode = { $in: ["in-person", "both"] };
      standardQuery.countryCode = tutor.countryCode;
      if (tutor.city) {
        standardQuery.city = new RegExp(`^${tutor.city.trim()}$`, "i");
      }
    }

    // Subject filter - uses admin-approved subjects, not self-declared ones,
    // so recommendations never surface requests the tutor isn't eligible to bid on.
    const tutorSubs = (tutor.approvedSubjects || []).map((s) => new RegExp(`^${escapeRegExp(s.trim())}$`, "i"));
    if (tutorSubs.length > 0) {
      standardQuery.subject = { $in: tutorSubs };
    }

    // A direct invitation is deliberate student intent. It remains subject to
    // safety, freshness and state rules, but should not disappear merely because
    // an otherwise useful profile has incomplete matching metadata.
    const invitedQuery = options.tutorUserId ? {
      status: { $in: activeStates },
      isDirect: false,
      expiresAt: { $gt: new Date() },
      invitedTutors: new Types.ObjectId(options.tutorUserId),
    } : null;
    const query = invitedQuery ? { $or: [standardQuery, invitedQuery] } : standardQuery;

    const candidateRequests = await Request.find(query)
      .populate("student", "name avatar city countryCode countryName")
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const scoredPromises = candidateRequests.map(async (reqDoc) => {
      const match = await this.calculateMatchScore(reqDoc as any, tutor, config);
      const isInvited = Boolean(options.tutorUserId && (reqDoc as unknown as { invitedTutors?: { toString(): string }[] }).invitedTutors?.some((id) => id.toString() === options.tutorUserId));
      if (!match || (!isInvited && match.score < config.thresholds.notificationMinimum)) return null;
      return {
        request: reqDoc,
        score: match.score,
        matchScore: match.score,
        tier: match.tier,
        scoreBreakdown: match.scoreBreakdown,
        reasons: match.reasons,
        isInvited,
      };
    });

    const results = (await Promise.all(scoredPromises)).filter(Boolean) as RankedRequestMatch[];
    results.sort((a, b) => Number(Boolean(b.isInvited)) - Number(Boolean(a.isInvited)) || b.matchScore - a.matchScore);
    return results.slice(0, limit);
  }

  /**
   * Intelligently re-rank received offers on a student's request
   * Applies offer cap (default 5) from matching config to limit qualified offers shown
   */
  public static async rankOffersForRequest(
    request: IRequest,
    offers: IBid[]
  ): Promise<RankedOffersResult> {
    const config = await this.getActiveConfig();
    const maxOffers = config.thresholds.maxOffers || 5;

    const rankedPromises = offers.map(async (offer) => {
      const tutorProfile = await TutorProfile.findOne({ user: offer.tutor }).lean();
      if (!tutorProfile) return { ...offer, matchScore: 50, rankScore: 50, matchReasons: [] };

      const match = await this.calculateMatchScore(request, tutorProfile as any, config);
      const baseScore = match?.score || 50;

      // Offer Price Competitiveness (25% weight)
      const studentBudget = request.budget || 1;
      const offerAmount = offer.convertedRequestAmount || offer.amount || studentBudget;
      let priceScore = 70;
      if (offerAmount <= studentBudget) {
        priceScore = 100;
      } else {
        const overPercent = (offerAmount - studentBudget) / studentBudget;
        priceScore = Math.max(20, Math.round(100 - overPercent * 150));
      }

      // Schedule commitment & response speed
      const responseMinutes = (new Date(offer.createdAt).getTime() - new Date(request.createdAt).getTime()) / 60000;
      const responseSpeedScore = responseMinutes <= 30 ? 100 : responseMinutes <= 120 ? 85 : 70;

      // Composite Rank Score: Base match (60%) + Price fit (25%) + Response speed (15%)
      const rankScore = Math.round(baseScore * 0.6 + priceScore * 0.25 + responseSpeedScore * 0.15);

      return {
        ...(typeof (offer as any).toObject === "function" ? (offer as any).toObject() : offer),
        matchScore: baseScore,
        matchTier: match?.tier || "good",
        rankScore,
        matchReasons: match?.reasons || ["Verified tutor offer"],
        scoreBreakdown: match?.scoreBreakdown || {},
      };
    });

    const ranked = await Promise.all(rankedPromises);
    ranked.sort((a, b) => b.rankScore - a.rankScore);

    // Apply offer cap to limit qualified offers shown to student
    const totalOffers = ranked.length;
    const cappedOffers = ranked.slice(0, maxOffers);

    return {
      offers: cappedOffers,
      totalCount: totalOffers,
      cappedCount: cappedOffers.length,
      isCapped: totalOffers > maxOffers,
      capLimit: maxOffers,
    };
  }

  /**
   * Progressive Tiered Notification Dispatch
   * Notifies top matches (Tier 1: top 15, score >= 80) and logs decisions
   */
  public static async dispatchProgressiveNotifications(
    request: IRequest,
    io?: import("socket.io").Server
  ): Promise<{ notifiedCount: number; tier1Count: number }> {
    try {
      const eligibleTutors = await this.getEligibleTutors(request, { limit: 80 });
      if (!eligibleTutors || eligibleTutors.length === 0) {
        return { notifiedCount: 0, tier1Count: 0 };
      }

      const ranked = await this.rankTutors(request, eligibleTutors);
      const tier1Matches = ranked.filter((m) => m.matchScore >= 80).slice(0, 15);
      // This is the ISO currency code (e.g. "AED", "USD"), not a symbol -
      // was misleadingly named currencySymbol despite never holding one.
      const currencyCode = request.currency || "USD";

      const notifyList = tier1Matches.length >= 3 ? tier1Matches : ranked.slice(0, 10);

      await Promise.all(
        notifyList.map(async (m) => {
          const tutorUserId = m.tutorProfile.user?._id || m.tutorProfile.user;
          if (!tutorUserId) return;

          // Record match impression in MatchLog
          await MatchLog.findOneAndUpdate(
            { request: request._id, tutor: tutorUserId },
            {
              $set: {
                student: request.student,
                score: m.matchScore,
                tier: m.tier,
                scoreBreakdown: m.scoreBreakdown,
                reasons: m.reasons,
                algorithmVersion: DEFAULT_MATCHING_CONFIG.algorithmVersion,
                mode: request.teachingMode,
                notificationTier: 1,
                notificationSentAt: new Date(),
              },
            },
            { upsert: true }
          ).catch((e) => logger.warn({ err: e }, "Failed to upsert MatchLog"));

          // Send real-time socket / platform notification
          if (io) {
            sendNotification(io, tutorUserId.toString(), {
              title: `New ${m.matchScore}% Match: Tuition Opportunity`,
              message: `${request.subject} (${request.level}) · Proposed ${currencyCode} ${request.budget.toLocaleString()}/${request.pricingUnit} · ${request.teachingMode === "online" ? "Online" : request.city || "In-person"}`,
              type: "bid",
              link: "/dashboard?tab=browse",
            });
          }
        })
      );

      return {
        notifiedCount: notifyList.length,
        tier1Count: tier1Matches.length,
      };
    } catch (err) {
      logger.error({ err }, "Error in dispatchProgressiveNotifications");
      return { notifiedCount: 0, tier1Count: 0 };
    }
  }
}

// ─── Helper Calculations ──────────────────────────────────────────────────────

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function calculateScheduleOverlap(
  request: IRequest,
  tutor: ITutorProfile
): { overlapScore: number; timezoneAligned: boolean; matchingSlotsCount: number } {
  const tutorSlots = tutor.availability || [];
  if (tutorSlots.length === 0) {
    return { overlapScore: 0.6, timezoneAligned: true, matchingSlotsCount: 0 }; // Default flexible
  }

  const reqDays = request.preferredDays || [];
  if (reqDays.length === 0) {
    // If student didn't specify strict days, any weekly availability is good
    return { overlapScore: 0.9, timezoneAligned: true, matchingSlotsCount: tutorSlots.length };
  }

  let matchingSlots = 0;
  reqDays.forEach((day) => {
    const slot = tutorSlots.find((s) => s.day?.toLowerCase() === day.toLowerCase());
    if (slot && slot.slots && slot.slots.length > 0) {
      matchingSlots++;
    }
  });

  const overlapRatio = reqDays.length > 0 ? matchingSlots / reqDays.length : 0.8;

  // Approximate timezone offset difference between IANA timezones
  const tzTutor = tutor.timezone || "Asia/Karachi";
  const tzReq = request.timezone || "Asia/Karachi";
  const timezoneAligned = tzTutor === tzReq || Math.abs(getTimezoneOffsetHours(tzTutor) - getTimezoneOffsetHours(tzReq)) <= 3;

  const score = Math.min(1.0, overlapRatio * (timezoneAligned ? 1.0 : 0.85));
  return { overlapScore: score, timezoneAligned, matchingSlotsCount: matchingSlots };
}

function getTimezoneOffsetHours(tz: string): number {
  try {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone: tz }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    return 5.0; // Default to UTC+5
  }
}

function calculateLocationScore(
  request: IRequest,
  tutor: ITutorProfile
): { ratio: number; reason?: string } {
  const reqCity = (request.city || "").trim().toLowerCase();
  const tutorCity = (tutor.city || "").trim().toLowerCase();
  const reqArea = (request.area || "").trim().toLowerCase();
  const tutorAreas = (tutor.serviceAreas || []).map((a) => a.trim().toLowerCase());

  if (reqArea && tutorAreas.includes(reqArea)) {
    return { ratio: 1.0, reason: `Located in your neighborhood (${request.area})` };
  }

  if (reqCity && tutorCity && reqCity === tutorCity) {
    return { ratio: 0.85, reason: `Located in ${request.city}` };
  }

  // If tutor explicitly listed the requested city in service areas
  if (reqCity && tutorAreas.includes(reqCity)) {
    return { ratio: 0.8, reason: `Provides home tutoring in ${request.city}` };
  }

  return { ratio: 0 };
}

function calculateTutorReliability(tutor: ITutorProfile): number {
  // Activity recency
  const lastActive = tutor.updatedAt ? new Date(tutor.updatedAt).getTime() : Date.now();
  const daysSince = (Date.now() - lastActive) / (1000 * 3600 * 24);

  let recencyFactor = 0.6;
  if (daysSince <= 1) recencyFactor = 1.0;
  else if (daysSince <= 7) recencyFactor = 0.85;
  else if (daysSince <= 30) recencyFactor = 0.7;

  // Rating and review track record
  const reviews = tutor.totalReviews || 0;
  const trackFactor = reviews >= 10 ? 1.0 : reviews >= 3 ? 0.85 : 0.75;

  return Math.min(1.0, recencyFactor * 0.5 + trackFactor * 0.5);
}
