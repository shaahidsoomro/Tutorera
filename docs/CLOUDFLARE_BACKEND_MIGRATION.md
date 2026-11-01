# Cloudflare Free hosting — MongoDB retained

## Current decision — 2026-10-30

### Release reliability checkpoint

- Render service history shows commit `86b3bcd97bcb68ddb1a47dc9b2011ada3dee57bb`
  as the last live backend deployment (created 1 October). The latest attempted
  main deployment `50f9b1e2` failed on 26 October. App logs indicate a missing
  `USD_PKR_RATE` and also reference `SWICH_AUTH_BASE_URL` and `SWICH_API_BASE_URL`;
  these findings
  identify configuration problems but do not establish that they are the only
  cause. Frontend and backend therefore have substantial version drift.
- Render's own auto-deploy trigger was changed from `commit` to `off` and verified
  by a subsequent API read. This does not change the running backend and prevents
  Render from bypassing release checks on a future main push. A controlled workflow
  can trigger a specific approved deployment after RapidPay readiness is resolved.
- Local GitHub workflow changes require credentials, use the tracked npm lockfile,
  build the frontend once, deploy the built artifact and fail smoke checks on bad
  status or wrong `BUILD_ID`. Backend deployment uses Render's documented
  `commitId`, waits for the exact deployment and commit to be live, and verifies
  MongoDB readiness. It also respects the RapidPay migration gate. The workflow
  tests use mocked provider calls; no new backend deployment was triggered.
- Seven release-check tests, YAML parsing and a read-only live frontend build-ID
  smoke check passed. These workflow changes remain uncommitted and have not run
  in GitHub Actions; GitHub deployment secrets/environments still require setup.

### Live frontend deployment and DNS repair

- Fresh OpenNext build completed all 659 generated pages. Wrangler uploaded the
  frontend on the approved Cloudflare account without enabling paid services.
  Worker version: `8bb7c67c-38a3-4a93-ac68-5f6a7335f902` (100% deployment).
- Custom domains `tutorera.ac.pk` and `www.tutorera.ac.pk` now attach to
  `tutorera-frontend`; workers.dev and preview URLs are disabled.
- Initial domain attachment failed with 100117 because four apex A/AAAA records
  used Cloudflare proxy addresses as origins. All nine original DNS records were
  backed up locally under the ignored `cloudflare/backend/.wrangler/backups/`
  directory. Only the four known-bad address records were removed; custom domains
  created managed `AAAA 100::` records. Existing MX, SPF, DKIM, Google verification
  and private backend-preview records were preserved.
- Live checks: homepage, login, admin health shell, tutor application status,
  onboarding, favicon, robots and tutor discovery returned 200. `www/login`
  redirects 301 to the canonical apex login. Private page responses have noindex.
- A real headless Chromium visit rendered one email and one password field on
  `/login` with no page errors. Anonymous Render auth/admin calls return 401 with
  the correct apex CORS origin and credentials header. No authenticated business
  action, payment or email was performed by these checks.
- **Cloudflare is now the production backend** at `api.tutorera.ac.pk`; the
  frontend production API URL already points to this hostname. The Worker uses
  the native backend runtime, Durable Object scheduling, and the verified
  RapidPay configuration. Render remains available as a rollback/reference
  service until production workflows have been monitored through a full release
  window.

### Payment decision superseding earlier checkpoints

Scheduler follow-up: busy MongoDB leases now keep queue items pending without
consuming failure attempts; only acquired, successful runs become completed.
Alarms honor `ENABLE_SCHEDULED_JOBS=false` even for persisted queues, and database
startup outages explicitly rearm the alarm instead of relying on finite platform
retries. Dead-letter moves are atomic. Worker type checking and ten policy/job
outcome tests passed. Native liveness/internal-route smoke also passed, but does
not establish scheduler restart, concurrency or exactly-once external effects.
Production scheduling remains disabled pending handover and integration tests.

