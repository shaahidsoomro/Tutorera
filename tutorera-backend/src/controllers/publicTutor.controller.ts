import { Response } from "express";
import { AuthRequest } from "../types";
import TutorProfile from "../models/TutorProfile.model";
import Request from "../models/Request.model";
import { computeAndStoreTutorResponseTime, formatResponseTime } from "../services/tutorStats.service";
import { MatchingService } from "../services/matching.service";
import { PUBLIC_TUTOR_ELIGIBILITY_FILTER } from "../utils/publicTutorEligibility";

function extractObjectId(value: string): string {
  return value.match(/[a-f\d]{24}/i)?.[0] || value;
}

export const getPublicTutorById = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = extractObjectId(String(req.params.id || ""));
  const profile =
    (await TutorProfile.findOne({ _id: id, ...PUBLIC_TUTOR_ELIGIBILITY_FILTER }).populate(
      "user",
      "name email avatar phone city countryCode countryName timezone currency"
    )) ??
    (await TutorProfile.findOne({ user: id, ...PUBLIC_TUTOR_ELIGIBILITY_FILTER }).populate(
      "user",
      "name email avatar phone city countryCode countryName timezone currency"
    ));

  if (!profile) {
    res.status(404).json({ success: false, message: "Tutor not found" });
    return;
  }

  let responseMinutes = profile.averageResponseMinutes;
  if (!responseMinutes) {
    responseMinutes = await computeAndStoreTutorResponseTime(
      (profile.user as any)._id?.toString() || profile.user.toString()
    );
  }

  res.status(200).json({
    success: true,
    profile: {
      ...profile.toObject(),
      averageResponseMinutes: responseMinutes,
      responseTimeFormatted: formatResponseTime(responseMinutes),
    },
  });
};

export const getPublicTutors = async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    search, subject, level, country, countryCode, city, teachingMode, currency,
    minPrice, maxPrice, minRating, language, curriculum,
    page = "1", limit = "10", sort = "-averageRating", matchRequestId,
  } = req.query;

  const filter: Record<string, unknown> = { ...PUBLIC_TUTOR_ELIGIBILITY_FILTER };
  const andClauses: Record<string, unknown>[] = [];

  if (search) {
    const pattern = new RegExp(search as string, "i");
    andClauses.push({ $or: [
      { fullName: pattern }, { subjects: pattern }, { bio: pattern },
      { city: pattern }, { countryName: pattern }, { curricula: pattern },
    ] });
  }
  if (subject) filter.subjects = { $in: [new RegExp(subject as string, "i")] };
  if (level) filter.levels = { $in: [level] };

  const selectedCountry = countryCode || country;
  if (selectedCountry) {
    const codeUpper = String(selectedCountry).toUpperCase();
    andClauses.push({ $or: [
      { countryCode: codeUpper },
      { countryName: new RegExp(String(selectedCountry), "i") },
    ] });
  }
  if (andClauses.length) filter.$and = andClauses;
  if (city) filter.city = new RegExp(city as string, "i");
  if (teachingMode === "online") filter.teachingMode = { $in: ["online", "both"] };
  else if (teachingMode === "in-person") filter.teachingMode = { $in: ["in-person", "both"] };
  else if (teachingMode) filter.teachingMode = teachingMode;
  if (currency) filter.currency = String(currency).toUpperCase();
  if (language) filter["languages.language"] = new RegExp(language as string, "i");
  if (curriculum) filter.curricula = { $in: [new RegExp(curriculum as string, "i")] };
  if (minPrice || maxPrice) filter.hourlyRate = {
    ...(minPrice ? { $gte: Number(minPrice) } : {}),
    ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
  };
  if (minRating) filter.averageRating = { $gte: Number(minRating) };

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const total = await TutorProfile.countDocuments(filter);
  const tutors = await TutorProfile.find(filter)
    .select("user fullName city countryName countryCode subjects levels hourlyRate currency teachingMode averageRating totalReviews averageResponseMinutes lastActiveAt updatedAt isVerified verificationStatus marketplaceEligible")
    .populate("user", "name email avatar city countryCode countryName timezone currency")
    .sort(sort as string)
    .skip(skip)
    .limit(limitNum);

  const tutorsWithResponse = tutors.map((t) => {
    const obj = t.toObject() as any;
    obj.responseTimeFormatted = formatResponseTime(obj.averageResponseMinutes || 0);
    return obj;
  });

  if (matchRequestId && typeof matchRequestId === "string") {
    const matchRequest = await Request.findById(matchRequestId).lean();
    if (matchRequest) {
      const ranked = await MatchingService.rankTutors(matchRequest as any, tutorsWithResponse as any[]);
      const scoreMap = new Map(ranked.map((s) => [String(s.tutor._id), s.matchScore]));
      tutorsWithResponse.forEach((t: any) => {
        t.matchScore = scoreMap.get(t._id.toString()) ?? null;
      });
    }
  }

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    tutors: tutorsWithResponse,
  });
};

export const getPublicTutorSeoFacets = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [result] = await TutorProfile.aggregate([
    { $match: PUBLIC_TUTOR_ELIGIBILITY_FILTER },
    { $facet: {
      countries: [
        { $match: { countryCode: { $nin: [null, ""] } } },
        { $group: { _id: "$countryCode", count: { $sum: 1 } } },
      ],
      cities: [
        { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] } } },
        { $group: { _id: { countryCode: "$countryCode", city: "$city" }, count: { $sum: 1 } } },
      ],
      subjects: [
        { $unwind: "$subjects" },
        { $match: { subjects: { $nin: [null, ""] } } },
        { $group: { _id: { countryCode: "$countryCode", subject: "$subjects" }, count: { $sum: 1 } } },
      ],
      levels: [
        { $unwind: "$levels" },
        { $match: { levels: { $nin: [null, ""] } } },
        { $group: { _id: { countryCode: "$countryCode", level: "$levels" }, count: { $sum: 1 } } },
      ],
      citySubjects: [
        { $unwind: "$subjects" },
        { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] }, subjects: { $nin: [null, ""] } } },
        { $group: { _id: { countryCode: "$countryCode", city: "$city", subject: "$subjects" }, count: { $sum: 1 } } },
      ],
      cityLevelSubjects: [
        { $unwind: "$subjects" }, { $unwind: "$levels" },
        { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] }, subjects: { $nin: [null, ""] }, levels: { $nin: [null, ""] } } },
        { $group: { _id: { countryCode: "$countryCode", city: "$city", level: "$levels", subject: "$subjects" }, count: { $sum: 1 } } },
      ],
      cityCurriculumSubjects: [
        { $unwind: "$subjects" }, { $unwind: "$curricula" },
        { $match: { countryCode: { $nin: [null, ""] }, city: { $nin: [null, ""] }, subjects: { $nin: [null, ""] }, curricula: { $nin: [null, ""] } } },
        { $group: { _id: { countryCode: "$countryCode", city: "$city", curriculum: "$curricula", subject: "$subjects" }, count: { $sum: 1 } } },
      ],
    } },
  ]);

  res.status(200).json({ success: true, ...(result || {}) });
};
