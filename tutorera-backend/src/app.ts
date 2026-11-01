// src/app.ts
import "express-async-errors";
import express from "express";
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
import promoCodeRoutes from "./routes/promoCode.routes";
import { createHealthRouter } from "./routes/health.routes";
import { createInternalJobsRouter } from "./routes/internalJobs.routes";

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
apiRouter.use("/promo-codes", promoCodeRoutes);

app.use("/api/v1", generalLimiter);
app.use("/api/v1", apiRouter);

app.use("/health", createHealthRouter());
app.use("/internal/jobs", createInternalJobsRouter());

// One-shot super-admin bootstrap — disabled once BOOTSTRAP_SECRET env var is absent or used
app.post("/bootstrap-superadmin", async (req, res) => {
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  if (req.headers["x-bootstrap-secret"] !== secret) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const { default: User } = await import("./models/User.model");
  const email = req.body.email as string;
  if (!email) { res.status(400).json({ message: "email required" }); return; }
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    (existing as any).adminRole = "super_admin";
    (existing as any).adminPermissions = ["*"];
    existing.isActive = true;
    await existing.save({ validateBeforeSave: false });
    res.json({ success: true, action: "promoted", name: existing.name, email: existing.email });
  } else {
    const { generateToken } = await import("./utils/generateToken");
    const bcrypt = await import("bcryptjs");
    const password = req.body.password as string;
    if (!password) { res.status(400).json({ message: "password required for new account" }); return; }
    const hashed = await bcrypt.default.hash(password, 10);
    const user = await User.create({ name: req.body.name || "Super Admin", email, password: hashed, role: "admin", adminRole: "super_admin", adminPermissions: ["*"], isActive: true, isEmailVerified: true });
    const token = generateToken(user._id.toString(), "admin");
    res.json({ success: true, action: "created", name: user.name, email: user.email, token });
  }
});

app.get("/", (req, res) => {
    res.json({ message: "Tutorera API is running 🚀" });
});

app.use(errorHandler);

export default app;
