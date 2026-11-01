import { NOTIFICATION_EVENT_REGISTRY, NotificationChannel } from "../utils/notificationRegistry";
import { EMAIL_EVENTS } from "../utils/emailEvents";
import sendEmail from "../utils/sendEmail";
import { sendNotification, ioInstance } from "../utils/socket";
import User from "../models/User.model";
import * as templates from "../utils/emailTemplates";
import * as trackingTemplates from "../utils/trackingEmails";
import * as recoveryTemplates from "../utils/recoveryEmailTemplates";

type EmailResult = { subject: string; html: string };
type BuilderFn = (name: string, payload: Record<string, unknown>) => EmailResult;

export class NotificationService {
  static async publishEvent(userId: string, eventName: string, payload: Record<string, unknown> = {}): Promise<void> {
    const registryEntry = NOTIFICATION_EVENT_REGISTRY[eventName];

    if (!registryEntry) {
      console.warn(`[NotificationService] Event ${eventName} not found in registry.`);
      return;
    }

    try {
      // "system_admin" is a pseudo-recipient meaning "every admin", not a real
      // user id - User.findById(userId) below would throw a CastError on it
      // and get silently swallowed, which is why every admin alert routed
      // through here (new signups included) has never actually been sent.
      const recipients = userId === "system_admin"
        ? await User.find({ role: "admin" }).select("email name role")
        : await (async () => {
            const single = await User.findById(userId).select("email name role");
            return single ? [single] : [];
          })();

      if (recipients.length === 0) {
         console.error(`[NotificationService] No recipient(s) found for user "${userId}" / event ${eventName}.`);
         return;
      }

      const { channels } = registryEntry;

      for (const user of recipients) {
        // 1. IN-APP CHANNEL
        if (channels.inApp) {
          const notificationPayload = {
            title: (payload.title as string | undefined) || "Notification",
            message: (payload.message as string | undefined) || registryEntry.description,
            type: (payload.type as string | undefined) || "general",
            link: payload.link as string | undefined,
          };
          await sendNotification(ioInstance, user._id.toString(), notificationPayload as Parameters<typeof sendNotification>[2]);
        }

        // 2. EMAIL CHANNEL
        if (channels.email) {
          if (registryEntry.templateId) {
            const emailBuilder = this.getEmailBuilder(registryEntry.templateId);
            if (emailBuilder) {
               const { subject, html } = emailBuilder(user.name, payload);
               await sendEmail({
                 to: user.email,
                 subject,
                 html,
                 userId: user._id.toString(),
                 eventType: eventName,
                 templateId: registryEntry.templateId,
                 relatedEntityType: payload.relatedEntityType as string | undefined,
                 relatedEntityId: payload.relatedEntityId as string | undefined,
               });
            } else {
               console.warn(`[NotificationService] No email template mapped for ${registryEntry.templateId}`);
            }
          } else {
            // Direct fallback when no explicit templateId but email channel is enabled
            if (payload.subject && payload.html) {
               await sendEmail({
                 to: user.email,
                 subject: payload.subject as string,
                 html: payload.html as string,
                 userId: user._id.toString(),
                 eventType: eventName,
                 relatedEntityType: payload.relatedEntityType as string | undefined,
                 relatedEntityId: payload.relatedEntityId as string | undefined,
               });
            }
          }
        }
      }

      // 3. PUSH / SMS STUBS
      if (channels.push) {
        console.log(`[NotificationService] Stub: Dispatching Push notification for ${eventName} to user ${userId}`);
      }
      if (channels.sms) {
        console.log(`[NotificationService] Stub: Dispatching SMS notification for ${eventName} to user ${userId}`);
      }

    } catch (err) {
      console.error(`[NotificationService] Failed to publish event ${eventName}:`, err);
      throw err;
    }
  }

