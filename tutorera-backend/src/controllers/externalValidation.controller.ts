import { Request, Response } from "express";
import { detectIpCountry, validateContactDetails } from "../services/externalValidation.service";
import type { ContactValidationResult } from "../services/externalValidation.service";

export const getVisitorMarket = async (req: Request, res: Response): Promise<void> => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : undefined;
  let location: { countryCode?: string; countryName?: string; city?: string };
  try {
    location = await detectIpCountry(ip);
  } catch (error) {
    console.warn("External visitor geolocation unavailable; using browser fallback:", error);
    location = {};
  }
  res.json({ success: true, location });
};

export const validateContacts = async (req: Request, res: Response): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined;
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined;
  if (!email && !phone) {
    res.status(400).json({ success: false, message: "Email or phone is required." });
    return;
  }
  let validation: ContactValidationResult;
  try {
    validation = await validateContactDetails(email, phone);
  } catch (error) {
    console.warn("External contact validation unavailable; continuing without provider validation:", error);
    validation = { available: false };
  }
  res.json({ success: true, validation });
};
