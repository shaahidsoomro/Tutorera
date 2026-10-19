import { Router } from "express";
import { requestAgeReview, getMyAgeReviewRequest } from "../controllers/ageReview.controller";
import { register, login, logout, getMe, updateProfile, changePassword, googleAuth, selectRole, forgotPassword, resetPassword, exportData, deleteAccount, updateConsent } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import { resendGuardianConsent, listGuardianConsentRequests, approveGuardianConsent } from "../controllers/guardianConsent.controller";
import { validate, registerSchema, loginSchema, googleAuthSchema, selectRoleSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validator";
import { loginLimiter, registerLimiter, otpRequestLimiter, otpVerifyLimiter, googleAuthLimiter } from "../middlewares/rateLimiters";

const router = Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/google", googleAuthLimiter, validate(googleAuthSchema), googleAuth);
router.patch("/select-role", protect, validate(selectRoleSchema), selectRole);
router.post("/logout", protect, logout);
router.post("/guardian-consent/resend", protect, otpRequestLimiter, resendGuardianConsent);
router.get("/guardian-consent/pending", protect, listGuardianConsentRequests);
router.post("/guardian-consent/verify", protect, otpVerifyLimiter, approveGuardianConsent);
router.get("/me", protect, getMe);
router.post("/me/age-review/request", protect, otpRequestLimiter, requestAgeReview);
router.get("/me/age-review/request", protect, getMyAgeReviewRequest);
router.get("/me/export", protect, exportData);
router.post("/me/delete-account", protect, deleteAccount);
router.patch("/me/consent", protect, updateConsent);
router.patch("/update-profile", protect, updateProfile);
router.patch("/change-password", protect, changePassword);
router.post("/forgot-password", otpRequestLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", otpVerifyLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
