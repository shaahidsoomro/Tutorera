"use client";

import api from "@/lib/axios";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Lock,
  Trash2,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React,{ useEffect,useState } from "react";
import s from "../../compliance-pages.module.css";

export default function AccountDeletePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    }
  }, []);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setErrorMsg("Please type the exact confirmation word 'DELETE' to proceed.");
      return;
    }

    if (!acknowledge) {
      setErrorMsg("Please acknowledge that this action is permanent and irreversible.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post("/auth/me/delete-account", {
        reason: reason || "User initiated self-serve deletion",
        confirmation: "DELETE",
      });

      if (res.data?.success) {
        setIsDeleted(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        setTimeout(() => {
          router.push("/");
        }, 4000);
      } else {
        setErrorMsg(res.data?.message || "Failed to delete account. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "An error occurred while deleting your account. Please check for active bookings or contact support.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDeleted) {
    return (
      <div className={s.wrapper}>
        <div className={s.container} style={{ paddingTop: "6rem", textAlign: "center" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2.5rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "1rem" }}>
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: "0 auto 1rem auto" }} />
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#166534", marginBottom: "0.75rem" }}>
              Account Successfully Deleted
            </h1>
            <p style={{ color: "#15803d", fontSize: "0.95rem", lineHeight: "1.6" }}>
              Your account has been deactivated, your personal profile data removed from search, and your
              session cleared. Redirecting you to the home page...
            </p>
            <div style={{ marginTop: "1.5rem" }}>
              <Link href="/" className={s.primaryBtn} style={{ margin: "0 auto", display: "inline-flex" }}>
                Return to Homepage Immediately
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero} style={{ background: "linear-gradient(135deg, #1e1e24 0%, #0f172a 100%)" }}>
        <div className={s.badge} style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>
          <Trash2 size={16} /> Self-Serve Account Erasure
        </div>
        <h1 className={s.title}>Close & Delete Your TUTORERA Account</h1>
        <p className={s.subtitle}>
          In accordance with Article 17 of GDPR and international privacy legislation, you have the
          unqualified right to delete your account and personal data from TUTORERA.
        </p>
      </section>

      <div className={s.container} style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/privacy-center" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#4b5563", fontSize: "0.9rem", textDecoration: "none" }}>
            <ArrowLeft size={16} /> Return to Privacy Rights Center
          </Link>
        </div>

        {/* Warning Banner */}
        <div className={s.highlightBox} style={{ borderLeftColor: "#ef4444" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ fontSize: "1.05rem", color: "#b91c1c", display: "block", marginBottom: "0.25rem" }}>
                Warning: This Action is Permanent and Irreversible
              </strong>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: "1.6", color: "#4b5563" }}>
                Once your account is deleted, your public profile, tutoring requests, active proposals,
                and message inbox will be permanently removed. You will not be able to reactivate this account
                or recover your past ratings and history.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Legal Retention Disclosure */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1.25rem", margin: "1.5rem 0" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <Info size={18} color="#2563eb" />
            <strong style={{ fontSize: "0.92rem" }}>What happens to your data upon deletion:</strong>
          </div>
          <ul style={{ fontSize: "0.85rem", color: "#4b5563", lineHeight: "1.6", paddingLeft: "1.25rem", margin: 0 }}>
            <li>Your direct personal contact information (email, phone, home address, photos) is anonymized.</li>
            <li>Your pending tuition requests and open offers are immediately canceled.</li>
            <li>
              Completed financial transaction receipts, invoice numbers, and platform settlement audit logs are
              retained for statutory tax and financial compliance (5 to 7 years) as permitted under GDPR Art 17(3)(b).
            </li>
            <li>Reviews you have left or received will be anonymized to protect community trust.</li>
          </ul>
        </div>

        {!isLoggedIn ? (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem", background: "white", border: "1px solid #e5e7eb", borderRadius: "0.875rem" }}>
            <Lock size={36} color="#6b7280" style={{ margin: "0 auto 1rem auto" }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Authentication Required
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", maxWidth: "450px", margin: "0 auto 1.5rem auto" }}>
              To ensure no unauthorized party can delete your account, you must sign in before initiating
              an account erasure request.
            </p>
            <Link href="/login?redirect=/account/delete" className={s.primaryBtn} style={{ display: "inline-flex" }}>
              Sign In to Continue
            </Link>
          </div>
        ) : (
          <form onSubmit={handleDelete} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "0.875rem", padding: "2rem" }}>
            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "0.875rem", borderRadius: "0.5rem", fontSize: "0.9rem", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <XCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="reason" style={{ display: "block", fontWeight: "600", fontSize: "0.92rem", marginBottom: "0.5rem" }}>
                Why are you deleting your account? (Optional)
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.92rem" }}
              >
                <option value="">Please select a reason...</option>
                <option value="Found a tutor/student successfully">Found a tutor / student successfully</option>
                <option value="No longer require tutoring services">No longer require tutoring services</option>
                <option value="Privacy or data retention concerns">Privacy or data retention concerns</option>
                <option value="Too many notifications or emails">Too many notifications or emails</option>
                <option value="Relocating to another country">Relocating to another country</option>
                <option value="Temporary pause / will return later">Temporary pause / will return later</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="confirm" style={{ display: "block", fontWeight: "600", fontSize: "0.92rem", marginBottom: "0.5rem" }}>
                To confirm, type <span style={{ color: "#dc2626", fontWeight: "800" }}>DELETE</span> in the box below:
              </label>
              <input
                id="confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                required
                style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "1rem", letterSpacing: "1px" }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: "pointer", fontSize: "0.88rem", color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(e) => setAcknowledge(e.target.checked)}
                  style={{ marginTop: "3px" }}
                  required
                />
                <span>
                  I understand that this action is permanent. Any active inquiries will be canceled,
                  and I will no longer have access to my profile, ratings, or past communication history.
                </span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "flex-end" }}>
              <Link href="/privacy-center" className={s.secondaryBtn}>
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || confirmText.trim().toUpperCase() !== "DELETE" || !acknowledge}
                style={{
                  backgroundColor: confirmText.trim().toUpperCase() === "DELETE" && acknowledge ? "#dc2626" : "#9ca3af",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  fontWeight: "700",
                  fontSize: "0.92rem",
                  border: "none",
                  cursor: confirmText.trim().toUpperCase() === "DELETE" && acknowledge ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Trash2 size={16} />
                {isSubmitting ? "Deleting Account..." : "Permanently Delete Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
