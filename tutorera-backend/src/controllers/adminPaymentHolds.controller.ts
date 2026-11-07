import { Response } from "express";
import { AuthRequest } from "../types";
import Bid from "../models/Bid.model";
import Booking from "../models/Booking.model";
import PaymentLedger from "../models/PaymentLedger.model";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent.model";
import PaymentCheckoutIntent from "../models/PaymentCheckoutIntent.model";

/** Read-only review queue: a hold is not evidence that money was received. */
export async function listPaymentHolds(req: AuthRequest, res: Response): Promise<void> {
  const parsedPage = Number(req.query.page);
  const page = Number.isFinite(parsedPage) ? Math.min(10000, Math.max(1, Math.floor(parsedPage))) : 1;
  const limit = Math.min(50, Math.max(1, Math.floor(Number(req.query.limit) || 25)));
  const filter = { status: "payment_pending" as const, $or: [
    { paymentOutcomeUnknown: true },
    { checkoutStartedAt: { $exists: true }, paymentPendingExpiresAt: { $lte: new Date() } },
  ] };
  const [total, holds] = await Promise.all([
    Bid.countDocuments(filter),
    Bid.find(filter).select("request amount currency paymentOutcomeUnknown paymentPendingExpiresAt paymentReservationId checkoutStartedAt updatedAt").populate("request", "subject level countryCode status acceptedOffer").sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const ids = holds.map(hold => hold._id);
  const bookings = await Booking.find({ bid: { $in: ids } }).select("_id bid").lean();
  const ledger = await PaymentLedger.find({ $or: [{ bid: { $in: ids } }, { booking: { $in: bookings.map(row => row._id) } }] }).select("bid booking providerTransactionId eventType status currency grossAmount createdAt").sort({ createdAt: -1 }).lean();
  const bookingToBid = new Map(bookings.map(row => [String(row._id), String(row.bid)]));
  const intents = await PaymentCheckoutIntent.find({ $or: [{ bid: { $in: ids } }, { booking: { $in: bookings.map(row => row._id) } }] }).select("bid booking state amount currency createdAt").sort({ createdAt: -1 }).lean();
  const latestIntent = new Map<string, typeof intents[number]>();
  for (const row of intents) { const bidId = row.bid ? String(row.bid) : row.booking ? bookingToBid.get(String(row.booking)) : undefined; if (bidId && !latestIntent.has(bidId)) latestIntent.set(bidId, row); }
  const latest = new Map<string, typeof ledger[number]>();
  for (const row of ledger) { const bidId = row.bid ? String(row.bid) : row.booking ? bookingToBid.get(String(row.booking)) : undefined; if (bidId && !latest.has(bidId)) latest.set(bidId, row); }
  const items = holds.map(hold => {
    const record = latest.get(String(hold._id));
    const intent = latestIntent.get(String(hold._id));
    const reqRecord = hold.request as unknown as { _id?: unknown; subject?: string; level?: string; countryCode?: string; status?: string; acceptedOffer?: unknown } | null;
    return { id: hold._id, request: reqRecord ? { id: reqRecord._id, subject: reqRecord.subject, level: reqRecord.level, countryCode: reqRecord.countryCode, status: reqRecord.status, selected: String(reqRecord.acceptedOffer || "") === String(hold._id) } : null, amount: hold.amount, currency: hold.currency, outcomeUnknown: !!hold.paymentOutcomeUnknown, startedAt: hold.checkoutStartedAt, expiresAt: hold.paymentPendingExpiresAt, updatedAt: hold.updatedAt, hasReservationId: !!hold.paymentReservationId, latestIntent: intent ? { reference: intent._id, state: intent.state, amount: intent.amount, currency: intent.currency, createdAt: intent.createdAt } : null, latestLedger: record ? { reference: record.providerTransactionId, eventType: record.eventType, status: record.status, amount: record.grossAmount, currency: record.currency, createdAt: record.createdAt } : null };
  });
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, total, page, limit, holds: items });
}

/** Verified event receipt only; event status is not a settlement decision. */
export async function listUnresolvedPaymentEvents(req: AuthRequest, res: Response): Promise<void> {
  const parsedPage = Number(req.query.page);
  const page = Number.isFinite(parsedPage) ? Math.min(10000, Math.max(1, Math.floor(parsedPage))) : 1;
  const limit = 25;
  const filter = { state: { $in: ["pending", "unmatched", "exception"] as const } };
  const [total, events] = await Promise.all([
    PaymentWebhookEvent.countDocuments(filter),
    PaymentWebhookEvent.find(filter).select("reference eventType status amount currency state reviewReason verifiedAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, total, page, limit, events });
}

/** Checkout intent is an internal expectation, never a payment result. */
export async function listUnresolvedCheckoutIntents(req: AuthRequest, res: Response): Promise<void> {
  const parsedPage = Number(req.query.page);
  const page = Number.isFinite(parsedPage) ? Math.min(10000, Math.max(1, Math.floor(parsedPage))) : 1;
  const limit = 25;
  const cutoff = new Date(Date.now() - 60000);
  const filter = { $or: [{ state: "unknown" as const }, { state: { $in: ["prepared", "dispatched"] as const }, updatedAt: { $lte: cutoff } }] };
  const [total, intents] = await Promise.all([
    PaymentCheckoutIntent.countDocuments(filter),
    PaymentCheckoutIntent.find(filter).select("provider amount currency state booking bid createdAt updatedAt").sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, total, page, limit, intents });
}

/** Finance-only evidence; no provider state is inferred or modified. */
export async function getPaymentEventEvidence(req: AuthRequest, res: Response): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  if (!id || id.length > 200) { res.status(400).json({ success: false, message: "Invalid event identifier." }); return; }
  const event = await PaymentWebhookEvent.findById(id).select("provider reference eventType status amount currency state reviewReason verifiedAt").lean();
  if (!event) { res.status(404).json({ success: false, message: "Payment event not found." }); return; }
  const reference = event.reference;
  const [intent, ledger] = reference ? await Promise.all([
    PaymentCheckoutIntent.findOne({ _id: reference, provider: event.provider }).select("provider amount currency state bid booking createdAt updatedAt").lean(),
    PaymentLedger.find({ provider: event.provider, providerTransactionId: reference }).select("eventType status settlementStatus grossAmount currency bid booking createdAt").sort({ createdAt: -1, _id: -1 }).limit(20).lean(),
  ]) : [null, []];
  const bidId = intent?.bid || ledger.find(row => row.bid)?.bid;
  const bookingId = intent?.booking || ledger.find(row => row.booking)?.booking;
  const [bid, booking] = await Promise.all([
    bidId ? Bid.findById(bidId).select("request amount currency status paymentOutcomeUnknown checkoutStartedAt paymentPendingExpiresAt").lean() : null,
    bookingId ? Booking.findById(bookingId).select("status paymentStatus currency studentTotal").lean() : null,
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, event, intent, ledger, bid, booking, ledgerLimit: 20 });
}