Lease concurrency follow-up: Mongo leases now use a unique owner per invocation,
and acquisition requires expiry even within the same process. Completion/failure
updates match that invocation's owner, preventing an expired worker from releasing
a replacement's lease. Two backend suites passed 11 tests, including overlapping
invocations and an expired owner's late completion. No production jobs were run.
Lease renewal is now implemented at one-third of the configured duration, with
owner-and-expiry checks and no overlapping renewal queries. Timers are stopped
and an in-flight renewal is awaited before completion/failure updates. A failed
renewal or lost ownership prevents a successful run result and records a failed
run with its invocation owner. Invalid durations are rejected before acquisition.
Two backend suites passed 17 tests, including real fixture-database renewal,
overlap exclusion, late completion after ownership transfer and invalid durations.
Native alarm restart/concurrency and external-effect fencing remain release
gates: lease renewal cannot cancel an already dispatched email/payment request.
This is not exactly-once delivery or proof that external effects cannot repeat.

Native alarm fixtures now run the actual queue/alarm methods in workerd with
SQLite state persisted across a full Miniflare dispose/recreation. Isolated job
and database stubs cover busy-lease deferral, disabled scheduling, resume,
database-outage rearming, successful completion, duplicate Cron delivery, retries
and third-failure dead letters. A duplicate dispatch no longer resurrects an
existing dead letter; replay must be an explicit future administrative action.
Run `npm run test:native-alarms` in `cloudflare/backend`; CI includes this check.
The fixture entry point is generated in memory only and is never deployed. No
production MongoDB, provider, email or payout services are used. Actual native
provider/network effects and operator replay UI remain unverified/pending.

Admin monitoring alignment: system health now reports scheduler engine, dispatch
enabled state and whether queue visibility is available. The frontend labels
native pending/dead-letter visibility as unavailable rather than implying Mongo
run history is the queue. Retry guidance reflects the three-failure native limit;
job descriptions match the shared scheduler names. `lastSucceededAt` now uses
retained lease completion data, avoiding missing success dates outside the last
200 successful runs. The observability suite passed 13 tests. An authenticated,
audited native queue replay interface remains pending.

Read-only queue inspection is now connected to the existing `system.monitor`
protected admin health endpoint through an in-process Worker inspector, with no
new public internal endpoint. The admin page displays pending jobs, held failures,
attempt counts and observation time. Each state is limited to 100 entries with
explicit truncation markers; lists expose operational fields only. Inspection
failure is reported as unavailable without breaking the remaining health report.
The backend observability suite passed 14 tests; native SQLite fixtures additionally
verify queue projection and bounded/truncated responses. No replay or deletion
control has been enabled, and no production deployment was made.

The owner selected **RapidPay only** on 2026-10-30. Earlier Swich checks below are
historical evidence, not approval to deploy Swich. The current application still
implements Swich; changing a configuration label does not migrate checkout.
Cloudflare deployment and bootstrap preflight now reject that mismatch before
network changes. The private read-only preview is unchanged.

Historical Rapid implementation: `3cb2ef73^`,
`tutorera-backend/src/services/rapidpayProvider.service.ts`. It uses OAuth,
form-encoded checkout and a redirect response, but explicitly identifies its live
transaction path as unconfirmed. Do not restore it blindly. Current authoritative
Render settings contain older Rapid secret/webhook settings but lack the merchant
ID and live OAuth client ID/secret. No credential values belong in this document.

Remaining payment migration, in order:

1. Obtain current merchant documentation, approved live hosts, credentials,
   supported charge/settlement currencies and markets. Validate webhook signing,
   replay protection, transaction lookup, refunds and payout capabilities.
2. Implement and test Rapid checkout and authenticated confirmation; preserve
   authoritative amount/currency/FX snapshots. The approved USD/PKR rate is 276.60
   only where the verified gateway contract requires conversion.
3. Replace Swich market flags, checkout UI, CNIC-specific prompts where unneeded,
   runtime validation, scheduler reconciliation, secret allowlists and deployment
   configuration together. Retain financial history and safely reconcile any old
   pending transactions before retiring legacy callbacks and credentials.
4. Test tampered/duplicate callbacks, currency/amount mismatches, retries and
   booking idempotency, then mark the release policy verified with test evidence.
5. Resume protected preview verification, scheduler handover and production
   API/frontend DNS cutover using the release gates below. Cloudflare Free and
   MongoDB remain the hosting/database decisions; no Vercel reintroduction.

### Earlier migration checkpoint (before the RapidPay decision)

- Local main was fast-forwarded to origin/main at `50f9b1e2`; migration edits were
  reapplied cleanly. A recoverable `cloudflare-free-migration-before-main-sync`
  stash was retained. Local migration work is not yet committed/pushed.
