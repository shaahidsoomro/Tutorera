import mongoose, { Types } from "mongoose";
import { randomUUID } from "crypto";
import Bid from "../models/Bid.model";
import Request from "../models/Request.model";
import type { MarketplaceFeeQuote } from "./pricing.service";

const ACTIVE_REQUEST_STATES = ["open", "published", "receiving_offers", "negotiating"] as const;
const ACTIVE_OFFER_STATES = ["pending", "submitted", "viewed", "countered"] as const;
const PAYMENT_HOLD_MINUTES = 30;

export async function reserveOffer(requestId: Types.ObjectId, offer: InstanceType<typeof Bid>, parentApproval: boolean, promoCode?: string, feeQuote?: MarketplaceFeeQuote, startCheckout = false): Promise<string | undefined> {
  const session = await mongoose.startSession();
  const reservationId = parentApproval ? undefined : randomUUID();
  try {
    await session.withTransaction(async () => {
      const locked = await Request.updateOne(
        { _id: requestId, status: { $in: ACTIVE_REQUEST_STATES } },
        { $set: { status: parentApproval ? "awaiting_parent_approval" : "awaiting_payment", acceptedOffer: offer._id, finalAgreedRate: offer.amount, ...(parentApproval && promoCode ? { pendingPromoCode: promoCode } : {}) } },
        { session },
      );
      if (!locked.matchedCount) throw { statusCode: 409, message: "This request has already been matched with another tutor." };
      const updated = await Bid.updateOne(
        { _id: offer._id, request: requestId, status: { $in: ACTIVE_OFFER_STATES }, amount: offer.amount, expiresAt: { $eq: offer.expiresAt, $gt: new Date() } },
        parentApproval ? { $inc: { __v: 1 } } : { $set: { status: "payment_pending", paymentReservationId: reservationId, paymentOutcomeUnknown: false, ...(feeQuote ? { feeQuote } : {}), ...(startCheckout ? { checkoutStartedAt: new Date() } : {}), paymentPendingExpiresAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000) } },
        { session },
      );
      if (!updated.matchedCount) throw { statusCode: 409, message: "This offer changed or is no longer available. Refresh and try again." };
    });
  } finally { await session.endSession(); }
  return reservationId;
}

export async function releaseFailedOfferReservation(requestId: Types.ObjectId, offerId: Types.ObjectId, reservationId: string): Promise<boolean> {
  const session = await mongoose.startSession();
  let released = false;
  try {
    await session.withTransaction(async () => {
      released = false;
      const bid = await Bid.findOne({ _id: offerId, request: requestId, status: "payment_pending", paymentReservationId: reservationId }).session(session);
      if (!bid) return;
      const updated = await Request.updateOne(
        { _id: requestId, status: "awaiting_payment", acceptedOffer: offerId },
        { $set: { status: "receiving_offers" }, $unset: { acceptedOffer: "", finalAgreedRate: "" } }, { session },
      );
      if (!updated.matchedCount) return;
      const changed = await Bid.updateOne(
        { _id: offerId, status: "payment_pending", paymentReservationId: reservationId },
        { $set: { status: "submitted" }, $unset: { paymentPendingExpiresAt: "", paymentReservationId: "", paymentOutcomeUnknown: "", checkoutStartedAt: "" } }, { session },
      );
      if (!changed.matchedCount) throw new Error("Payment reservation changed during release");
      released = true;
    });
    return released;
  } finally { await session.endSession(); }
}
