import { Resend } from "resend";
import EmailLog from "../models/EmailLog.model";
import EmailOutbox from "../models/EmailOutbox.model";
import { renderBrandedEmail } from "../utils/emailBrand";

export type OutboxEmail = { to: string; subject: string; html: string; preheader?: string; category?: string; userId?: string; eventType: string; templateId: string; relatedEntityType?: string; relatedEntityId?: string };
const retryDelayMs = (attempt: number) => Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attempt - 1));

export async function enqueueEmail(input: OutboxEmail) {
  const log = await EmailLog.create({ user: input.userId, eventType: input.eventType, templateId: input.templateId, recipientEmail: input.to, subject: input.subject, relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, status: "queued", queuedAt: new Date() });
  return EmailOutbox.create({ emailLog: log._id, recipientEmail: input.to, subject: input.subject, html: input.html, preheader: input.preheader, category: input.category, eventType: input.eventType, templateId: input.templateId });
}

export async function deliverOutboxEmail(id: string): Promise<void> {
  const now = new Date();
  // Use a 5-second grace window so a document created milliseconds ago is
  // still picked up even if MongoDB clock is slightly ahead of the app clock.
  const graceBefore = new Date(now.getTime() + 5000);
  const job = await EmailOutbox.findOneAndUpdate({ _id: id, status: "queued", nextAttemptAt: { $lte: graceBefore } }, { $set: { status: "processing" }, $inc: { attempts: 1 } }, { returnDocument: "after" });
  if (!job) {
    console.warn(`[emailOutbox] deliverOutboxEmail: job ${id} not found or not ready — will be picked up by retry worker`);
    return;
  }
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: "TUTORERA® <noreply@tutorera.ac.pk>", to: job.recipientEmail, subject: job.subject, html: renderBrandedEmail({ subject: job.subject, html: job.html, preheader: job.preheader, category: job.category || job.eventType }) });
    if (result.error) throw new Error(result.error.message);
    await Promise.all([EmailOutbox.updateOne({ _id: job._id }, { $set: { status: "sent", sentAt: new Date() } }), EmailLog.updateOne({ _id: job.emailLog }, { $set: { status: "sent", sentAt: new Date(), providerMessageId: result.data?.id } })]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email provider error";
    const retry = job.attempts < job.maxAttempts;
    await Promise.all([EmailOutbox.updateOne({ _id: job._id }, { $set: { status: retry ? "queued" : "failed", lastError: message, nextAttemptAt: new Date(Date.now() + retryDelayMs(job.attempts)) } }), EmailLog.updateOne({ _id: job.emailLog }, { $set: { status: "failed", failedAt: new Date(), bounceReason: message, retryCount: job.attempts } })]);
    throw error;
  }
}

export async function processEmailOutbox(limit = 50) {
  const due = await EmailOutbox.find({ status: "queued", nextAttemptAt: { $lte: new Date() } }).sort({ nextAttemptAt: 1 }).limit(limit).select("_id").lean();
  const results = await Promise.allSettled(due.map(job => deliverOutboxEmail(job._id.toString())));
  return { attempted: due.length, sent: results.filter(item => item.status === "fulfilled").length, failed: results.filter(item => item.status === "rejected").length };
}
