/**
 * Centralized marketplace conversion telemetry and analytics tracking.
 */

export type MarketplaceEvent = 
  | "student_request_cta_clicked"
  | "request_wizard_started"
  | "request_mode_selected"
  | "request_subject_selected"
  | "request_budget_entered"
  | "request_published"
  | "live_popup_viewed"
  | "live_popup_approach_clicked"
  | "first_offer_received"
  | "offer_comparison_opened"
  | "offer_shortlisted"
  | "offer_counter_sent"
  | "tutor_offer_accepted"
  | "checkout_started"
  | "payment_completed"
  | "progress_report_viewed"
  | "repeat_booking_started"
  | "referral_dashboard_viewed"
  | "referral_link_copied"
  | "referral_shared"
  // New tutor side events
  | "tutor_signup_started"
  | "tutor_opportunity_viewed"
  | "tutor_onboarding_completed"
  | "tutor_offer_submitted";

export function trackMarketplaceEvent(
  event: MarketplaceEvent,
  properties?: Record<string, any>
): void {
  try {
    if (typeof window === "undefined") return;

    // Dispatch custom DOM event for local listeners
    window.dispatchEvent(
      new CustomEvent("tutorera_marketplace_event", {
        detail: { event, properties, timestamp: Date.now() },
      })
    );

    // If Google Analytics / gtag is available
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", event, properties);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[Marketplace Telemetry] ${event}:`, properties);
    }
  } catch {
    // Fail silent to never disrupt user experience
  }
}
