/** Shared by Node and Cloudflare; cron expressions use UTC. */
export const JOB_SCHEDULES = [
  { name: "email-outbox-delivery", cron: "*/5 * * * *", intervalMs: 5 * 60_000, leaseMs: 4 * 60_000, initialDelayMs: 25_000 },
  { name: "offer-expiry-processing", cron: "*/15 * * * *", intervalMs: 15 * 60_000, leaseMs: 14 * 60_000, initialDelayMs: 10_000 },
  { name: "request-lifecycle-processing", cron: "*/15 * * * *", intervalMs: 15 * 60_000, leaseMs: 14 * 60_000, initialDelayMs: 15_000 },
  { name: "abandoned-journey-recovery", cron: "0 * * * *", intervalMs: 60 * 60_000, leaseMs: 59 * 60_000, initialDelayMs: 20_000 },
  { name: "pending-payout-processing", cron: "0 * * * *", intervalMs: 60 * 60_000, leaseMs: 59 * 60_000, initialDelayMs: 30_000 },
  { name: "exchange-rate-refresh", cron: "0 * * * *", intervalMs: 60 * 60_000, leaseMs: 59 * 60_000, initialDelayMs: 5_000 },
  { name: "agreement-reminder-delivery", cron: "0 4 * * *", intervalMs: 24 * 60 * 60_000, leaseMs: 23 * 60 * 60_000, initialDelayMs: 40_000 },
  { name: "missing-document-reminder-delivery", cron: "0 4 * * *", intervalMs: 24 * 60 * 60_000, leaseMs: 23 * 60 * 60_000, initialDelayMs: 50_000 },
] as const;

export type ScheduledJobName = typeof JOB_SCHEDULES[number]["name"];
