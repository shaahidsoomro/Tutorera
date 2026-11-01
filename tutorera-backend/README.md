# TUTORERA® Backend API

REST API for TUTORERA's student-led tutoring marketplace.

## Tech Stack
- Node.js + Express.js + TypeScript
- MongoDB Atlas + Mongoose
- JWT Authentication
- Cloudinary (file uploads)
- Nodemailer / Resend (emails)
- Switch (payments)
- Deployed on Render

## Live API
https://tutorera-backend.onrender.com

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
Set the required application variables, including the Switch server-side credentials:

```bash
SWICH_CLIENT_ID=<Switch merchant client id>
SWICH_CLIENT_SECRET=<Switch merchant client secret>
SWICH_MODE=live
SWICH_AUTH_BASE_URL=<merchant-provided live OAuth base URL>
SWICH_API_BASE_URL=<merchant-provided live PayIN API base URL>
SWICH_CALLBACK_URL=https://tutorera-backend.onrender.com/api/v1/payments/swich/callback
SWICH_CALLBACK_SECRET=<merchant-provided PayIN callback signing secret>
SWICH_PWA_BASE_URL=https://payin-pwa.swichnow.com
SWICH_SUPPORTED_MARKETS=PK,AE,GB,US,SA,IN
SWICH_SUPPORTED_CURRENCIES=USD
```

Switch credentials must stay on the backend. They must never be exposed through `NEXT_PUBLIC_*`, browser JavaScript, or the frontend repository. Do not add a market or currency to `SWICH_SUPPORTED_*` until Switch has confirmed merchant onboarding, settlement, payout and compliance support for that market.

Register `SWICH_CALLBACK_URL` in the Swich merchant portal. TUTORERA verifies
PayIN callbacks with `HMAC-SHA256("SWCallback:CustomerTransactionId:OrderId:Amount:Status", SWICH_CALLBACK_SECRET)` before a booking or offer is settled. The callback signing secret is separate from the OAuth client secret.

### 4. Run development server
```bash
npm run dev
```

## Payment Architecture

TUTORERA has one payment authority: the Render backend. Checkout creation is sent directly from the backend to Switch over its REST API. The browser receives only the hosted checkout URL. Payment completion is verified by the backend against the Switch payment-session endpoint and then checked against the booking/offer amount and currency before marketplace state is finalized.

There is no payment Cloudflare Worker and no direct database write path outside the backend payment services.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user |
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
| POST | /api/v1/payments/booking/:bookingId/checkout | Create Swich checkout |
| POST | /api/v1/payments/swich/confirm | Confirm a Switch payment session |
| GET | /api/v1/payments/history | Get payment history |
| POST | /api/v1/reviews/:tutorId | Create review |
| GET | /api/v1/blogs | Get all blogs |
| POST | /api/v1/contact | Submit contact form |
| POST | /api/v1/upload/avatar | Upload avatar |

### Administrative approval exemption

An administrator approval through `PATCH /api/admin/verify/:id` (or the bulk
equivalent) records an auditable `adminApprovalExempt` flag on the tutor
profile. While that flag is active, approval, document, subject-eligibility,
agreement, and profile-verification gates do not block marketplace activation.
Suspension, re-verification, termination, and other account safety blocks still
apply. Rejecting the profile clears the exemption.

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
