import { renderTransactionalEmail } from "./emailBrand";
import { LEGAL_CONFIG } from "../config/legal";

export function today() {
  return new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export const bookingConfirmedEmail = (studentName: string, tutorName: string, amount: number) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Booking Confirmed",
    emailCategory: "Booking Confirmation",
    emailHeading: "Booking Confirmed",
    emailSubheading: "Your tutor session is confirmed and on the calendar.",
    firstName: studentName,
    openingMessage: `Your booking with ${tutorName} has been confirmed.`,
    mainMessage: "Please review the final payable PKR amount and complete payment through the available authorized payment method. TUTORERA verifies payment server-side before treating a booking as paid.",
    transaction: {
      referenceId: `BOOK-${Date.now()}`,
      date: today(),
      status: "Confirmed",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "View Booking", url: "https://tutorera.ac.pk/dashboard" },
    additionalInformation: "Support: hello@mentisera.pk",
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because of activity associated with your TUTORERA booking.",
  });
  return { subject: "TUTORERA® — Booking Confirmed", html };
};

export const bidAcceptedEmail = (tutorName: string, studentName: string, amount: number) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Your Offer Was Accepted!",
    emailCategory: "Offer Update",
    emailHeading: "Your Offer Was Accepted",
    emailSubheading: "Great work — the student has confirmed your rate.",
    firstName: tutorName,
    openingMessage: `${studentName} has accepted your tutor offer. A booking has been created.`,
    mainMessage: "The student will now complete payment through the authorized payment method. You'll receive another notification once payment is confirmed and the session is fully booked.",
    transaction: {
      referenceId: `OFFER-${Date.now()}`,
      date: today(),
      status: "Accepted",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "View My Offers", url: "https://tutorera.ac.pk/offers" },
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because a student accepted a tutor offer on TUTORERA.",
  });
  return { subject: "TUTORERA® — Your Offer Was Accepted!", html };
};

export const welcomeEmail = (name: string) => {
  const html = renderTransactionalEmail({
    subject: "Welcome to TUTORERA®!",
    emailCategory: "Welcome",
    emailHeading: "Welcome to TUTORERA®",
    emailSubheading: "The global student-led tutoring marketplace.",
    firstName: name,
    openingMessage: "Thanks for joining TUTORERA®.",
    mainMessage: "You can now browse tutors, book sessions, and start learning. If you have any questions, our support team is here to help.",
    cta: { label: "Browse Tutors", url: "https://tutorera.ac.pk/tutors" },
    includeSecurityNotice: true,
  });
  return { subject: "Welcome to TUTORERA®!", html };
};

export const studentWelcomeEmail = (name: string) => welcomeEmail(name);

export const parentWelcomeEmail = (name: string) => {
  const subject = "Welcome to TUTORERA®";
  const html = renderTransactionalEmail({
    subject,
    emailCategory: "Welcome",
    emailHeading: "Welcome to TUTORERA®",
    emailSubheading: "Safe, structured tutoring for your family.",
    firstName: name,
    openingMessage: "Thanks for creating a parent account on TUTORERA®.",
    mainMessage: "You can now manage learner details, review tutor options, and approve bookings from your dashboard.",
    cta: { label: "Open Dashboard", url: "https://tutorera.ac.pk/dashboard" },
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent after your TUTORERA account was created.",
  });
  return { subject, html };
};

export const tutorWelcomeApplicationEmail = (name: string, applicationId: string, trackingUrl?: string) => {
  const subject = "TUTORERA® — Your Tutor Application Was Received";
  const html = renderTransactionalEmail({
    subject,
    emailCategory: "Tutor Application",
    emailHeading: "Application Received",
    emailSubheading: "Our team will review your profile and documents.",
    firstName: name,
    openingMessage: "Thanks for applying to become a TUTORERA tutor.",
    mainMessage: "Your application is now under review. We will notify you when there is an update.",
    detailsCard: {
      title: "Application Details",
      rows: [{ label: "Application ID", value: applicationId, highlight: true }],
    },
    cta: { label: "Track Application", url: trackingUrl || "https://tutorera.ac.pk/tutor/application-status" },
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent after your TUTORERA tutor application was submitted.",
  });
  return { subject, html };
};