- The user approved **276.60 PKR per USD**. Preview/production native configuration
  now uses that rate for new checkouts. Existing ledger snapshots are not rewritten.
- Source Render configuration was retrieved using existing authorized credentials
  in process memory. Its MongoDB connection and live Swich OAuth authentication
  both passed non-payment checks. The local backend `.env` has stale MongoDB
  credentials; do not use it as the authoritative migration source.
- Created the account's free `tutorera-mentisera.workers.dev` namespace after
  Cloudflare rejected deployment without account initialization (10063).
- Provisioned 20 allowlisted settings/secrets on `tutorera-backend-preview`,
  excluding Cloudflare/Render deployment tokens and obsolete Rapid settings.
- Deployed native preview at `https://api-preview.tutorera.ac.pk`. It requires a
  dedicated preview credential, emits noindex, allows only selected GET checks,
  rejects writes and has no scheduled jobs. It is intentionally not a public app.
- Live protected preview readiness returned 200 against the existing MongoDB;
  unauthenticated preview access returned 401, auth-required API access returned
  401, and POST login was blocked with 403. No payment or email was sent.
- Native isolated-fixture tests passed MongoDB readiness, bcrypt login for student,
  tutor, parent and admin, JWT identity, admin isolation and tutor/admin payout PDFs.
- Financial checks exposed a binary floating-point ceiling overcharge at the
  approved rate. Gateway conversion now uses exact decimal integer arithmetic:
  USD 100 becomes PKR 27,660, not 27,661. Existing checkout confirmations still
  use their saved gateway amount/rate. Payment tests were updated for the current
  USD-platform/PKR-gateway contract rather than the obsolete USD gateway fixture.
- Latest targeted payment/reconciliation/payout/lifecycle/geography run passed
  eight suites and 38 tests, including immutable old-rate confirmation. Native
  role/PDF fixture and protected-preview smoke checks passed. Worker check passes
  five policy/configuration tests; a fresh workerd smoke passed with preview auth.
- Hardened log redaction for response session cookies and private preview/job
  headers before allowing production login traffic on the migrated runtime.
- Production apex/API routing, callbacks, Render scheduler and frontend cutover
  have **not** been changed. No paid plan, Containers or R2 were enabled.

### Production-read probe side effect and correction

The initial nominally read-only native check called the existing countries GET
endpoint. That endpoint invoked `ensureLaunchMarkets()` and tax seeding, so it
issued configuration upserts. Do **not** describe that initial check as write-free.
Inspection found six existing market rows and eight existing tax rows with recent
update timestamps, and no newly created rows in those collections during the
inspection window. Existing tax rates use insert-only defaults, but the market
seeder can refresh payment/feature flags. No pre-probe configuration snapshot was
captured, so exact prior market settings cannot be reconstructed from this check;
an administrator should review them. No speculative database rollback was made.

The countries GET no longer seeds or updates market/tax configuration. New Node
and native-fixture tests assert both no implicit inserts and preservation of
admin-selected settings. The production read-only script now probes only readiness,
auth-required and blocked-internal routes, not country listing. Future provisioning
and seed operations remain explicit. No financial transactions or emails were
triggered by this probe.

The user requires **Cloudflare Free only**. The paid Containers proposal is
superseded. No plan upgrade, billing activation, R2 activation, production DNS
change, provider callback change or Render shutdown has occurred.

The backend project now targets native Workers and SQLite-backed Durable Objects.
There are no Container or Queue bindings, Docker build requirements or paid CPU
limit overrides. Existing MongoDB data, Cloudinary file storage, Resend email and
Swich payments remain external. Those providers' own pricing is independent of
Cloudflare. This is not a promise of unlimited free hosting.

Approved account: `e0f40de5e1f6ab0e29c9b1cb3f9a7102`.
Approved zone: `161f01664efbf705463b1d4460a16675` (`tutorera.ac.pk`).

## Why the native approach is possible

Current official documentation supports MongoDB/Mongoose 9 in Workers and
SQLite-backed Durable Objects on Free. Hyperdrive still does not support MongoDB.
A plain Worker has a small CPU budget; the native design routes backend work to
a named Durable Object and must be load-tested under its actual Free quotas.

