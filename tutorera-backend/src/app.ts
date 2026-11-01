// src/app.ts
import "express-async-errors";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";
import pinoHttp from "pino-http";
import logger from "./config/logger";
import requestId from "./middlewares/requestId";
import errorHandler from "./middlewares/errorHandler";
import { generalLimiter } from "./middlewares/rateLimiters";

import authRoutes from "./routes/auth.routes";
import tutorRoutes from "./routes/tutor.routes";
import studentRoutes from "./routes/student.routes";
import requestRoutes from "./routes/request.routes";
import offerRoutes from "./routes/offer.routes";
import bookingRoutes from "./routes/booking.routes";
import reviewRoutes from "./routes/review.routes";
import blogRoutes from "./routes/blog.routes";
import contactRoutes from "./routes/contact.routes";
import uploadRoutes from "./routes/upload.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes from "./routes/notification.routes";
import chatRoutes from "./routes/chat.routes";
import guaranteeRoutes from "./routes/guarantee.routes";
import referralRoutes from "./routes/referral.routes";
import aiRoutes from "./routes/ai.routes";
import earningsRoutes from "./routes/earnings.routes";
import parentRoutes from "./routes/parent.routes";
import paymentRoutes from "./routes/payment.routes";
import trackingRoutes from "./routes/tracking.routes";
import webhookRoutes from "./routes/webhook.routes";
import geoRoutes from "./routes/geo.routes";
import locationRoutes from "./routes/location.routes";
import matchingRoutes from "./routes/matching.routes";
import liquidityRoutes from "./routes/liquidity.routes";
import tutoringIndexRoutes from "./routes/tutoringIndex.routes";
import publicRoutes from "./routes/public.routes";
import pricingRoutes from "./routes/pricing.routes";
import meetingRoutes from "./routes/meeting.routes";
import legalAgreementRoutes from "./routes/legalAgreement.routes";
import featureFlagRoutes from "./routes/featureFlag.routes";

// This file builds the Express app only — no httpServer, no Socket.io, no
// .listen(). That's what lets tests import the app directly via supertest
// and exercise real routes/middleware without opening a real network port
// or a real Socket.io server. server.ts wraps this app with the pieces that
// genuinely need a running process (Socket.io, .listen(), graceful shutdown).
const app = express();

app.use(requestId);

app.use(
    pinoHttp({
        logger,
        genReqId: (req) => (req as any).id,
        customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
        },
    })
);

app.use(helmet());
app.set("trust proxy", 1);

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://tutorera-frontend.pakstudy.workers.dev",
    "https://tutorera.ac.pk",
    "http://localhost:3000",
].filter(Boolean) as string[];

app.use(
    cors({
        origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
        },
        credentials: true,
        exposedHeaders: ["Content-Disposition", "Content-Length", "X-Request-Id"],
    })
);

app.use(express.json({
    limit: "100kb",
    // Capture the exact raw bytes of the request body as they arrived, before
    // JSON parsing. The payment webhook signature is computed over these
    // raw bytes — re-serializing the parsed JSON object would very likely
    // produce different bytes (key order, whitespace) and make every
    // signature check fail. This is cheap enough to do for all requests.
    verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(hpp());

const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes);
apiRouter.use("/tutors", tutorRoutes);
apiRouter.use("/students", studentRoutes);
apiRouter.use("/requests", requestRoutes);
apiRouter.use("/offers", offerRoutes);
apiRouter.use("/bookings", bookingRoutes);
apiRouter.use("/bookings", meetingRoutes);
apiRouter.use("/reviews", reviewRoutes);
apiRouter.use("/blogs", blogRoutes);
apiRouter.use("/contact", contactRoutes);
apiRouter.use("/upload", uploadRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/chat", chatRoutes);
apiRouter.use("/guarantee", guaranteeRoutes);
apiRouter.use("/referral", referralRoutes);
apiRouter.use("/ai", aiRoutes);
apiRouter.use("/earnings", earningsRoutes);
apiRouter.use("/parent", parentRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/webhooks", webhookRoutes);
apiRouter.use("/tracking", trackingRoutes);
apiRouter.use("/geo", geoRoutes);
apiRouter.use("/locations", locationRoutes);
apiRouter.use("/liquidity", liquidityRoutes);
apiRouter.use("/tutoring-index", tutoringIndexRoutes);
apiRouter.use("/public", publicRoutes);
apiRouter.use("/matching", matchingRoutes);
apiRouter.use("/pricing", pricingRoutes);
apiRouter.use("/", legalAgreementRoutes);
apiRouter.use("/feature-flags", featureFlagRoutes);

app.use("/api/v1", generalLimiter);
app.use("/api/v1", apiRouter);

// Public liveness endpoint: does not disclose infrastructure details.
app.get("/health/live", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok" });
});

// Readiness endpoint for load balancers and deployment smoke checks.
app.get("/health/ready", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable" });
});

app.get("/", (req, res) => {
    res.json({ message: "Tutorera API is running 🚀" });
});

app.use(errorHandler);

export default app;