export const passwordResetOtpEmail = (name: string, otp: string) => {
  const subject = "TUTORERA® — Password Reset Code";
  const html = renderTransactionalEmail({
    subject,
    emailCategory: "Account Security",
    emailHeading: "Reset Your Password",
    emailSubheading: "Use the verification code below to continue.",
    firstName: name,
    openingMessage: "We received a request to reset your TUTORERA password.",
    mainMessage: "Enter this one-time code in the password reset form. It expires in 10 minutes.",
    highlightCode: { code: otp, label: "Password reset code", expiresIn: "10 minutes" },
    includeSecurityNotice: true,
    deliverability: "This transactional security email was sent because a password reset was requested for your account.",
  });
  return { subject, html };
};

export const tutorPendingEmail = (name: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Your Application is Under Review",
    emailCategory: "Tutor Application",
    emailHeading: "Thanks for applying, " + name + "!",
    emailSubheading: "Your tutor profile is currently pending verification.",
    firstName: name,
    openingMessage: "Our team is reviewing your application and will notify you once approved — usually within 24–48 hours.",
    mainMessage: "You'll be able to receive bookings once approved. In the meantime, you can log in to your dashboard to track your application status.",
    cta: { label: "Track Application", url: "https://tutorera.ac.pk/tutor/application-status" },
    includeSecurityNotice: true,
  });
  return { subject: "TUTORERA® — Your Application is Under Review", html };
};

export const tutorApprovedEmail = (name: string) => {
  const html = renderTransactionalEmail({
    subject: "🎉 Your TUTORERA® Profile is Approved!",
    emailCategory: "Tutor Application",
    emailHeading: "Your TUTORERA® Profile is Approved!",
    emailSubheading: "You are now visible to students on the marketplace.",
    firstName: name,
    openingMessage: "Congratulations! Your tutor profile has been approved.",
    mainMessage: "Log in to your dashboard to complete your profile and start receiving requests. To unlock Home and In-Person Tuition, submit your police verification certificate.",
    cta: { label: "Open Dashboard", url: "https://tutorera.ac.pk/dashboard" },
    includeSecurityNotice: true,
  });
  return { subject: "🎉 Your TUTORERA® Profile is Approved!", html };
};

export const tutorRejectedEmail = (name: string, reason?: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Update on Your Application",
    emailCategory: "Tutor Application",
    emailHeading: "Update on Your Application",
    emailSubheading: "We were unable to approve your tutor profile at this time.",
    firstName: name,
    openingMessage: "After review, we were unable to approve your tutor profile at this time.",
    mainMessage: reason
      ? `Reason: ${reason}.`
      : "Please contact support if you'd like more information or wish to reapply.",
    additionalInformation: "Contact support if you'd like more information or wish to reapply.",
    cta: { label: "Contact Support", url: "mailto:hello@mentisera.pk" },
    includeSecurityNotice: true,
  });
  return { subject: "TUTORERA® — Update on Your Application", html };
};

interface BookingDetails {
  bookingId: string;
  subject?: string;
  schedule?: string;
  teachingMode?: string;
  sessionCount?: number;
}

export const paymentConfirmedEmail = (
  studentName: string,
  tutorName: string,
  amount: number,
  details?: BookingDetails
) => {
  const bookingId = details?.bookingId || `PAY-${Date.now()}`;
  const subject = details?.subject ? ` — ${details.subject}` : "";
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Payment Confirmed",
    emailCategory: "Payment Confirmation",
    emailHeading: "Payment Confirmed",
    emailSubheading: `Your session with ${tutorName} is now fully booked.`,
    firstName: studentName,
    openingMessage: `We've confirmed your payment of PKR ${amount.toLocaleString()} for your${subject} session with ${tutorName}.${details?.schedule ? ` ${details.schedule}.` : ""}`,
    mainMessage: "Your session is now fully booked. Please join the lesson a few minutes before the scheduled start time. Enjoy learning!",
    transaction: {
      referenceId: bookingId,
      date: today(),
      status: "Confirmed",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "View Booking", url: "https://tutorera.ac.pk/dashboard" },
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because of payment activity on your TUTORERA account.",
  });
  return { subject: "TUTORERA® — Payment Confirmed", html };
};