- [MongoDB and Mongoose support](https://developers.cloudflare.com/workers/databases/third-party-integrations/mongodb/)
- [Durable Objects Free availability and quotas](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

Do not rely on obsolete 3 MB/10 MB bundle-size assumptions: check current platform
limits and the actual upload result. A successful build does not establish CPU,
memory, connection, quota, transaction or provider compatibility.

## Implemented native architecture

- Frontend remains Next.js/OpenNext on Workers; a fresh production build and live
  validation are still required before switching the domain.
- Backend uses a Workers `node:http` adapter inside one SQLite-backed Durable Object
  (`api-primary`). Existing Express controllers, Mongoose models and MongoDB
  transactions are reused rather than replaced with a second data model.
- Backend initialization is lazy and request-scoped: dependency timers and random
  identifiers cannot be created in Worker global scope.
- A custom Node-targeted bundle avoids iconv-lite's browser-disabled stream exports.
  Native built-ins are statically imported for Wrangler compatibility. PDFKit uses
  its self-contained build with embedded standard font data; depd uses its
  maintainer-provided non-eval warning implementation. Request validation, auth,
  body parsing and raw payment-signature bytes are not bypassed.
- Native Workers do not support node:http upgrade events. Socket.IO is explicitly
  configured for HTTP long polling on the native backend. Both chat and notification
  clients share a transport helper. Set build-time
  `NEXT_PUBLIC_SOCKET_TRANSPORT=polling` only when targeting the native backend.
  Existing Render servers retain WebSocket support by default.
- MongoDB connections are kept in the named Durable Object, with a small pool and
  bounded connection selection time. Only one backend dependency installation is
  used, avoiding disconnected duplicate Mongoose instances.
- Cron invokes a private Durable Object RPC to persist scheduled jobs. Alarms run
  them, retain completion markers, retry failed work and retain dead-letter records.
  The existing Mongo job leases/history and service idempotency remain in use.
  This is at-least-once execution, not an exactly-once financial guarantee.
- Preview has no production route or Cron and cannot start scheduled jobs.
  Internal HTTP job routes remain publicly blocked. Native mode has no process
  scheduler or automatic market/legal seed writes.
- Render retains its original process schedules by default. All timers are cleared
  on shutdown. Do not run Render and native production schedulers as co-owners.
- `/health/live` checks process/runtime. `/health/ready` and `/health` require a real
  Mongo connection and ping; failed readiness never exposes connection details.

## Free-tier constraints

Cloudflare Free quotas are enforced, not converted automatically into paid
overages by this code. At review time, ordinary Workers allow 100,000 requests/day,
10 ms active CPU/request and 128 MB memory; Durable Objects have their own
request/duration/storage/CPU limits. Polling counts as requests and can consume
allowances quickly. Verify current documentation and production telemetry.

Do not weaken bcrypt cost, remove security checks, silently disable jobs, or drop
chat to fit quotas. If legitimate traffic exceeds Free limits, explicitly report
capacity exhaustion and request a product decision. Never silently upgrade.

R2 is not required for this release. Cloudflare returned error 10042 requesting
dashboard activation, so Cloudinary remains authoritative and S3 credentials are
not yet validated. No R2 bucket was created.

## Credentials and safe tooling

The supplied account token was verified active and the zone/account match was
confirmed. Credentials disclosed in chat must be rotated; never paste replacement
values into chat or source files.

Local deployment credentials are in Git-ignored, current-user-restricted
`.env.cloudflare.local`. Separate R2 credentials are in `.env.r2.local`.
Deployment commands do not load R2 credentials. Global Wrangler OAuth was not
overwritten. CI uses protected GitHub environment secrets.

From `cloudflare/backend`:

~~~powershell
npm ci
npm run verify:credentials
npm run cf -- whoami
npm run check
npm run smoke:native
npm run cf -- deploy --dry-run --env production
~~~

Use `npm run cf --` rather than bare Wrangler so the intended local credentials
are loaded. The preflight explicitly rejects Container configuration and validates
zone ownership and required backend secret names. Custom Domains let Cloudflare
manage Worker DNS/certificates without an origin IP; existing conflicting records
must be backed up and deliberately replaced only at the verified cutover.

Runtime secrets must be securely provisioned on the intended Worker:

~~~text
MONGO_URI
JWT_SECRET
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
EMAIL_USER
EMAIL_PASS
RESEND
GROQ_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SWICH_CLIENT_ID
SWICH_CLIENT_SECRET
SWICH_AUTH_BASE_URL
SWICH_API_BASE_URL
SWICH_CALLBACK_URL
SWICH_CALLBACK_SECRET
~~~

Also retain configured Swich checkout mode, PWA URL, supported markets/currencies
and optional OAuth/features. Do not copy obsolete Rapid Gateway settings.
Keep the production JWT secret unchanged to preserve tokens. Host-only Render
cookies do not transfer to a new API hostname: test refresh and controlled re-login.

Example secure prompt:

~~~powershell
npm run cf -- secret put MONGO_URI --env production
~~~

The initial secret command may offer to create the missing Worker. Do not attach
production routing or expose a working checkout until all required secrets,
provider verification and sandbox/staging tests pass. Do not invent a Resend
webhook signing secret or change callback verification to get past startup.

## Live state last checked

- `api.tutorera.ac.pk/health/live` and `/` return HTTP 200 from the production
  Worker. The custom domain and production Cron triggers are deployed.
- Production Worker secrets were validated by preflight without printing values.
- Render remains available for rollback/reference; it is no longer the frontend's
  production API authority.
- The old local OpenNext artifact was incomplete (missing handler.mjs). A fresh
  OpenNext build has now completed successfully, including all 659 static pages
  and the server bundle. It has not been deployed or live-load-tested.
- The starting branch was four commits behind origin/main; it is now synchronized.
  Retest the merged payment/frontend changes before the production release.

## Release gates

1. Reconcile origin/main without overwriting local work. Back up and test restore
   of MongoDB. Confirm the current deployed backend commit.
2. Run backend build, Worker/frontend type checks, transport/security tests,
   native workerd smoke and full OpenNext build.
3. Validate Mongo TLS, replica-set transactions, cold starts, connection recovery,
   auth/password hashing, RBAC, documents/uploads, PDFs, signatures and webhooks.
4. Validate native polling transport with real authenticated users, reconnects,
   notifications and chat. Do not confuse Node-only transport tests with native E2E.
5. Test tutor onboarding/resubmission/approval/agreement; student/parent requests;
   offers/negotiation/concurrent acceptance; payment/payout/refund/dispute behavior.
6. Test alarm persistence, duplicate dispatch, retries, daily reminders, dead letters,
   replay and admin job history. Check Free usage and capacity under realistic load.
7. Keep the protected preview and production Worker smoke checks passing.
8. Keep Render's process scheduler disabled after the Cloudflare cutover and
   retain Render as a callback/rollback origin during observation.
9. The API Worker route is active. Build frontend releases with
   `NEXT_PUBLIC_API_URL=https://api.tutorera.ac.pk/api/v1` and
   `NEXT_PUBLIC_SOCKET_TRANSPORT=polling`; redeploy and verify critical pages.
   Runtime Wrangler vars alone do not replace inlined browser build variables.
10. Coordinate Swich/Resend/OAuth callback updates and keep handling old pending
    callbacks until reconciliation completes.
11. Monitor errors, quota/CPU/memory, Mongo connections, scheduler failures, payment
    references and payout totals before retiring Render.

## Rollback

Disable native scheduling and settle in-flight work first. Restore captured Worker
routes/origin DNS/frontend configuration/provider callbacks as applicable, then
re-enable Render's process scheduler. Preserve the shared live database and
reconcile new financial events; never overwrite new transactions with an old backup.

## Verification boundary

Native Worker bundling/startup, isolated MongoDB/auth/PDF behavior and live private
preview MongoDB readiness are verified. Live Swich authentication passed without
creating a payment. Real payment completion/refund workflows, production user UI,
scheduler ownership/retry recovery, Free-quota load tests, a fresh frontend build
after main reconciliation, and production cutover remain pending. No completed
production migration is claimed.

Verified locally: backend build and Worker/frontend type checks passed; six backend
suites passed 24 tests, including authenticated polling event delivery. Five Worker
policy/configuration tests passed. The repeatable native workerd smoke passed
(liveness 200, public internal route 404), and the native production Wrangler
dry run passed without Docker or paid bindings. Upload size was approximately
14 MiB uncompressed / 2.7 MiB gzip. Dependency warnings remain, including deferred
eval paths, so PDF/export/provider paths still require actual runtime tests.
