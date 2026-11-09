"use client";

import { useEffect, useState } from "react";
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
  const [quote, setQuote] = useState<{ currency: string; subtotal: number; tutorFee: number; tax: number; tutorNet: number } | null>(null);
  const [quoteNote, setQuoteNote] = useState("");
  const [sentWarning, setSentWarning] = useState("");

  useEffect(() => {
    if (!Number.isFinite(value) || value <= 0) { setQuote(null); setQuoteNote(""); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      api.post(`/requests/${request._id}/fee-preview`, { amount: value })
        .then((res) => { if (!cancelled) { setQuote(res.data.quote); setQuoteNote(""); } })
        .catch((e: unknown) => {
          if (cancelled) return;
          setQuote(null);
          setQuoteNote((e as { response?: { data?: { message?: string } } }).response?.data?.message || "A fee preview is unavailable right now.");
        });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value, request._id]);

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
        setSentWarning(res.data.warning);
        return;
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
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close offer dialog">x</button>
        </div>

        <div className={styles.modalBody}>
          <DashCard padding="sm" style={{ background: UI_COLORS.gray50, boxShadow: "none" }}>
            <strong>{request.subject} - {request.level}</strong>
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
                <strong>Safety warning:</strong> Sharing phone numbers, WhatsApp, or emails violates platform rules and will flag your offer for moderation.
              </p>
            )}
          </div>

          <DashCard padding="md" style={{ background: "#f0f9ff", border: `2px solid ${UI_COLORS.accent}`, boxShadow: "0 2px 8px rgba(3,41,178,0.08)" }}>
            <strong style={{ fontSize: 14, display: 'block', marginBottom: '0.75rem', color: UI_COLORS.primary }}>💰 Estimated Earnings Breakdown</strong>
            <div aria-live="polite">
              {quote ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #dbeafe' }}>
                    <span>Proposed rate:</span>
                    <span style={{ fontWeight: 600 }}>{quote.currency} {quote.subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: TEXT_COLORS.muted }}>
                    <span>TUTORERA platform fee (20%):</span>
                    <span>−{quote.currency} {quote.tutorFee.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: TEXT_COLORS.muted }}>
                    <span>Tax on fee (15%):</span>
                    <span>−{quote.currency} {quote.tax.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid #3b82f6', marginTop: '0.25rem' }}>
                    <strong style={{ color: UI_COLORS.primary }}>You receive:</strong>
                    <strong style={{ fontSize: 14, color: '#16a34a' }}>{quote.currency} {quote.tutorNet.toLocaleString()}</strong>
                  </div>
                  <p style={{ fontSize: 11, color: TEXT_COLORS.muted, margin: '0.5rem 0 0', fontStyle: 'italic' }}>Fees are recalculated and locked when offer is accepted.</p>
                </div>
              ) : (
                <span>{quoteNote || `Your proposed rate is ${currency} ${value.toLocaleString()}. Calculating fees...`}</span>
              )}
            </div>
          </DashCard>

          {sentWarning && (
            <p role="alert" style={{ fontSize: 13, color: STATUS_COLORS.warning.color, background: STATUS_COLORS.warning.bg, border: `1px solid ${STATUS_COLORS.warning.border}`, padding: "8px 10px", borderRadius: 6, margin: 0 }}>
              <strong>Offer sent, but please check the amount:</strong> {sentWarning}
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          {sentWarning ? (
            <button className={styles.submitBtn} onClick={() => { onSuccess(); onClose(); }}>Done</button>
          ) : (
            <>
              <button className={styles.cancelBtn} onClick={onClose}>Pass</button>
              <button className={styles.submitBtn} disabled={loading} onClick={submit}>
                {loading ? "Sending..." : value === request.budget ? `Accept ${currency} ${value.toLocaleString()}` : "Send Counter Offer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
