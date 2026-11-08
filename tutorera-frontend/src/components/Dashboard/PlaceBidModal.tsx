"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { DashRequest } from "@/types/dashboard";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { DashCard } from "./ui";
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
  const currency = request.currency || "Market currency";

  const value = Number(amount) || 0;

  async function submit() {
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid offer amount.");
      return;
    }
    if (!request.allowCounterOffers && value !== request.budget) {
      setError(`This request only accepts the proposed rate of ${currency} ${request.budget.toLocaleString()}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/requests/${request._id}/bids`, {
        amount: value,
        message: message || "I am available for this tuition request.",
        availability,
      });
      // Backend flags amounts wildly inconsistent with the request's
      // currency/budget (e.g. a number sized for a different currency) -
      // surface that before closing so the tutor can catch a mistake.
      if (res.data?.warning) {
        window.alert(res.data.warning);
      }
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
          <DashCard padding="sm" style={{ background: UI_COLORS.gray50, boxShadow: "none" }}>
            <strong>{request.subject} · {request.level}</strong>
            <p>Student proposed {currency} {request.budget.toLocaleString()}/{request.pricingUnit || "hour"}</p>
            {!request.allowCounterOffers && (
              <p style={{ fontSize: 12, color: TEXT_COLORS.muted }}>
                This student has disabled counter-offers, so tutors can only accept the proposed rate.
              </p>
            )}
          </DashCard>

          {error && <div className={styles.error} role="alert">{error}</div>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="offer-amount">Your offer ({currency}/{request.pricingUnit || "hour"})</label>
            <input
              id="offer-amount"
              className={styles.input}
              type="number"
              min="1"
              value={amount}
              disabled={!request.allowCounterOffers}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="offer-availability">Availability</label>
            <input id="offer-availability" className={styles.input} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Mon, Wed, Fri after 5 PM" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="offer-message">Message</label>
            <textarea
              id="offer-message"
              className={styles.textarea}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Relevant experience and teaching approach. Do not share private contact details."
            />
            {Boolean(message && /(\+92|0092|92)?[\s\-]?3[0-9]{2}[\s\-]?[0-9]{7}|\b\d[\d\s\-]{8,12}\d\b|whatsapp|whatsap|watsapp|wa\.me|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(message)) && (
              <p style={{ fontSize: 12, color: STATUS_COLORS.warning.color, background: STATUS_COLORS.warning.bg, padding: "6px 10px", borderRadius: 6, margin: "6px 0 0", border: `1px solid ${STATUS_COLORS.warning.border}` }}>
                ⚠️ <strong>Safety Warning:</strong> Sharing phone numbers, WhatsApp, or emails violates platform rules and will flag your offer for moderation.
              </p>
            )}
          </div>

          <DashCard padding="sm" style={{ background: STATUS_COLORS.warning.bg, boxShadow: "none", fontSize: 13, lineHeight: 1.7 }}>
            <strong>Fees and earnings</strong><br />
            Your proposed rate is {currency} {value.toLocaleString()}. The final fee, applicable tax and tutor earnings are calculated using the market policy when an offer is accepted; this screen does not yet provide a market-specific quote.
          </DashCard>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Pass</button>
          <button className={styles.submitBtn} disabled={loading} onClick={submit}>
            {loading ? "Sending..." : value === request.budget ? `Accept ${currency} ${value.toLocaleString()}` : "Send Counter Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
