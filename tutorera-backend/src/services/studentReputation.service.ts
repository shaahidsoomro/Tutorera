// src/services/studentReputation.service.ts
// Computes a student's reliability profile for display to tutors on request detail.
// Derived entirely from existing booking, payment and rating records — no new model.

import { Types } from "mongoose";
import Booking from "../models/Booking.model";
import StudentRating from "../models/StudentRating.model";

export interface StudentReputationSummary {
  totalBookings: number;
  completedBookings: number;
  cancelledByStudent: number;
  paymentSuccessRate: number;   // 0-100
  averageRatingByTutors: number | null;  // null = no ratings yet
  totalRatingsByTutors: number;
  reliabilityTier: "excellent" | "good" | "fair" | "new";
  reliabilityScore: number;     // 0-100 composite
}

export async function getStudentReputation(studentUserId: Types.ObjectId | string): Promise<StudentReputationSummary> {
  const sid = typeof studentUserId === "string" ? new Types.ObjectId(studentUserId) : studentUserId;

  const [bookings, ratings] = await Promise.all([
    Booking.find({ student: sid }).select("status cancelReason paymentStatus").lean(),
    StudentRating.find({ student: sid }).select("rating").lean(),
  ]);

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === "completed").length;
  const cancelledByStudent = bookings.filter(b =>
    b.status === "cancelled" && b.cancelReason && !b.cancelReason.toLowerCase().includes("tutor")
  ).length;

  const paidBookings = bookings.filter(b => ["confirmed", "received"].includes(b.paymentStatus));
  const paymentSuccessRate = totalBookings > 0 ? Math.round((paidBookings.length / totalBookings) * 100) : 100;

  const totalRatingsByTutors = ratings.length;
  const averageRatingByTutors = totalRatingsByTutors > 0
    ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / totalRatingsByTutors) * 10) / 10
    : null;

  // Composite reliability score (0-100)
  let score = 100;
  if (totalBookings >= 2) {
    const cancelRate = cancelledByStudent / totalBookings;
    score -= Math.min(40, Math.round(cancelRate * 80));
    score -= Math.max(0, Math.round((100 - paymentSuccessRate) * 0.4));
    if (averageRatingByTutors !== null) {
      score -= Math.max(0, Math.round((5 - averageRatingByTutors) * 8));
    }
  }
  score = Math.max(0, Math.min(100, score));

  let reliabilityTier: StudentReputationSummary["reliabilityTier"];
  if (totalBookings === 0) reliabilityTier = "new";
  else if (score >= 85) reliabilityTier = "excellent";
  else if (score >= 65) reliabilityTier = "good";
  else reliabilityTier = "fair";

  return {
    totalBookings,
    completedBookings,
    cancelledByStudent,
    paymentSuccessRate,
    averageRatingByTutors,
    totalRatingsByTutors,
    reliabilityTier,
    reliabilityScore: score,
  };
}
