import { Types } from "mongoose";
import { calculateMarketplaceFees } from "../config/constants";
import PaymentLedger from "../models/PaymentLedger.model";
import Booking from "../models/Booking.model";
import Bid from "../models/Bid.model";
import type { MarketplaceFeeQuote } from "./pricing.service";
import { verifyWebhookSignature } from "../utils/rapidGateway";
import { rapidPayProvider, RapidPayCheckoutParams, RapidPayCheckoutResult } from "./rapidPayProvider.service";

export type PaymentProviderName = "rapidpay";

export interface CheckoutParams {
  amount: number;
  currency?: string;
  customerMobileNo: string;
  customerEmail: string;
  basketId: string;
  description: string;
  successUrl: string;
  failureUrl: string;
  checkoutUrl: string;
  bookingId?: string;
  bidId?: string;
  studentId?: string;
  payerId?: string;
  tutorId?: string;
  metadata?: Record<string, unknown>;
  feeSnapshot?: MarketplaceFeeQuote;
  marketCountryCode?: string;
}

export type PaymentCheckoutResult = RapidPayCheckoutResult;

export interface ProviderWebhookEvent {
  provider: PaymentProviderName;
  eventId: string;
  eventType: string;
  merchantTransactionId: string;
  status: string;
  amount: number;
  currency: string;
}

export const paymentProvider = {
  name: "rapidpay" as PaymentProviderName,

  async createCheckout(params: CheckoutParams): Promise<PaymentCheckoutResult> {
    const currency = (params.currency || "").toUpperCase();
    if (!currency) {
      throw { statusCode: 422, code: "PAYMENT_CURRENCY_REQUIRED", message: "Checkout currency is required." };
    }

    const checkoutParams: RapidPayCheckoutParams = {
      amount: params.amount,
      currency,
      marketCountryCode: params.marketCountryCode,
      reference: params.basketId,
      customerEmail: params.customerEmail,
      customerMobile: params.customerMobileNo,
      metadata: {
        bookingId: params.bookingId,
        bidId: params.bidId,
        studentId: params.studentId,
        payerId: params.payerId,
        tutorId: params.tutorId,
      },
    };
    const session = await rapidPayProvider.createCheckout(checkoutParams);

    await recordPaymentLedger({
      providerTransactionId: params.basketId,
      eventType: "checkout.created",
      status: "pending",
      amount: params.amount,
      currency,
      bookingId: params.bookingId,
      bidId: params.bidId,
      studentId: params.studentId,
      payerId: params.payerId || params.studentId,
      tutorId: params.tutorId,
      feeSnapshot: params.feeSnapshot,
      metadata: {
        sessionId: session.sessionId,
        clientSecret: session.clientSecret,
        publishableKey: session.publishableKey,
        platformAmount: params.amount,
        platformCurrency: currency,
        ...(params.metadata || {}),
      },
    });

    return session;
  },

  async confirmCheckout(basketId: string): Promise<{
    confirmed: boolean;
    sessionStatus: string;
    amount?: number;
    currency?: string;
  }> {
    const checkout = await PaymentLedger.findOne({
      providerTransactionId: basketId,
      eventType: "checkout.created",
      provider: { $in: ["rapidpay", "rapid_gateway"] },
    }).sort("-createdAt");
    if (!checkout) {
      throw Object.assign(new Error("No checkout session found"), { statusCode: 404, code: "PAYMENT_SESSION_MISSING" });
    }

    const sessionId = String((checkout.metadata as Record<string, unknown> | undefined)?.sessionId || "");
    if (!sessionId) {
      throw Object.assign(new Error("Checkout session ID is missing"), { statusCode: 422, code: "PAYMENT_SESSION_MISSING" });
    }

    const result = await rapidPayProvider.getSessionStatus(sessionId);
    if (result.status !== "success") {
      return { confirmed: false, sessionStatus: result.status, amount: result.amount, currency: result.currency };
    }
    if (result.amount !== checkout.grossAmount || result.currency.toUpperCase() !== checkout.currency.toUpperCase()) {
      await PaymentLedger.updateOne(
        { _id: checkout._id },
        { $set: { settlementStatus: "exception", "metadata.sessionStatus": result.status } },
      );
      throw Object.assign(new Error("RapidPay payment amount or currency did not match checkout"), {
        statusCode: 422,
        code: "RAPIDPAY_SESSION_MISMATCH",
      });
    }

    return { confirmed: true, sessionStatus: result.status, amount: result.amount, currency: result.currency };
  },

  verifyWebhookSignature,

  normalizeWebhook(body: {
    eventId: string;
    eventType: string;
    merchantTransactionId: string;
    status: string;
    amount: number;
    currency?: string;
  }): ProviderWebhookEvent {
    return {
      provider: "rapid_gateway",
      eventId: body.eventId,
      eventType: body.eventType,
      merchantTransactionId: body.merchantTransactionId,
      status: body.status,
      amount: body.amount,
      currency: body.currency || "PKR",
    };
  },
};

