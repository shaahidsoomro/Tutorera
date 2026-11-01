import { Request, Response } from "express";
import { AuthRequest } from "../types";
import Contact from "../models/Contact.model";
import sendEmail from "../utils/sendEmail";
import { renderTransactionalEmail } from "../utils/emailBrand";
import { LEGAL_CONFIG } from "../config/legal";

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContact = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, userType, bookingReference, transactionReference, subject, message } = req.body;

  // Save to DB
  const contact = await Contact.create({ name, email, phone, userType, bookingReference, transactionReference, subject, message });

  // Send email notification to admin
  const adminRecipient = process.env.EMAIL_USER || LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL;
  const adminSubject = `[TUTORERA Contact] ${subject}`;
  const adminHtml = renderTransactionalEmail({
    subject: adminSubject,
    emailCategory: "Contact Inquiry",
    emailHeading: "New Contact Message",
    emailSubheading: `From ${name} (${userType || "Visitor"})`,
    firstName: "Support Team",
    openingMessage: "A new inquiry was submitted through the TUTORERA public contact form.",
    mainMessage: `Message Content:\n"${message}"`,
    detailsCard: {
      title: "Inquiry Details",
      rows: [
        { label: "Sender Name", value: name, highlight: true },
        { label: "Email Address", value: email },
        { label: "Phone", value: phone || "Not provided" },
        { label: "User Category", value: userType || "General Visitor", isStatus: true, statusVariant: "neutral" },
        ...(bookingReference ? [{ label: "Booking Reference", value: bookingReference }] : []),
        ...(transactionReference ? [{ label: "Transaction Reference", value: transactionReference }] : []),
      ],
    },
    cta: { label: "Open Admin Panel", url: "https://tutorera.ac.pk/admin" },
    includeSecurityNotice: false,
    deliverability: "This administrative notification was sent from the TUTORERA contact form.",
  });

  await sendEmail({
    to: adminRecipient,
    subject: adminSubject,
    html: adminHtml,
    eventType: "support.ticket_created",
  });

  // Send confirmation to user
  const userSubject = "We Received Your Message — TUTORERA";
  const userHtml = renderTransactionalEmail({
    subject: userSubject,
    emailCategory: "Support Update",
    emailHeading: `Thank You, ${name}!`,
    emailSubheading: "Our support team has received your message.",
    firstName: name,
    openingMessage: "Thank you for reaching out to TUTORERA. We have received your message and our team will review it promptly.",
    mainMessage: `Your Message:\n"${message}"`,
    detailsCard: {
      title: "Ticket Overview",
      rows: [
        { label: "Subject", value: subject, highlight: true },
        { label: "Status", value: "Received & Queued", isStatus: true, statusVariant: "info" },
        { label: "Estimated Response", value: "Within 24 Hours" },
      ],
    },
    cta: { label: "Visit Help Center", url: "https://tutorera.ac.pk/help" },
    includeSecurityNotice: false,
    deliverability: "This message was sent in confirmation of your inquiry to TUTORERA.",
  });

  await sendEmail({
    to: email,
    subject: userSubject,
    html: userHtml,
    eventType: "support.ticket_received",
  });

  res.status(201).json({
    success: true,
    message: "Message sent successfully. We'll get back to you soon!",
    contact,
  });
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private (admin)
export const getAllContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  const contacts = await Contact.find().sort("-createdAt");
  res.status(200).json({ success: true, total: contacts.length, contacts });
};

// @desc    Submit in-session support request (tied to a booking)
// @route   POST /api/contact/support
// @access  Private (student or tutor)
export const submitSupportRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { subject, message, bookingId, priority } = req.body;
  const user = req.user;

  if (!subject || !message) {
    res.status(400).json({ success: false, message: "Subject and message are required." });
    return;
  }

  const contact = await Contact.create({
    name: user?.name,
    email: user?.email,
    phone: user?.phone || "",
    subject,
    message,
    type: "support",
    bookingId: bookingId || "",
    userRole: user?.role === "tutor" ? "tutor" : "student",
    priority: priority || "normal",
    status: "open",
  });

  const isUrgent = priority === "urgent";
  const adminRecipient = process.env.EMAIL_USER || LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL;

  // Email to admin — includes booking context for quick lookup
  const adminSubject = `[TUTORERA Support${isUrgent ? " — URGENT" : ""}] ${subject}`;
  const adminHtml = renderTransactionalEmail({
    subject: adminSubject,
    emailCategory: "Support Alert",
    emailHeading: `In-Session Support${isUrgent ? " (URGENT)" : ""}`,
    emailSubheading: `From ${user?.name} (${user?.role})`,
    firstName: "Support Operations",
    openingMessage: isUrgent
      ? "An URGENT support request was filed during an active session requiring immediate attention."
      : "A new support request was submitted by a platform user.",
    mainMessage: `Issue Description:\n"${message}"`,
    detailsCard: {
      title: "Request Metadata",
      rows: [
        { label: "Submitted By", value: `${user?.name} (${user?.role})`, highlight: true },
        { label: "Email", value: user?.email || "N/A" },
        { label: "Phone", value: user?.phone || "Not provided" },
        { label: "Priority", value: isUrgent ? "URGENT" : "Normal", isStatus: true, statusVariant: isUrgent ? "danger" : "info" },
        ...(bookingId ? [{ label: "Booking ID", value: bookingId, highlight: true }] : []),
      ],
    },
    cta: { label: "Review Ticket in Admin", url: "https://tutorera.ac.pk/admin" },
    includeSecurityNotice: false,
    deliverability: "Internal platform support dispatch.",
  });

  await sendEmail({
    to: adminRecipient,
    subject: adminSubject,
    html: adminHtml,
    eventType: isUrgent ? "safety.case_created" : "support.ticket_created",
  });

  // Confirmation to user
  const userSubject = "Support Request Received — TUTORERA";
  const userHtml = renderTransactionalEmail({
    subject: userSubject,
    emailCategory: "Support Update",
    emailHeading: `We Received Your Request, ${user?.name}`,
    emailSubheading: isUrgent ? "Marked as high priority." : "Our support team is on it.",
    firstName: user?.name,
    openingMessage: "Your support request has been logged and assigned to our active response queue.",
    mainMessage: isUrgent
      ? "Because your request involves an active session issue and was marked urgent, a support advisor has been notified for immediate review."
      : "A support specialist will review your request and get in touch with you shortly. You can also view updates directly in your dashboard.",
    detailsCard: {
      title: "Ticket Details",
      rows: [
        { label: "Subject", value: subject, highlight: true },
        { label: "Priority", value: isUrgent ? "Urgent" : "Normal", isStatus: true, statusVariant: isUrgent ? "danger" : "info" },
        ...(bookingId ? [{ label: "Linked Booking", value: bookingId }] : []),
      ],
    },
    cta: { label: "Open Dashboard", url: "https://tutorera.ac.pk/dashboard" },
    includeSecurityNotice: false,
    deliverability: "This message confirms receipt of your TUTORERA support ticket.",
  });

  await sendEmail({
    to: user?.email as string,
    subject: userSubject,
    html: userHtml,
    eventType: "support.ticket_received",
  });

  res.status(201).json({
    success: true,
    message: "Support request submitted. Our team will contact you soon.",
    contact,
  });
};
