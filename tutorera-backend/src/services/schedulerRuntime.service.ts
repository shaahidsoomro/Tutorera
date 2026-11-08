import type { Server } from "socket.io";
import { JOB_SCHEDULES, ScheduledJobName } from "../config/scheduledJobs";
import { runWithJobLease, ReplayMeta } from "./scheduledJobLease.service";
import { processOfferExpirations } from "../utils/offerExpiry";
import { processAbandonedJourneyRecovery } from "../utils/abandonedJourneyRecovery";
import { processRequestLifecycle } from "./requestLifecycle.service";
import { processPendingPayouts } from "./payout.service";
import { refreshRates } from "./exchangeRate.service";
import { sendAgreementReminders } from "./legalAgreementReminder.service";
import { sendMissingDocumentsReminders } from "./missingDocumentsReminder.service";
import { processEmailOutbox } from "./emailOutbox.service";
import logger from "../config/logger";

export function runScheduledJob(name: ScheduledJobName, io?: Server, replayMeta?: ReplayMeta) {
  const work: Record<ScheduledJobName, () => Promise<unknown>> = {
    "email-outbox-delivery": () => processEmailOutbox(),
    "offer-expiry-processing": () => processOfferExpirations(io),
    "request-lifecycle-processing": () => processRequestLifecycle(io),
    "abandoned-journey-recovery": () => processAbandonedJourneyRecovery(),
    "pending-payout-processing": () => processPendingPayouts(),
    "exchange-rate-refresh": () => refreshRates(),
    "agreement-reminder-delivery": () => sendAgreementReminders(io),
    "missing-document-reminder-delivery": () => sendMissingDocumentsReminders(io),
  };
  const schedule = JOB_SCHEDULES.find((job) => job.name === name);
  if (!schedule) throw new Error("Unknown scheduled job");
  return runWithJobLease(name, schedule.leaseMs, work[name], replayMeta);
}

/** Render retains timers; Cloudflare dispatches explicitly instead. */
export function startProcessScheduler(io?: Server): () => void {
  const mode = process.env.SCHEDULER_MODE || "process";
  if (!["process", "external", "disabled"].includes(mode)) throw new Error("Invalid SCHEDULER_MODE");
  if (mode !== "process") return () => {};
  const timers: NodeJS.Timeout[] = [];
  for (const job of JOB_SCHEDULES) {
    const tick = () => { void runScheduledJob(job.name, io).catch((err) => logger.error({ err, job: job.name }, "Scheduled job failed")); };
    timers.push(setInterval(tick, job.intervalMs), setTimeout(tick, job.initialDelayMs));
  }
  timers.forEach((timer) => timer.unref());
  return () => timers.forEach((timer) => clearTimeout(timer));
}