interface BookingDetails {
  bookingId: string;
  subject?: string;
  schedule?: string;
  teachingMode?: string;
  sessionCount?: number;
}

export const paymentFailedEmail = (
  studentName: string,
  tutorName: string,
  amount: number,
  details?: BookingDetails
) => {
  const bookingId = details?.bookingId || `PAY-${Date.now()}`;
  const subject = details?.subject ? ` — ${details.subject}` : "";
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Payment Could Not Be Processed",
    emailCategory: "Payment Update",
    emailHeading: "Payment Not Completed",
    emailSubheading: "We couldn't process your payment for this session.",
    firstName: studentName,
    openingMessage: `We were unable to complete the payment of PKR ${amount.toLocaleString()} for your${subject} session with ${tutorName}.`,
    mainMessage: "This could be due to insufficient funds, an expired card, or a network issue. Please try again using the same or a different payment method. If the problem persists, contact your bank or our support team.",
    transaction: {
      referenceId: bookingId,
      date: today(),
      status: "Failed",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "Retry Payment", url: "https://tutorera.ac.pk/dashboard" },
    additionalInformation: "If you believe this was an error or need assistance, please reply to this email or contact hello@mentisera.pk.",
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because a payment attempt on your TUTORERA booking was not successful.",
  });
  return { subject: "TUTORERA® — Payment Could Not Be Processed", html };
};

export const paymentFailedNotifyTutorEmail = (
  tutorName: string,
  studentName: string,
  amount: number,
  details?: BookingDetails
) => {
  const bookingId = details?.bookingId || `PAY-${Date.now()}`;
  const subject = details?.subject ? ` — ${details.subject}` : "";
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Student Payment Delayed",
    emailCategory: "Booking Update",
    emailHeading: "Student Payment Delayed",
    emailSubheading: `A booking with ${studentName} could not be confirmed.`,
    firstName: tutorName,
    openingMessage: `The student's payment of PKR ${amount.toLocaleString()} for your${subject} session with ${studentName} could not be processed.`,
    mainMessage: "The student has been notified to retry payment. The booking will be confirmed automatically once payment is successful. No action is needed from your side at this time.",
    transaction: {
      referenceId: bookingId,
      date: today(),
      status: "Pending",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "View Booking", url: "https://tutorera.ac.pk/dashboard" },
    additionalInformation: "If the student does not complete payment before the applicable reservation expires, the unconfirmed booking will be released. Contact hello@mentisera.pk for assistance.",
    includeSecurityNotice: false,
    deliverability: "This transactional notification was sent because a student payment on your TUTORERA booking was not successful.",
  });
  return { subject: "TUTORERA® — Student Payment Delayed", html };
};

export const bookingCancelledEmail = (name: string, otherPartyName: string, subject?: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Booking Cancelled",
    emailCategory: "Booking Update",
    emailHeading: "Booking Cancelled",
    emailSubheading: subject ? `Session: ${subject}` : undefined,
    firstName: name,
    openingMessage: `Your booking with ${otherPartyName}${subject ? ` for ${subject}` : ""} has been cancelled.`,
    mainMessage: "If you have questions, please contact our support team. If a refund is applicable, it must be reviewed and separately verified as settled by the payment provider. Cancellation does not itself initiate or confirm a refund.",
    cta: { label: "Contact Support", url: "mailto:hello@mentisera.pk" },
    includeSecurityNotice: true,
  });
  return { subject: "TUTORERA® — Booking Cancelled", html };
};

export const newBidEmail = (studentName: string, amount: number) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — New Offer Received",
    emailCategory: "Offer Update",
    emailHeading: "New Offer Received",
    emailSubheading: "A verified tutor sent an offer on your tuition request.",
    firstName: studentName,
    openingMessage: `A verified tutor sent an offer of PKR ${amount.toLocaleString()} on your tuition request.`,
    mainMessage: "Log in to your dashboard to review the tutor's profile, message, and proposed rate. You can accept, counter, or decline the offer directly from your Offers page.",
    transaction: {
      referenceId: `BID-${Date.now()}`,
      date: today(),
      status: "Submitted",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "Review Offer", url: "https://tutorera.ac.pk/offers" },
    includeSecurityNotice: true,
  });
  return { subject: "TUTORERA® — New Offer Received", html };
};

