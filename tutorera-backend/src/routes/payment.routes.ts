// src/routes/payment.routes.ts
import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware";
import { createBookingCheckout, handleRapidGatewayWebhook, getTransactionHistory } from "../controllers/payment.controller";

const router = express.Router();

router.post("/booking/:bookingId/checkout", protect, authorize("student", "parent"), createBookingCheckout);
router.get("/history", protect, authorize("student", "parent"), getTransactionHistory);

// No `protect` here — Rapid Gateway calls this endpoint directly. The
// controller verifies the provider's HMAC signature against the exact raw body
// before any payment state is changed.
router.post("/webhook", handleRapidGatewayWebhook);

export default router;
