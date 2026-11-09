import { Response } from "express";
import { AuthRequest } from "../types";
import Booking from "../models/Booking.model";
import TutorProfile from "../models/TutorProfile.model";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export const getPricingInsight = async (req: AuthRequest, res: Response): Promise<void> => {
  const { city, subject, teachingMode } = req.query;
  if ([city, subject, teachingMode].some((v) => v !== undefined && (typeof v !== "string" || v.length > 80)) ||
      (teachingMode && !["online", "in-person", "both"].includes(String(teachingMode)))) {
    res.status(400).json({ success: false, message: "Invalid pricing filters." });
    return;
  }

  const match: Record<string, unknown> = { paymentStatus: "confirmed", status: "completed", currency: "PKR" };
  if (teachingMode) match.teachingMode = teachingMode;

  const bookings = await Booking.find(match)
    .populate<{ request: { city?: string; subject?: string } }>("request", "city subject")
    .select("finalAgreedRate pricingUnit teachingMode currency request")
    .lean();

  const profileMatch: Record<string, unknown> = {};
  if (city) profileMatch.city = city;
  if (subject) profileMatch.subjects = { $elemMatch: { $regex: String(subject).split("").map((ch) => /[a-zA-Z0-9 ]/.test(ch) ? ch : String.fromCharCode(92) + ch).join(""), $options: "i" } };
  profileMatch.currency = "PKR";

  const profiles = profileMatch.city || profileMatch.subjects
    ? await TutorProfile.find(profileMatch).select("hourlyRate currency").lean()
    : [];

  const bookingRates = bookings
    .filter((b) => {
      const linked = b.request as unknown as { city?: string; subject?: string } | null;
      if (city && linked?.city?.toLowerCase() !== String(city).toLowerCase()) return false;
      if (subject && !linked?.subject?.toLowerCase().includes(String(subject).toLowerCase())) return false;
      return true;
    })
    .map((b) => {
      const amount = b.finalAgreedRate || 0;
      if (b.pricingUnit === "hour") return amount;
      if (b.pricingUnit === "session") return amount * 2;
      if (b.pricingUnit === "month") return amount / 4;
      return amount;
    })
    .filter(Boolean);

  const profileRates = profiles
    .map((p) => (p.currency === "PKR" ? p.hourlyRate : 0))
    .filter((r) => r > 0);

  const allRates = [...bookingRates, ...profileRates];

  const insight = {
    // Rates are never mixed across currencies; only PKR activity is aggregated.
    currency: "PKR",
    count: allRates.length,
    min: allRates.length ? Math.min(...allRates) : null,
    max: allRates.length ? Math.max(...allRates) : null,
    median: allRates.length ? median(allRates) : null,
    sampleSource: {
      completedBookings: bookingRates.length,
      activeProfiles: profileRates.length,
    },
  };

  res.status(200).json({ success: true, insight });
};
