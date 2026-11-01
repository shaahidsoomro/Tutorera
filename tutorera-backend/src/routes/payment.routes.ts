// src/routes/payment.routes.ts
import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware";
import { createBookingCheckout, handleRapidGatewayWebhook, getTransactionHistory, getVerifiedPaymentStatus, confirmPaymentCheckout } from "../controllers/payment.controller";

const router = express.Router();

router.post("/booking/:bookingId/checkout", protect, authorize("student", "parent"), createBookingCheckout);
router.get("/history", protect, authorize("student", "parent"), getTransactionHistory);
router.get("/status/:kind/:id", protect, authorize("student", "parent"), getVerifiedPaymentStatus);
router.post("/confirm", protect, authorize("student", "parent"), confirmPaymentCheckout);

// No `protect` here — the payment gateway calls this directly, authenticated by
// HMAC signature (verified inside the controller), not a user session.
router.post("/webhook", handleRapidGatewayWebhook);

export default router;
