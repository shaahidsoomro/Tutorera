# TUTORERA Student-First Marketplace Gap Audit

**Audit date:** 2026-11-01
**Repository:** `shaahidsoomro/Tutorera`
**Scope:** Student-first marketplace requirements in `Pasted text #1`, including homepage positioning, learning requests, tutor offers, negotiation, booking, trust, matching, dashboards, learning outcomes, and growth instrumentation.

## Executive summary

TUTORERA is not a conventional tutor directory in its current implementation. The repository already has a working demand-led marketplace spine:

1. A student or parent posts a request with a budget and market.
2. Eligible tutors receive matching requests and submit bids.
3. The student compares offers, shortlists, counters, accepts, and enters payment.
4. The platform creates and manages a booking, chat, notifications, reviews, refunds, disputes, and first-session claims.

The strongest implementation is the backend transaction model. Request, bid, counter-offer, booking, payment, expiry, market gating, and tutor eligibility are represented as explicit state and permission-controlled routes.

The largest gap is not missing marketplace primitives. It is product completeness and consistency:

- The homepage communicates the intended positioning, but still offers a prominent legacy "Find Tutors" path and a tutor-directory/SEO-heavy lower half.
- Student request and offer comparison are implemented, but the offer comparison experience is split across multiple surfaces and does not consistently expose the full trust evidence or negotiation history.
- Booking protection exists as claims, refunds, and disputes, but "how money is protected" is not yet a unified, visible student control.
- Learning progress has backend APIs and dashboard components, but it is not yet a complete outcome loop with goals, milestones, progress summaries, and measurable retention signals.
- AI matching exists as parsing/ranking infrastructure; a student-facing matching assistant and transparent explanation loop are not yet a complete product.
- International support is modeled in the backend, but the homepage, copy, pricing defaults, and operational policies still contain Pakistan-first assumptions.

## Evidence and confidence

This audit is based on repository inspection at the audit date. "Implemented" means there is an identifiable route/model/UI path, not that the feature is proven production-ready in every market. "Partial" means a meaningful slice exists but the student journey, consistency, or operational closure is incomplete. "Gap" means no complete implementation was found in the audited surfaces.

The worktree already contained unrelated in-progress edits in:

- [`tutorera-frontend/src/app/admin/applications/[id]/page.tsx`](../tutorera-frontend/src/app/admin/applications/[id]/page.tsx)
- [`tutorera-frontend/src/app/requests/[id]/page.tsx`](../tutorera-frontend/src/app/requests/[id]/page.tsx)
- [`tutorera-frontend/src/components/Dashboard/StudentDashboard.tsx`](../tutorera-frontend/src/components/Dashboard/StudentDashboard.tsx)
- [`tutorera-frontend/src/components/marketplace/OfferComparisonModal.tsx`](../tutorera-frontend/src/components/marketplace/OfferComparisonModal.tsx)

Those changes were preserved and not treated as audit work.

## Capability matrix