export const directBookingRequestEmail = (tutorName: string, studentName: string, subject: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — New Direct Booking Request",
    emailCategory: "Booking Request",
    emailHeading: "New Booking Request",
    emailSubheading: `${studentName} wants to book a session for ${subject}.`,
    firstName: tutorName,
    openingMessage: `${studentName} wants to book a session with you for ${subject}.`,
    mainMessage: "Log in to your dashboard to review the request and accept or decline. The student has already pre-confirmed the proposed schedule.",
    cta: { label: "Review Request", url: "https://tutorera.ac.pk/dashboard" },
    includeSecurityNotice: true,
  });
  return { subject: "TUTORERA® — New Direct Booking Request", html };
};

export const directBookingAcceptedEmail = (
  name: string,
  otherPartyName: string,
  subject: string,
  date?: string,
  startTime?: string,
  endTime?: string,
  paymentInfo?: { amount: number }
) => {
  const schedule = date && startTime ? `📅 ${date}\n🕐 ${startTime} – ${endTime}` : "";
  const awaitingPayment = !!paymentInfo;
  const subjectLine = awaitingPayment ? "TUTORERA® — Tutor Approved, Payment Required" : "TUTORERA® — Booking Confirmed with Session Details";
  const html = renderTransactionalEmail({
    subject: subjectLine,
    emailCategory: "Booking Confirmation",
    emailHeading: awaitingPayment ? "Complete Payment to Confirm" : "Booking Confirmed",
    emailSubheading: awaitingPayment ? `Your tutor approved ${subject}; the lesson is not confirmed until payment is verified.` : `Your session with ${otherPartyName} for ${subject} is confirmed.`,
    firstName: name,
    openingMessage: awaitingPayment ? `${otherPartyName} approved your tutoring request for ${subject}. Complete payment from your dashboard while the reservation is active.` : `Your session with ${otherPartyName} for ${subject} is confirmed.`,
    mainMessage: awaitingPayment
      ? `Requested schedule: ${schedule || "see dashboard"}. No tutor calendar slot is reserved until your payment has been verified by our payment provider. The direct-booking reservation expires after 24 hours.`
      : (schedule ? `Scheduled:\n${schedule}\n\nPlease join the lesson a few minutes before the start time.` : "Please join the lesson a few minutes before the scheduled start time."),
    ...(paymentInfo
      ? {
          transaction: {
            referenceId: `BOOK-${Date.now()}`,
            date: today(),
            status: "Awaiting payment",
            amount: `PKR ${paymentInfo.amount.toLocaleString()}`,
          },
        }
      : {}),
    cta: { label: "View Booking", url: "https://tutorera.ac.pk/dashboard" },
    additionalInformation: paymentInfo
      ? `Please review the final payable amount of PKR ${paymentInfo.amount.toLocaleString()} and complete payment through the available authorized payment method. TUTORERA verifies payment server-side before treating the booking as paid.`
      : "Log in to your dashboard for full session details.",
    includeSecurityNotice: true,
  });
  return { subject: subjectLine, html };
};

export const directBookingDeclinedEmail = (studentName: string, subject: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Booking Request Declined",
    emailCategory: "Booking Update",
    emailHeading: "Booking Request Declined",
    emailSubheading: `Session: ${subject}`,
    firstName: studentName,
    openingMessage: `The tutor was unable to accept your booking request for ${subject}.`,
    mainMessage: "Don't worry — you can browse other tutors or send a new request anytime. TUTORERA has many qualified tutors available across every subject and level.",
    cta: { label: "Browse Tutors", url: "https://tutorera.ac.pk/tutors" },
    includeSecurityNotice: true,
  });
  return { subject: "TUTORERA® — Booking Request Declined", html };
};

