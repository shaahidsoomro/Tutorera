# TUTORERA® Backend API

REST API for TUTORERA's student-led tutoring marketplace.

## Tech Stack
- Node.js + Express.js + TypeScript
- MongoDB Atlas + Mongoose
- JWT Authentication
- Cloudinary (file uploads)
- Nodemailer / Resend (emails)
- RapidPay (payments)
- Node.js-compatible hosted runtime

## Canonical API URL

The frontend is configured to use:

```text
https://api.tutorera.ac.pk/api/v1
```

This is the canonical API hostname target, not deployment proof. Verify the
current DNS/origin and health endpoints before treating it as the active
production deployment. Do not use the legacy Render URL as the source of truth.

Production releases are triggered by pushes to `main` through GitHub Actions.
The backend and frontend Cloudflare workflows require the repository or
environment secret `CLOUDFLARE_API_TOKEN`; without it, CI intentionally stops
before deployment.

## Local Setup

### 1. Clone the repo
```bash
git clone <repo-url>
cd tutorera-backend
```

### 2. Install dependencies
```bash
npm ci
```

### 3. Configure environment variables
Set the required application variables, including the RapidPay server-side credentials,
in the selected hosting provider's secret manager:

```bash
# Required by src/config/env.ts
MONGO_URI=<MongoDB connection string>
JWT_SECRET=<long random secret>
PORT=5000
JWT_EXPIRES_IN=<JWT duration>
CLIENT_URL=https://tutorera.ac.pk
RESEND_API_KEY=<Resend API key>
CLOUDINARY_CLOUD_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
GROQ_API_KEY=<Groq API key>
GOOGLE_CLIENT_ID=<Google client ID>
GOOGLE_CLIENT_SECRET=<Google client secret>

# RapidPay
RAPIDPAY_API_KEY=<RapidPay API key>
RAPIDPAY_MERCHANT_ID=<RapidPay merchant ID>
RAPIDPAY_BASE_URL=<RapidPay HTTPS API base URL>
RAPIDPAY_WEBHOOK_SECRET=<RapidPay webhook signing secret>
RAPIDPAY_SUPPORTED_MARKETS=PK
```

RapidPay credentials and webhook secrets must stay on the backend. They must
never be exposed through `NEXT_PUBLIC_*`, browser JavaScript, or the frontend
repository. Configure only markets and currencies that RapidPay has approved
for the merchant account.

Optional server-side enrichment and validation variables:

```bash
# BigDataCloud IP personalization and contact validation
BIGDATACLOUD_API_KEY=<server-side BigDataCloud API key>
# Optional override for the phone validation endpoint
BIGDATACLOUD_PHONE_VALIDATION_URL=https://api-bdc.net/data/phone-number-validate

# Zipcodebase postal-code and city lookup
ZIPCODEBASE_API_KEY=<server-side Zipcodebase API key>
```

The BigDataCloud key must also remain server-side. `GET /api/v1/geo/visitor-market`
uses the request IP for configured-market personalization, while
`POST /api/v1/auth/validate-contacts` checks email and optional phone details
before registration. If the provider is unavailable, the endpoint returns
`validation.available: false` and registration continues without treating the
external check as proof of identity.

When configured, `GET /api/v1/geo/postal-lookup?q=<postal-code-or-city>&country=<ISO2>`
uses Zipcodebase for postal and city lookups. GeoNames remains the fallback when
the key or country is unavailable.

The public postal lookup, visitor-market, and contact-validation endpoints share
a provider limiter of 60 requests per IP per 15 minutes. A `429` response means
the caller must wait before retrying; it does not indicate a provider outage.

### 4. Run development server
```bash
npm run dev
```

## Payment Architecture

TUTORERA has one payment authority: the backend service. Checkout creation is
sent from the backend to RapidPay. The browser receives only the gateway
checkout/session data and never receives merchant credentials. Payment status
is verified by the backend before the booking or offer is finalized, and
payment records are stored in the `PaymentLedger` model.

The active provider is `rapidpay` in
[`src/services/paymentProvider.service.ts`](src/services/paymentProvider.service.ts).
The repository still contains legacy Swich compatibility code and migration
tests, but Swich is not mounted as the active checkout provider.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user |
| POST | /api/v1/auth/validate-contacts | Validate email and optional phone details |
| POST | /api/v1/auth/login | Login user |
| GET | /api/v1/auth/me | Get current user |
| GET | /api/v1/tutors | Get all tutors |
| GET | /api/v1/tutors/:id | Get tutor by ID |
| POST | /api/v1/tutors/profile | Create/update profile |
| POST | /api/v1/tutors/onboarding/step | Save onboarding step |
| GET | /api/v1/admin/verifications | Get pending tutors |
| PATCH | /api/v1/admin/verify/:id | Approve/reject tutor |
| GET | /api/v1/admin/users | Get all users |
| POST | /api/v1/requests | Create tuition request |
| POST | /api/v1/requests/:id/bids | Place bid |
| GET | /api/v1/bookings | Get my bookings |
| POST | /api/v1/payments/booking/:bookingId/checkout | Create RapidPay checkout |
| GET | /api/v1/payments/status/:kind/:id | Get verified payment status |
| GET | /api/v1/payments/history | Get payment history |
| POST | /api/v1/payments/webhook | Receive verified RapidPay webhook |
| POST | /api/v1/reviews/:tutorId | Create review |
| GET | /api/v1/blogs | Get all blogs |
| POST | /api/v1/contact | Submit contact form |
| POST | /api/v1/upload/avatar | Upload avatar |
| GET | /api/v1/geo/visitor-market | Detect visitor market from request IP |
| GET | /api/v1/geo/postal-lookup | Search postal codes or cities |

### Administrative approval exemption

An administrator approval through `PATCH /api/admin/verify/:id` (or the bulk
equivalent) records an auditable `adminApprovalExempt` flag on the tutor
profile. While that flag is active, approval, document, subject-eligibility,
agreement, and profile-verification gates do not block marketplace activation.
Suspension, re-verification, termination, and other account safety blocks still
apply. Rejecting the profile clears the exemption.

Tutor onboarding resolves currency from the selected primary marketplace on the
backend. Online matching is likewise restricted to that marketplace by default;
changing a display currency or client-side country filter cannot grant access to
another marketplace.

## Project Structure
```
src/
├── config/          # DB, environment and platform config
├── controllers/     # Business logic
├── middlewares/     # Auth, error, upload
├── models/          # Mongoose schemas
├── routes/          # Express routes
├── services/        # Marketplace/payment services
├── types/           # TypeScript interfaces
├── utils/           # Helper functions
├── validators/      # Zod schemas
└── server.ts        # Entry point
```