| Requirement | Status | Verified evidence | Gap |
|---|---|---|---|
| Student-first homepage identity | Partial | Homepage hero uses "Your Learning. Your Budget. Your Choice." and the request CTA in [`page.tsx`](../tutorera-frontend/src/app/page.tsx#L74) | The same page retains "Find Tutors", browse-request links, tutor SEO sections, and tutor acquisition CTAs. The primary hierarchy is not exclusively student demand. |
| Request creation | Implemented | [`RequestWizard.tsx`](../tutorera-frontend/src/components/marketplace/RequestWizard.tsx#L37) supports subject, level, budget, currency, mode, schedule, learner, objectives, language, and preferences; it submits to `/requests` at line 278 | The wizard is large and high-friction. A concise "need first" path and clearer privacy/visibility explanations should be tested. |
| Draft and abandonment recovery | Implemented | The wizard autosaves `/requests/draft` at [`RequestWizard.tsx`](../tutorera-frontend/src/components/marketplace/RequestWizard.tsx#L177); the backend persists `AbandonedJourney` records in [`request.controller.ts`](../tutorera-backend/src/controllers/request.controller.ts#L149) | Recovery is infrastructure-led; the student-facing resume experience and conversion measurement need explicit acceptance criteria. |
| Tutor matching | Implemented | Matching routes expose request matches, ranked offers, tutor recommendations, feedback, and admin configuration in [`matching.routes.ts`](../tutorera-backend/src/routes/matching.routes.ts#L20) | Matching explanations, student controls, and visible confidence/coverage warnings are inconsistent. |
| Tutor offers / bidding | Implemented | Request routes provide tutor request discovery and bid submission at [`request.routes.ts`](../tutorera-backend/src/routes/request.routes.ts#L23) and [`request.routes.ts`](../tutorera-backend/src/routes/request.routes.ts#L37) | Offer quality standards, response SLAs, and student-facing offer freshness/availability indicators are not consistently surfaced. |
| Offer comparison | Partial | The homepage includes an offer demo; request detail and student dashboard provide comparison and shortlist actions in [`requests/[id]/page.tsx`](../tutorera-frontend/src/app/requests/[id]/page.tsx#L76) and [`StudentDashboard.tsx`](../tutorera-frontend/src/components/Dashboard/StudentDashboard.tsx#L550) | Multiple comparison surfaces can drift. The comparison contract should be unified and include availability, verification evidence, reviews, response time, cancellation terms, and match rationale in one stable layout. |
| Negotiation | Implemented | Counter-offer history and role/turn limits are implemented in [`offer.controller.ts`](../tutorera-backend/src/controllers/offer.controller.ts#L48); routes expose history and counter-offers in [`offer.routes.ts`](../tutorera-backend/src/routes/offer.routes.ts#L8) | Negotiation is not yet a clearly explained, student-safe decision flow with a visible final agreed-rate summary, expiry warnings, and policy context across all surfaces. |
| Managed booking and payment | Implemented | Booking status, payment status, refund, dispute, and progress routes exist in [`booking.routes.ts`](../tutorera-backend/src/routes/booking.routes.ts#L10); the offer acceptance path is wired from the student UI | Booking/payment behavior is market-gated and therefore needs stronger unavailable-state UX and a single booking timeline. |
| Trust and verification | Partial | Tutor profile stores identity, degree, police, video, subject eligibility, and active status in [`TutorProfile.model.ts`](../tutorera-backend/src/models/TutorProfile.model.ts#L51); offer cards display several badges | Trust evidence is fragmented across profile, offer, and policy pages. Badge definitions, evidence freshness, and what each verification means should be standardized for students. |
| Reviews and reputation | Implemented | Public tutor reviews and tutor responses are routed in [`review.routes.ts`](../tutorera-backend/src/routes/review.routes.ts#L10); student ratings and dashboard submission exist | Review provenance, completed-booking labeling, moderation outcomes, and review usefulness signals are not clearly part of the comparison decision model. |
| Booking protection / disputes | Partial | Students can submit first-session guarantee claims in [`guarantee.routes.ts`](../tutorera-backend/src/routes/guarantee.routes.ts#L8); booking routes expose disputes and refund requests | There is no single student protection center showing eligibility, deadlines, evidence requirements, status, and resolution outcome across guarantee, refund, and dispute cases. |
| Notifications | Implemented | Notification retrieval, preferences, read state, and read-all routes exist in [`notification.routes.ts`](../tutorera-backend/src/routes/notification.routes.ts#L13) | Notification coverage and delivery SLAs are not represented as a user-visible request/offer timeline. |
| Chat and negotiation communication | Implemented | Conversation and message routes exist in [`chat.routes.ts`](../tutorera-backend/src/routes/chat.routes.ts#L13) | Contact-information filtering and negotiation state need a single clear boundary so students know when discussion is safe and when payment must remain on-platform. |
| Student dashboard | Partial | Student dashboard loads requests, offers, bookings, favourites, negotiations, claims, ratings, chat, and progress components in [`StudentDashboard.tsx`](../tutorera-frontend/src/components/Dashboard/StudentDashboard.tsx#L948) | It is feature-rich but operationally dense. A prioritized "next action" model and one request-to-learning timeline are missing. |
| Parent and guardian control | Implemented | Parent booking approvals and settings are wired in [`ParentDashboard.tsx`](../tutorera-frontend/src/components/Dashboard/ParentDashboard.tsx#L117) | Parent/student visibility, consent, and decision ownership should be made explicit in the core marketplace journey, not only in parent-specific screens. |
| Learning progress | Partial | Progress report submission, retrieval, and student mood are routed in [`booking.routes.ts`](../tutorera-backend/src/routes/booking.routes.ts#L16); the model stores topics, homework, attendance, mood, and next goals in [`LearningProgress.model.ts`](../tutorera-backend/src/models/LearningProgress.model.ts#L3) | No complete outcome model was found for baseline goals, milestones, assessments, progress summaries, or student/tutor outcome agreement. |
| AI assistance | Partial | Request natural-language parsing is in [`RequestWizard.tsx`](../tutorera-frontend/src/components/marketplace/RequestWizard.tsx#L59); ranked matching and feedback are in [`matching.routes.ts`](../tutorera-backend/src/routes/matching.routes.ts#L22) | Parsing and ranking are not yet a student-facing matching agent that explains trade-offs, asks clarifying questions, and supports safe choice. |
| International marketplace | Partial | Requests, bids, bookings, currencies, exchange rates, country markets, timezones, and market feature flags are modeled in the backend | Homepage copy and defaults still contain Pakistan-specific assumptions (for example PKR referral copy and Pakistan-first examples). Market readiness is uneven by country and feature. |
| Referral and loyalty | Partial | Referral routes/pages and a homepage referral promotion exist | The requested loyalty system is not tied to completed learning outcomes, repeat bookings, quality, or student retention metrics. |
| Marketplace analytics | Partial | Matching analytics and admin marketplace/liquidity pages exist | The decisive north-star metrics are not defined as an end-to-end student funnel with cohort, market, subject, and request-level attribution. |

## What is already working well

### 1. The marketplace data model matches the intended direction

The backend has explicit entities for requests, bids, counter-offers, bookings, status history, match logs, reviews, progress, refunds, guarantees, safety cases, and notifications. Request and bid status fields include negotiation, payment, expiry, cancellation, and completion states rather than treating matching as a single contact event.

Relevant references:

- [`Request.model.ts`](../tutorera-backend/src/models/Request.model.ts#L36)
- [`Bid.model.ts`](../tutorera-backend/src/models/Bid.model.ts#L24)
- [`OfferNegotiation.model.ts`](../tutorera-backend/src/models/OfferNegotiation.model.ts#L3)
- [`Booking.model.ts`](../tutorera-backend/src/models/Booking.model.ts#L41)

### 2. Student choice is represented in the UI

The homepage request CTA, request detail offer cards, shortlisting, profile links, counter-offers, and accept-and-pay actions implement the central student choice loop. The UI also displays rating, experience, and several verification signals rather than only price.

### 3. Safety and operational controls are not purely marketing

The backend enforces tutor eligibility, market feature availability, content filtering, parent booking rules, payment confirmation before lesson start, refund/dispute routes, and audit logging. This is a strong foundation for a trust-based marketplace.

## Critical gaps and risks

### P0 - Make the student journey coherent

The current features are spread across homepage, request detail, dashboard, offers, chat, bookings, notifications, and policy pages. A student can complete the journey, but the product does not yet present one canonical state machine from:

`Need -> Request -> Offers -> Compare -> Negotiate -> Book -> Learn -> Review / Resolve`

**Required outcome:** one canonical request workspace with a timeline, current next action, offer state, payment state, booking state, and learning state. Every email, notification, dashboard card, and deep link should resolve back to that workspace.

**Acceptance measures:**

- A student can identify the next action without opening more than one primary workspace.
- Every terminal request state has a clear explanation and recovery action.
- Offer, negotiation, booking, refund, dispute, and progress statuses use one shared vocabulary.

### P0 - Unify trust evidence and protection

Verification badges exist, but students must infer what they mean from several surfaces. Guarantee, refund, and dispute workflows exist independently.

**Required outcome:** a trust panel for every offer and booking that shows:

- Verification type, meaning, reviewer/status, and last verified date where available.
- Review count and provenance.
- Availability and response-time evidence.
- Cancellation, refund, and first-session protection eligibility.
- A direct path to report a safety concern or open a case.

### P1 - Finish the learning-outcomes loop

Progress reports currently capture useful session facts, but the system does not yet establish what success means before booking or summarize progress after sessions.

**Required outcome:**

- Student learning objective and baseline at request time.
- Tutor-confirmed plan and milestones after selection.
- Session reports linked to milestones.
- Student-visible progress summary and retention prompts.
- Outcome signals in tutor quality and marketplace analytics.

### P1 - Make matching explainable and student-controlled

Ranking exists, but an opaque match score is not enough for a trust-based choice.

**Required outcome:** show match reasons, missing requirements, trade-offs, and alternatives. Let the student adjust priority weights such as budget, availability, curriculum, language, location, experience, and verification.

### P1 - Remove Pakistan-first leakage from international flows

The backend has strong market primitives, but global UX still contains country-specific defaults and promotional text. A market must not appear supported if requests, payments, home tuition, protection, or tutor supply are unavailable.

**Required outcome:** a market capability matrix drives homepage copy, request defaults, pricing examples, checkout, policy links, and support expectations.

### P2 - Measure marketplace liquidity and student success

Admin analytics and matching analytics exist, but the product principle calls for completed learning engagements, not listings.

**Required outcome:** instrument the full funnel:

- Request started, completed, published, and abandoned.
- Time to first qualified offer.
- Offer count and response rate.
- Compare, shortlist, counter, accept, payment, and booking conversion.
- First-session completion and guarantee/refund/dispute rate.
- Repeat booking, progress-report completion, review completion, and learning outcome signals.

All metrics should be segmentable by market, subject, level, teaching mode, budget band, and acquisition source.

## Prioritized implementation plan

### Wave 0: Journey contract and terminology

1. Define the canonical request/offer/booking/learning state machine.
2. Define shared status labels and error/recovery copy.
3. Add a request workspace route that owns the student timeline.
4. Add analytics events and IDs that persist from request through completed learning engagement.
5. Add contract tests for the critical transitions and market feature gates.

### Wave 1: Student choice and trust

1. Consolidate request detail and dashboard offer comparison around one component and API contract.
2. Add structured offer fields for availability, response time, cancellation terms, and match reasons.
3. Build the trust panel and verification glossary.
4. Build a protection center for guarantee, refund, dispute, and safety cases.
5. Add expiry, payment, and counter-offer deadlines to the canonical timeline.

### Wave 2: Learning outcomes

1. Extend request data with measurable learning objectives and baseline.
2. Add tutor plan acceptance after booking.
3. Link progress reports to goals/milestones.
4. Add student progress summary and session follow-up actions.
5. Feed completed learning and repeat-booking signals into tutor quality analytics.

### Wave 3: Matching, internationalization, and growth

1. Add explainable match recommendations and adjustable student priorities.
2. Replace hard-coded promotional examples with market configuration.
3. Gate country pages and claims by real market capabilities and supply.
4. Connect referrals/loyalty to completed engagements and safe repeat bookings.
5. Add market liquidity dashboards and operational alerts.

## Recommended north-star metrics

The primary metric should be:

> **Completed learning engagements per active student, with no unresolved safety, payment, or trust incident.**

Supporting metrics:

| Area | Metric |
|---|---|
| Demand | Request completion rate; request-to-first-qualified-offer time |
| Supply | Qualified tutor response rate; median time to first offer |
| Choice | Compare-to-shortlist rate; shortlist-to-accept rate; counter-offer completion |
| Transaction | Accept-to-paid rate; paid-to-first-session completion |
| Trust | Verified-evidence view rate; dispute/refund/guarantee rate; resolution time |
| Learning | Progress-report completion; goal/milestone progress; student satisfaction |
| Retention | Repeat booking rate; completed engagements per student |
| Growth | Referral conversion after completed engagement; acquisition cost by market |

## Final assessment

TUTORERA has the core of the proposed marketplace already implemented. The repository should not be treated as a missing bidding platform or a simple tutor-directory rewrite. The next investment should be product integration:

1. Make one student request workspace the source of truth for the journey.
2. Make trust evidence and protection visible at the decision point.
3. Turn progress reports into a measurable learning-outcomes loop.
4. Make matching explainable and market capability-aware.
5. Measure completed, safe learning engagements rather than profile or listing volume.

Those changes would move TUTORERA from "a platform that supports student-led requests" to a consistently student-first, trust-based learning marketplace.
