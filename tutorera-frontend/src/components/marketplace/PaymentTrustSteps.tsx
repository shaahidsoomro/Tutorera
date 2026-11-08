import Link from "next/link";
import { FileEdit, ShieldCheck, RefreshCw, type LucideIcon } from "lucide-react";

export interface PaymentTrustStep {
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel?: string;
  linkHref?: string;
}

// Reflects TUTORERA's actual booking flow (commission-based checkout via the
// RapidPay gateway, protected by the existing First-Session Guarantee policy) -
// not an escrow/hold-and-release mechanism, which doesn't exist in this system.
// Copy is placeholder pending final marketing language.
export const PAYMENT_TRUST_STEPS: PaymentTrustStep[] = [
  {
    icon: FileEdit,
    title: "Post your requirement, pay nothing yet",
    description: "Posting a tuition need and receiving tutor offers is free. Nothing is charged until you accept a specific tutor's offer.",
  },
  {
    icon: ShieldCheck,
    title: "Pay securely when you accept an offer",
    description: "Once you choose a tutor and lock in the final rate, checkout runs through TUTORERA's verified payment gateway against that specific booking - never before.",
  },
  {
    icon: RefreshCw,
    title: "Protected by the First-Session Guarantee",
    description: "If your first session doesn't meet the published protection rules, eligible cases are reviewed for a replacement tutor, credit, or refund.",
    linkLabel: "Read the full guarantee policy",
    linkHref: "/first-session-guarantee",
  },
];

export default function PaymentTrustSteps() {
  return (
    <section
      style={{ padding: "4rem 1.5rem", background: "#f8faff", borderBottom: "1px solid #e2e8f0" }}
      aria-labelledby="payment-trust-title"
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 3rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            How Your Money Is Protected
          </span>
          <h2 id="payment-trust-title" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.15rem)", fontWeight: 900, color: "#021550", margin: "0.5rem 0 0.85rem" }}>
            You Only Pay for a Booking You Chose
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.98rem", lineHeight: 1.6 }}>
            No payment is ever collected for posting a request or receiving offers - only for a specific booking you've accepted.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1.5rem" }}>
          {PAYMENT_TRUST_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  padding: "1.75rem 1.5rem",
                  boxShadow: "0 4px 16px rgba(2, 21, 80, 0.05)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "-14px",
                    left: "1.5rem",
                    background: "#0329b2",
                    color: "white",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                  }}
                >
                  {index + 1}
                </span>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.75rem",
                    background: "#EEF5FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    marginTop: "0.4rem",
                  }}
                >
                  <Icon size={22} color="#0329b2" />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#021550", margin: "0 0 0.5rem" }}>
                  {step.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>
                  {step.description}
                </p>
                {step.linkHref && step.linkLabel && (
                  <Link
                    href={step.linkHref}
                    style={{ display: "inline-block", marginTop: "0.85rem", color: "#0329b2", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}
                  >
                    {step.linkLabel} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