export const reviewRequestEmail = (studentName: string, tutorName: string, subject: string, bookingId: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — How Was Your Session?",
    emailCategory: "Review Request",
    emailHeading: "How Was Your Session?",
    emailSubheading: `Your session with ${tutorName} has been completed.`,
    firstName: studentName,
    openingMessage: `Your ${subject} session with ${tutorName} has been marked as completed. We hope you had a great learning experience!`,
    mainMessage: "Your feedback helps other students make informed decisions and helps tutors improve their teaching. It only takes 2 minutes to share your experience.",
    cta: { label: "Leave a Review", url: `https://tutorera.ac.pk/reviews/${bookingId}` },
    additionalInformation: "Reviews are public and must follow our community guidelines. Thank you for being part of the TUTORERA community.",
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because you completed a tutoring session on TUTORERA.",
  });
  return { subject: "TUTORERA® — How Was Your Session?", html };
};

export const adminNewUserSignupEmail = (data: {
  name: string;
  email: string;
  role: string;
  phone?: string;
  city?: string;
  country?: string;
  authProvider?: string;
  applicationId?: string;
}) => {
  const roleLabel = (data.role || "user").toUpperCase();
  const html = renderTransactionalEmail({
    subject: `[TUTORERA Admin] New ${roleLabel} Sign Up: ${data.name}`,
    emailCategory: "Platform Alert",
    emailHeading: `New ${roleLabel} Registered`,
    emailSubheading: `A new ${data.role} has joined TUTORERA.`,
    firstName: "Admin Team",
    openingMessage: `A new user registration event occurred on the TUTORERA platform.`,
    mainMessage: `User Details:
• Name: ${data.name}
• Email: ${data.email}
• Role: ${roleLabel}
• Phone: ${data.phone || "Not provided"}
• Location: ${data.city || "Not specified"}${data.country ? `, ${data.country}` : ""}
• Signup Method: ${data.authProvider === "google" ? "Google OAuth" : "Email & Password"}
${data.applicationId ? `• Tutor Application ID: ${data.applicationId}` : ""}`,
    transaction: {
      referenceId: data.applicationId || `USR-${Date.now()}`,
      date: today(),
      status: "Registered",
      amount: roleLabel,
    },
    cta: { label: "Open Admin Panel", url: "https://tutorera.ac.pk/admin" },
    additionalInformation: `Notification dispatched automatically to ${LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL}.`,
    includeSecurityNotice: true,
  });
  return { subject: `[TUTORERA Admin] New ${roleLabel} Sign Up: ${data.name}`, html };
};

export const adminTutorApplicationSubmittedEmail = (data: {
  tutorName: string;
  tutorEmail: string;
  applicationId?: string;
  teachingMode?: string;
}) => {
  const subject = `[TUTORERA Admin] New tutor application: ${data.tutorName}`;
  const html = renderTransactionalEmail({
    subject,
    emailCategory: "Platform Alert",
    emailHeading: "New Tutor Application",
    emailSubheading: "A tutor application is ready for review.",
    firstName: "Admin Team",
    openingMessage: `${data.tutorName} has completed tutor onboarding and submitted an application.`,
    mainMessage: `Tutor email: ${data.tutorEmail}\nApplication ID: ${data.applicationId || "Not assigned"}\nTeaching mode: ${data.teachingMode || "Not specified"}`,
    cta: { label: "Review Applications", url: "https://tutorera.ac.pk/admin/applications" },
    includeSecurityNotice: true,
    deliverability: "This transactional alert was sent because a tutor application was submitted.",
  });
  return { subject, html };
};

export const adminTutorDocumentResubmittedEmail = (data: {
  tutorName: string;
  tutorEmail: string;
  applicationId?: string;
  documentLabel?: string;
}) => {
  const subject = `[TUTORERA Admin] Tutor document resubmitted: ${data.tutorName}`;
  const html = renderTransactionalEmail({
    subject,
    emailCategory: "Platform Alert",
    emailHeading: "Tutor Document Resubmitted",
    emailSubheading: "A tutor verification item needs re-review.",
    firstName: "Admin Team",
    openingMessage: `${data.tutorName} resubmitted ${data.documentLabel || "a document"} for review.`,
    mainMessage: `Tutor email: ${data.tutorEmail}\nApplication ID: ${data.applicationId || "Not assigned"}\nDocument: ${data.documentLabel || "Not specified"}`,
    cta: { label: "Review Applications", url: "https://tutorera.ac.pk/admin/applications" },
    includeSecurityNotice: true,
    deliverability: "This transactional alert was sent because a tutor verification document was resubmitted.",
  });
  return { subject, html };
};

