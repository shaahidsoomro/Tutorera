import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model";
import { AuthRequest, UserRole } from "../types";

interface JwtPayload {
  id: string;
  role: UserRole;
}

// Opt-in restriction for historical students whose age is unknown.
// Enable only after audit, staged notification, and support readiness.
const needsLegacyAgeReview = (user: { role: UserRole; dateOfBirth?: Date | null }) =>
  process.env.LEGACY_STUDENT_AGE_ENFORCEMENT === "true" &&
  user.role === "student" &&
  (!user.dateOfBirth || !Number.isFinite(new Date(user.dateOfBirth).getTime()));

const legacyAccountPaths = new Set([
  "/api/v1/auth/me", "/api/v1/auth/logout",
  "/api/v1/auth/me/export", "/api/v1/auth/me/delete-account",
  "/api/v1/auth/me/age-review",
  "/api/v1/auth/me/age-review/request",
]);

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ success: false, message: "Not authorized, please login" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { iat: number };
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: "User no longer exists" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: "Your account has been deactivated" });
      return;
    }

    if (user.sessionInvalidBefore && decoded.iat * 1000 < user.sessionInvalidBefore.getTime()) {
      res.status(401).json({ success: false, message: "Session expired. Please log in again." });
      return;
    }

    // Accounts created by a minor are kept in a restricted holding state
    // until an adult has authenticated and verified the guardian mailbox.
    // JWT possession is not an alternate consent mechanism.
    if (user.role === "pending") {
      const allowed = new Set(["/api/v1/auth/me", "/api/v1/auth/logout",
        "/api/v1/auth/select-role", "/api/v1/auth/me/delete-account",
        "/api/v1/auth/me/export"]);
      if (!allowed.has(req.originalUrl.split("?")[0])) {
        res.status(403).json({ success: false, code: "ROLE_SELECTION_REQUIRED",
          message: "Choose an account role before using the platform." });
        return;
      }
    }
    if (needsLegacyAgeReview(user) && !legacyAccountPaths.has(req.originalUrl.split("?")[0])) {
      res.status(403).json({ success: false, code: "STUDENT_AGE_REVIEW_REQUIRED",
        message: "Your account needs an age review before tutoring access. Please contact support." });
      return;
    }
    if (user.role === "student" && user.isMinor && !user.parentConsentVerified) {
      const allowed = new Set([
        "/api/v1/auth/me", "/api/v1/auth/logout",
        "/api/v1/auth/me/export", "/api/v1/auth/me/delete-account",
        "/api/v1/auth/me/consent", "/api/v1/auth/guardian-consent/resend",
        "/api/v1/auth/me/age-review", "/api/v1/auth/me/age-review/request",
      ]);
      if (!allowed.has(req.path.startsWith("/api/v1/") ? req.path : req.originalUrl.split("?")[0])) {
        res.status(403).json({ success: false, code: "GUARDIAN_CONSENT_REQUIRED",
          message: "An adult guardian must verify and approve this student account before tutoring features are available." });
        return;
      }
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { iat: number };
    const user = await User.findById(decoded.id);
    // Optional authentication is only advisory. A pending role or a minor
    // awaiting adult supervision must not become an authenticated actor
    // through a public endpoint that uses optionalAuth instead of protect.
    const sessionValid = !user?.sessionInvalidBefore || decoded.iat * 1000 >= user.sessionInvalidBefore.getTime();
    if (user?.isActive && sessionValid && user.role !== "pending" && !needsLegacyAgeReview(user) &&
        !(user.role === "student" && user.isMinor && !user.parentConsentVerified)) {
      req.user = user;
    }
    // If restricted/suspended, proceed as unauthenticated on public routes.
  } catch {
    // Invalid/expired token — proceed without a user
  }

  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Role '${req.user?.role}' is not allowed to access this route`,
      });
      return;
    }
    next();
  };
};