export async function recordPaymentLedger(args: {
  providerTransactionId: string;
  providerEventId?: string;
  eventType: "checkout.created" | "payment.succeeded" | "payment.failed" | "payment.refunded" | "payout.requested" | "payout.completed" | "manual.adjustment";
  status: "pending" | "succeeded" | "failed" | "refunded" | "processing";
  amount: number;
  currency?: string;
  bookingId?: string;
  bidId?: string;
  studentId?: string;
  payerId?: string;
  tutorId?: string;
  metadata?: Record<string, unknown>;
  feeSnapshot?: MarketplaceFeeQuote;
}) {
  // Signed webhooks identify only a checkout basket; restore the authenticated
  // parent payer from its checkout record rather than assuming the learner paid.
  let originalCheckout: { payer?: Types.ObjectId } | null = null;
  if (args.eventType !== "checkout.created") {
    const checkoutQuery = PaymentLedger.findOne({
      providerTransactionId: args.providerTransactionId,
      eventType: "checkout.created",
    }) as any;
    originalCheckout = typeof checkoutQuery?.select === "function"
      ? await checkoutQuery.select("payer").sort("-createdAt").lean()
      : await checkoutQuery;
  }
  const payerId = args.payerId || originalCheckout?.payer?.toString() || args.studentId;
  // Ledger values use the agreed checkout/booking quote, never today's rates.
  let fees: MarketplaceFeeQuote | undefined = args.feeSnapshot;
  if (!fees && args.bookingId) {
    const booking = await Booking.findById(args.bookingId).select("subtotal studentFee tutorFee tax studentTotal tutorNet feeConfig").lean();
    if (booking) fees = { subtotal: booking.subtotal, studentFee: booking.studentFee, tutorFee: booking.tutorFee,
      tax: booking.tax, studentTotal: booking.studentTotal, tutorNet: booking.tutorNet, feeConfig: booking.feeConfig };
  }
  if (!fees && args.bidId) {
    const bid = await Bid.findById(args.bidId).select("feeQuote").lean();
    if (bid?.feeQuote) fees = bid.feeQuote;
  }
  // Backwards compatibility for old transactions without an archived quote.
  if (!fees) fees = calculateMarketplaceFees(args.amount);
  const platformNet = fees.studentFee + fees.tutorFee;
  const settlementStatus: "expected" | "unsettled" = args.status === "succeeded" ? "expected" : "unsettled";
  // Legacy compound unique index includes the always-present provider field;
  // missing providerEventId was indexed as null and blocked second checkouts.
  // Use deterministic internal IDs for checkout records, preserving idempotency.
  const eventId = args.providerEventId || (args.eventType === "checkout.created" ? `checkout:${args.providerTransactionId}` : undefined);
  const doc = {
    provider: paymentProvider.name,
    providerEventId: eventId,
    providerTransactionId: args.providerTransactionId,
    eventType: args.eventType,
    status: args.status,
    grossAmount: args.amount,
    currency: args.currency || "PKR",
    studentPayment: fees.studentTotal,
    studentFee: fees.studentFee,
    tutorFee: fees.tutorFee,
    tax: fees.tax,
    gatewayFee: 0,
    refundAmount: args.eventType === "payment.refunded" ? args.amount : 0,
    tutorPayable: fees.tutorNet,
    platformNet,
    settlementStatus,
    booking: args.bookingId ? new Types.ObjectId(args.bookingId) : undefined,
    bid: args.bidId ? new Types.ObjectId(args.bidId) : undefined,
    student: args.studentId ? new Types.ObjectId(args.studentId) : undefined,
    payer: payerId ? new Types.ObjectId(payerId) : undefined,
    tutor: args.tutorId ? new Types.ObjectId(args.tutorId) : undefined,
    metadata: args.metadata || {},
  };

  if (eventId) {
    return PaymentLedger.findOneAndUpdate(
      { provider: paymentProvider.name, providerEventId: eventId },
      { $setOnInsert: doc },
      { upsert: true, new: true }
    );
  }

  return PaymentLedger.create(doc);
}