export const adminNewTuitionRequestEmail = (data: {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  subject: string;
  level: string;
  teachingMode: string;
  countryName?: string;
  countryCode?: string;
  city?: string;
  area?: string;
  budget: number;
  currency: string;
  budgetPKR: number;
  pricingUnit: string;
  schedule?: string;
  description?: string;
  curriculum?: string;
}) => {
  const isHome = data.teachingMode === "in-person";
  const modeLabel = isHome ? "Home / In-Person Tuition" : data.teachingMode === "online" ? "Online Tuition" : "Hybrid (Online & Home)";
  const locationLabel = isHome
    ? `${data.city || "City N/A"}, ${data.area ? data.area + ", " : ""}${data.countryName || "Pakistan"}`
    : `${data.countryName || "Global"} (${data.city || "Online"})`;

  const budgetDisplay = data.currency !== "PKR"
    ? `${data.currency} ${data.budget.toLocaleString()} / ${data.pricingUnit} (~PKR ${data.budgetPKR.toLocaleString()} / ${data.pricingUnit})`
    : `PKR ${data.budget.toLocaleString()} / ${data.pricingUnit}`;

  const html = renderTransactionalEmail({
    subject: `[TUTORERA Alert] New ${isHome ? "🏠 Home Tuition" : "🌐 Tuition"} Request: ${data.subject} (${data.city || data.countryName || "Global"})`,
    emailCategory: "Tuition Request Alert",
    emailHeading: `New ${isHome ? "Home Tuition" : "Tuition"} Request Posted`,
    emailSubheading: `${data.subject} · ${data.level} · ${modeLabel}`,
    firstName: "Admin Team",
    openingMessage: `A student has just posted a new tuition requirement on TUTORERA.`,
    mainMessage: `Tuition Requirement Summary:
• Subject: ${data.subject}
• Academic Level: ${data.level}
• Curriculum: ${data.curriculum || "Standard"}
• Learning Mode: ${modeLabel}
• Target Location: ${locationLabel}
• Proposed Budget: ${budgetDisplay} (Charged in PKR)
• Preferred Schedule: ${data.schedule || "Flexible"}
• Student: ${data.studentName} (${data.studentEmail} · ${data.studentPhone || "No phone"})
${data.description ? `• Details: "${data.description}"` : ""}`,
    transaction: {
      referenceId: `REQ-${Date.now()}`,
      date: today(),
      status: "Published",
      amount: `PKR ${data.budgetPKR.toLocaleString()}`,
    },
    cta: { label: "Review in Marketplace", url: "https://tutorera.ac.pk/browse-requests" },
  additionalInformation: `Notification dispatched automatically to ${LEGAL_CONFIG.PLATFORM_SUPER_ADMIN_EMAIL}.`,
  includeSecurityNotice: true,
});
return { subject: `[TUTORERA Alert] New ${isHome ? "🏠 Home Tuition" : "🌐 Tuition"} Request: ${data.subject} (${data.city || data.countryName || "Global"})`, html };
};

export const payoutProcessedEmail = (tutorName: string, amount: number, bookingId: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Payout Processed",
    emailCategory: "Payout",
    emailHeading: "Payout Processed",
    emailSubheading: "Your earnings have been released.",
    firstName: tutorName,
    openingMessage: `We've processed a payout of PKR ${amount.toLocaleString()} for a completed session.`,
    mainMessage: "The funds have been released and will be transferred to your registered payment method according to your payout schedule. You can track your earnings and payout history from your dashboard.",
    transaction: {
      referenceId: bookingId,
      date: today(),
      status: "Paid",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "View Earnings", url: "https://tutorera.ac.pk/earnings" },
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because a payout was processed for your TUTORERA tutoring session.",
  });
  return { subject: "TUTORERA® — Payout Processed", html };
};

