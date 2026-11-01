import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import jwt from "jsonwebtoken";

// General API-wide limiter — generous, just to stop obvious abuse/scraping
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
    skip: (req) => {
      const path = req.originalUrl || req.url || "";
      return path.includes("/auth/login") || path.includes("/auth/register") || path.includes("/auth/google");
    },
});

// Strict limiter for login — prevent brute-force password guessing
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failed attempts
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

// Registration — prevent mass fake account creation
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message: "Too many accounts created from this location. Please try again later." },
});

// Forgot-password / OTP — prevent email-bombing and brute-forcing the 6-digit code
export const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message: "Too many code requests. Please wait before requesting another." },
});

export const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message: "Too many attempts. Please request a new code." },
});

// Contact / support forms — prevent spam
export const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many messages sent. Please try again later." },
});

// External geo/contact providers incur per-request cost and should not be
// reachable as an unbounded public proxy.
export const providerLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many lookup requests. Please try again later." },
});

// AI chat — prevent runaway API costs
// Uses user ID from JWT as key so each authenticated user gets their own
// bucket (10 msg/min). Falls back to IP so unauthenticated burst attempts
// are also throttled before hitting the per-user limit.
export const aiChatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "You're sending messages too quickly. Please slow down." },
    keyGenerator: (req) => {
        try {
            const auth = req.headers.authorization;
            if (auth?.startsWith("Bearer ")) {
                const token = auth.slice(7);
                const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: string };
                if (payload.id) return `user:${payload.id}`;
            }
        } catch { /* fall through to IP */ }
        const address = req.ip || req.socket.remoteAddress;
        return address ? `ip:${ipKeyGenerator(address)}` : "ip:unknown";
    },
});

// File uploads — prevent storage/bandwidth abuse
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many uploads. Please try again later." },
});

// Google auth — same brute-force concern as regular login
export const googleAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again later." },
});

// Public token-based tracking lookup — cap to prevent enumeration/scraping.
// 256-bit base64url tokens are not brute-forceable, so the limit only
// needs to throttle a misbehaving scraper; legitimate tutors, parents,
// and references routinely share the link with several people.
export const trackingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many tracking lookups. Please try again later." },
});

// Tutor-initiated token rotation — strict, defend against stolen sessions
export const tutorRotateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "You can only rotate your tracking link a few times per hour." },
});

// Admin Supervisor Agent — authenticated admins, generous window but capped
// to prevent runaway orchestration loops or accidental fan-out storms.
export const adminAgentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many agent requests — please wait a moment." },
    keyGenerator: (req) => {
        try {
            const auth = req.headers.authorization;
            if (auth?.startsWith("Bearer ")) {
                const token = auth.slice(7);
                const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: string };
                if (payload.id) return `admin-agent:${payload.id}`;
            }
        } catch { /* fall through */ }
        const address = req.ip || req.socket.remoteAddress;
        return address ? `admin-agent-ip:${ipKeyGenerator(address)}` : "admin-agent-ip:unknown";
    },
});
