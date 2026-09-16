"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import api from "@/lib/axios";
import { GST_ON_PLATFORM_FEE_PERCENT,PLATFORM_FEE_PERCENT } from "@/lib/site";
import { DashRequest } from "@/types/dashboard";
import { useState } from "react";
import styles from "./PostRequestModal.module.css";

type Props = {
  request: DashRequest;
  onClose: () => void;
  onSuccess: () => void;
};

export default function PlaceBidModal({ request, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState(String(request.budget));
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useFocusTrap(true, onClose);

  const value = Number(amount) || 0;
  const fee = Math.round((value * PLATFORM_FEE_PERCENT) / 100);
  const tax = Math.round((fee * GST_ON_PLATFORM_FEE_PERCENT) / 100);
  const net = value - fee - tax;

  async function submit() {
    if (!value) {
      setError("Enter a valid offer amount.");
      return;
    }
    if (!request.allowCounterOffers && value !== request.budget) {
      setError(`This request only accepts the proposed rate of PKR ${request.budget.toLocaleString()}.`);
      return;
    }

    setLoading(true);
    try {
      await api.post(`/requests/${request._id}/bids`, {
        amount: value,
        message: message || "I am available for this tuition request.",
        availability,
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Unable to send offer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Send tutor offer">
      <div ref={ref} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Send Tutor Offer</h2>
          <button className={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        <div className={styles.modalBody}>
          <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10 }}>
            <strong>{request.subject} · {request.level}</strong>
            <p>Student proposed PKR {request.budget.toLocaleString()}/{request.pricingUnit || "hour"}</p>
            {!request.allowCounterOffers && (
              <p style={{ fontSize: 12, color: "#64748b" }}>
                This student has disabled counter-offers, so tutors can only accept the proposed rate.
              </p>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Your offer (PKR/{request.pricingUnit || "hour"})</label>
            <input
              className={styles.input}
              type="number"
              min="1"
              value={amount}
              disabled={!request.allowCounterOffers}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Availability</label>
            <input className={styles.input} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Mon, Wed, Fri after 5 PM" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Message</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Relevant experience and teaching approach. Do not share private contact details."
            />
            {Boolean(message && /(\+92|0092|92)?[\s\-]?3[0-9]{2}[\s\-]?[0-9]{7}|\b\d[\d\s\-]{8,12}\d\b|whatsapp|whatsap|watsapp|wa\.me|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(message)) && (
              <p style={{ fontSize: 12, color: "#b45309", background: "#fef3c7", padding: "6px 10px", borderRadius: 6, margin: "6px 0 0", border: "1px solid #fde68a" }}>
                ⚠️ <strong>Safety Warning:</strong> Sharing phone numbers, WhatsApp, or emails violates platform rules and will flag your offer for moderation.
              </p>
            )}
          </div>

          <div style={{ background: "#fffbeb", padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.7 }}>
            <strong>Estimated earnings</strong><br />
            Agreed rate: PKR {value.toLocaleString()}<br />
            TUTORERA fee ({PLATFORM_FEE_PERCENT}%): PKR {fee.toLocaleString()}<br />
            Tax ({GST_ON_PLATFORM_FEE_PERCENT}% of fee): PKR {tax.toLocaleString()}<br />
            <strong>Estimated net: PKR {net.toLocaleString()}</strong>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Pass</button>
          <button className={styles.submitBtn} disabled={loading} onClick={submit}>
            {loading ? "Sending..." : value === request.budget ? `Accept PKR ${value.toLocaleString()}` : "Send Counter Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