export const payoutFailedEmail = (tutorName: string, amount: number, bookingId: string, reason: string) => {
  const html = renderTransactionalEmail({
    subject: "TUTORERA® — Payout Update Required",
    emailCategory: "Payout",
    emailHeading: "Payout Update Required",
    emailSubheading: "We need your attention regarding a payout.",
    firstName: tutorName,
    openingMessage: `We attempted to process a payout of PKR ${amount.toLocaleString()} but encountered an issue.`,
    mainMessage: `Reason: ${reason}. Please update your payout details in your dashboard or contact support to resolve this.`,
    transaction: {
      referenceId: bookingId,
      date: today(),
      status: "Action Required",
      amount: `PKR ${amount.toLocaleString()}`,
    },
    cta: { label: "Update Payout Details", url: "https://tutorera.ac.pk/earnings" },
    additionalInformation: "If you believe this was an error, please reply to this email or contact hello@mentisera.pk.",
    includeSecurityNotice: true,
    deliverability: "This transactional notification was sent because a payout for your TUTORERA tutoring session requires attention.",
  });
  return { subject: "TUTORERA® — Payout Update Required", html };
};

export function formatMoney(amount: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export const offerExpiringEmail = (recipientName: string, subject: string, isTutor: boolean) => {
  const role = isTutor ? "your offer" : "an offer you received";
  const emailSubject = "TUTORERA® — Offer Expiring Soon";
  const html = renderTransactionalEmail({
    subject: emailSubject,
    emailCategory: "Offer Update",
    emailHeading: "Offer Expiring Soon",
    emailSubheading: `Don't miss out — ${role} for ${subject} is about to expire.`,
    firstName: recipientName,
    openingMessage: `This is a reminder that ${role} for ${subject} is expiring soon.`,
    mainMessage: "Log in to review the offer before it expires. Once expired, it cannot be reactivated.",
    cta: { label: "View Offers", url: "https://tutorera.ac.pk/offers" },
    includeSecurityNotice: false,
    deliverability: "This transactional notification was sent because of an active offer on your TUTORERA account.",
  });
  return { subject: emailSubject, html };
};

export const newMatchedRequestEmail = (data: {
  tutorName: string;
  matchScore: number;
  subject: string;
  level: string;
  teachingMode: string;
  city?: string;
  budget: number;
  currency: string;
  pricingUnit: string;
  reasons: string[];
  dashboardUrl: string;
}) => {
  const emailSubject = `TUTORERA® — New ${data.matchScore}% Match: ${data.subject} Tuition Request`;
  const locationText = data.teachingMode === "online" ? "Online" : data.city || "In-person";
  const html = renderTransactionalEmail({
    subject: emailSubject,
    emailCategory: "New Opportunity",
    emailHeading: `New ${data.matchScore}% Match`,
    emailSubheading: `A student needs a ${data.subject} tutor — you're a strong match.`,
    firstName: data.tutorName,
    openingMessage: `A student just posted a ${data.subject} (${data.level}) tuition request that matches your profile at ${data.matchScore}%.`,
    mainMessage: `<strong>Subject:</strong> ${data.subject} · ${data.level}<br/><strong>Mode:</strong> ${locationText}<br/><strong>Budget:</strong> ${data.currency} ${data.budget.toLocaleString()}/${data.pricingUnit}<br/><br/>Why you match:<br/>${data.reasons.slice(0, 3).map(r => `• ${r}`).join("<br/>")}`,
    cta: { label: "View & Send Offer →", url: data.dashboardUrl },
    includeSecurityNotice: false,
    deliverability: "You received this because a new student request matches your TUTORERA tutor profile. You can manage notification preferences in your account settings.",
  });
  return { subject: emailSubject, html };
};

export const offerExpiredEmail = (recipientName: string, subject: string, isTutor: boolean) => {
  const role = isTutor ? "your offer" : "an offer you received";
  const emailSubject = "TUTORERA® — Offer Expired";
  const html = renderTransactionalEmail({
    subject: emailSubject,
    emailCategory: "Offer Update",
    emailHeading: "Offer Has Expired",
    emailSubheading: `${role.charAt(0).toUpperCase() + role.slice(1)} for ${subject} is no longer active.`,
    firstName: recipientName,
    openingMessage: `Unfortunately, ${role} for ${subject} has expired.`,
    mainMessage: "You can browse other tutors and post new tuition requests anytime on TUTORERA.",
    cta: { label: "Browse TUTORERA", url: "https://tutorera.ac.pk/tutors" },
    includeSecurityNotice: false,
    deliverability: "This transactional notification was sent because an offer on your TUTORERA account expired.",
  });
  return { subject: emailSubject, html };
};