  private static getEmailBuilder(templateId: string): BuilderFn | undefined {
    const map: Record<string, BuilderFn> = {
      "auth_welcome": (name, p) => {
        const { role, applicationId, trackingUrl } = p as { role?: string; applicationId?: string; trackingUrl?: string };
        if (role === "tutor") return templates.tutorWelcomeApplicationEmail(name, applicationId || "TUT-PENDING", trackingUrl);
        if (role === "parent") return templates.parentWelcomeEmail(name);
        return templates.studentWelcomeEmail(name);
      },
      "auth_verify_email": () => ({ subject: "Verify", html: "..." }), // logic is in auth controller
      "auth_otp_code": () => ({ subject: "OTP", html: "..." }),        // logic is in auth controller
      "password_reset_code": (name, p) => {
        const { otp } = p as { otp: string };
        return templates.passwordResetOtpEmail(name, otp);
      },
      "admin_new_user": (_name, p) => templates.adminNewUserSignupEmail(p as Parameters<typeof templates.adminNewUserSignupEmail>[0]),
      "admin_tutor_application_submitted": (_name, p) => templates.adminTutorApplicationSubmittedEmail(p as Parameters<typeof templates.adminTutorApplicationSubmittedEmail>[0]),
      "admin_tutor_document_resubmitted": (_name, p) => templates.adminTutorDocumentResubmittedEmail(p as Parameters<typeof templates.adminTutorDocumentResubmittedEmail>[0]),
      "tutor_approved": (name, p) => {
        // Callers must supply ctaArgs — cast as required since the event payload contract owns this
        const { document, ctaArgs, hourlyRate, currency } = p as { document?: string; ctaArgs: Parameters<typeof trackingTemplates.cnicVerifiedEmail>[1]; hourlyRate?: number; currency?: string };
        if (document === "CNIC") return trackingTemplates.cnicVerifiedEmail(name, ctaArgs);
        if (document === "Degree") return trackingTemplates.educationalDocumentsVerifiedEmail(name, ctaArgs);
        if (document === "DemoVideo") return trackingTemplates.demoVideoApprovedEmail(name, ctaArgs);
        if (document === "Police") return trackingTemplates.policeVerifiedEmail(name, ctaArgs);
        if (document === "Marketplace") return trackingTemplates.marketplaceActivatedEmail(name, ctaArgs);
        if (document === "All") return trackingTemplates.tutorMarketplaceAgreementEmail(name, { ...ctaArgs, hourlyRate, currency });
        return trackingTemplates.educationalDocumentsVerifiedEmail(name, ctaArgs);
      },
      "verification_rejected": (name, p) => {
        const { document, reason, ctaArgs } = p as { document?: string; reason: string; ctaArgs: Parameters<typeof trackingTemplates.cnicRejectedEmail>[2] };
        if (document === "CNIC") return trackingTemplates.cnicRejectedEmail(name, reason, ctaArgs);
        if (document === "Degree") return trackingTemplates.educationalDocumentsRejectedEmail(name, reason, ctaArgs);
        if (document === "DemoVideo") return trackingTemplates.demoVideoRejectedEmail(name, reason, ctaArgs);
        if (document === "Police") return trackingTemplates.policeRejectedEmail(name, reason, ctaArgs);
        if (document === "Marketplace") return trackingTemplates.marketplaceDeactivatedEmail(name, reason, ctaArgs);
        return trackingTemplates.educationalDocumentsRejectedEmail(name, reason, ctaArgs);
      },
      "home_tuition_approved": (name, p) => {
        const { ctaArgs } = p as { ctaArgs: Parameters<typeof trackingTemplates.homeTuitionActivatedEmail>[1] };
        return trackingTemplates.homeTuitionActivatedEmail(name, ctaArgs);
      },
      "payment_receipt": (name, p) => {
        const { tutorName, amount } = p as { tutorName?: string; amount: number };
        return templates.paymentConfirmedEmail(name, tutorName || "your tutor", amount, p as unknown as Parameters<typeof templates.paymentConfirmedEmail>[3]);
      },
      "payment_failed": (name, p) => {
        const { tutorName, amount } = p as { tutorName?: string; amount: number };
        return templates.paymentFailedEmail(name, tutorName || "your tutor", amount, p as unknown as Parameters<typeof templates.paymentFailedEmail>[3]);
      },
      "payment_failed_tutor": (name, p) => {
        const { studentName, amount } = p as { studentName?: string; amount: number };
        return templates.paymentFailedNotifyTutorEmail(name, studentName || "the student", amount, p as unknown as Parameters<typeof templates.paymentFailedNotifyTutorEmail>[3]);
      },
      "tutor_app_abandoned_24h": (name) => recoveryTemplates.tutorApplicationAbandonedEmail(name, 1),
      "tutor_app_abandoned_72h": (name) => recoveryTemplates.tutorApplicationAbandonedEmail(name, 3),
      "tutor_app_abandoned_168h": (name) => recoveryTemplates.tutorApplicationAbandonedEmail(name, 7),
      "request_abandoned_6h": (name, p) => recoveryTemplates.studentRequestAbandonedEmail(name, 0.25, (p as { subjectName?: string }).subjectName),
      "request_abandoned_24h": (name, p) => recoveryTemplates.studentRequestAbandonedEmail(name, 1, (p as { subjectName?: string }).subjectName),
      "request_abandoned_72h": (name, p) => recoveryTemplates.studentRequestAbandonedEmail(name, 3, (p as { subjectName?: string }).subjectName),
      "request_abandoned_168h": (name, p) => recoveryTemplates.studentRequestAbandonedEmail(name, 7, (p as { subjectName?: string }).subjectName),
      "direct_booking_abandoned_24h": (name, p) => { const { tutorName, subjectName } = p as { tutorName?: string; subjectName?: string }; return recoveryTemplates.studentDirectBookingAbandonedEmail(name, 1, tutorName, subjectName); },
      "direct_booking_abandoned_72h": (name, p) => { const { tutorName, subjectName } = p as { tutorName?: string; subjectName?: string }; return recoveryTemplates.studentDirectBookingAbandonedEmail(name, 3, tutorName, subjectName); },
      "direct_booking_abandoned_168h": (name, p) => { const { tutorName, subjectName } = p as { tutorName?: string; subjectName?: string }; return recoveryTemplates.studentDirectBookingAbandonedEmail(name, 7, tutorName, subjectName); },
      "payment_abandoned_1h": (name, p) => { const { tutorName, amount, currency } = p as { tutorName?: string; amount?: number; currency?: string }; return recoveryTemplates.studentPaymentAbandonedEmail(name, 1/24, tutorName, amount, currency); },
      "payment_abandoned_24h": (name, p) => { const { tutorName, amount, currency } = p as { tutorName?: string; amount?: number; currency?: string }; return recoveryTemplates.studentPaymentAbandonedEmail(name, 1, tutorName, amount, currency); },
      "payment_abandoned_48h": (name, p) => { const { tutorName, amount, currency } = p as { tutorName?: string; amount?: number; currency?: string }; return recoveryTemplates.studentPaymentAbandonedEmail(name, 2, tutorName, amount, currency); },
      "payment_abandoned_72h": (name, p) => { const { tutorName, amount, currency } = p as { tutorName?: string; amount?: number; currency?: string }; return recoveryTemplates.studentPaymentAbandonedEmail(name, 3, tutorName, amount, currency); },
      "payment_abandoned_168h": (name, p) => { const { tutorName, amount, currency } = p as { tutorName?: string; amount?: number; currency?: string }; return recoveryTemplates.studentPaymentAbandonedEmail(name, 7, tutorName, amount, currency); },
      "review_requested": (name, p) => {
        const { tutorName, subject, bookingId } = p as { tutorName: string; subject: string; bookingId: string };
        return templates.reviewRequestEmail(name, tutorName, subject, bookingId);
      },
    };
    return map[templateId];
  }
}
