"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import { ArrowRight,X } from "lucide-react";
import React,{ useState } from "react";

interface CounterOfferSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  offerId: string;
  currentAmount: number;
  initialRate?: number;
  pricingUnit?: string;
  currency?: string;
  tutorName: string;
  role?: "student" | "tutor";
}

export default function CounterOfferSheet({
  isOpen,
  onClose,
  onDone,
  offerId,
  currentAmount,
  initialRate,
  pricingUnit = "hour",
  currency = "PKR",
  tutorName,
}: CounterOfferSheetProps) {
  const [amount, setAmount] = useState(String(currentAmount));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sheetRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const handleQuickAdjust = (deltaPercent: number) => {
    const numeric = Number(amount) || currentAmount;
    const adjusted = Math.round(numeric * (1 + deltaPercent / 100));
    setAmount(String(Math.max(1, adjusted)));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      showError("Please enter a valid rate greater than zero.");
      return;
    }

    setBusy(true);
    try {
      await api.post(`/offers/${offerId}/counter`, {
        amount: num,
        message: message.trim(),
      });
      showSuccess("Counter-offer submitted successfully!");
      onDone();
      onClose();
    } catch (err) {
      showError(err, "Unable to send counter-offer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-sheet-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 21, 80, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "white",
          borderRadius: "1.25rem 1.25rem 0 0",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 32px rgba(2, 21, 80, 0.25)",
          animation: "slideUpSheet 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "#0329b2",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Negotiate Rate
            </span>
            <h2
              id="counter-sheet-title"
              style={{ fontSize: "1.1rem", fontWeight: 800, color: "#021550", margin: 0 }}
            >
              Counter-Offer for {tutorName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close counter sheet"
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sheet Content Form */}
        <form onSubmit={handleSend} style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          {/* Rate Comparison Chips */}
          <div
            style={{
              background: "#f8fafc",
              borderRadius: "0.75rem",
              padding: "0.85rem 1rem",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>
                Current Offer
              </span>
              <strong style={{ fontSize: "1rem", color: "#021550" }}>
                {currency} {currentAmount.toLocaleString()}/{pricingUnit}
              </strong>
            </div>

            {initialRate !== undefined && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>
                  Your Initial Budget
                </span>
                <strong style={{ fontSize: "0.95rem", color: "#0329b2" }}>
                  {currency} {initialRate.toLocaleString()}/{pricingUnit}
                </strong>
              </div>
            )}
          </div>

          {/* New Proposed Amount Input */}
          <div>
            <label
              htmlFor="counter-amount"
              style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#021550", marginBottom: "0.4rem" }}
            >
              Your Proposed Rate ({currency}/{pricingUnit}) *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="counter-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={1}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "0.625rem",
                  border: "2px solid #0329b2",
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#021550",
                  outline: "none",
                  boxSizing: "border-box",
                  minHeight: "48px",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#64748b",
                  pointerEvents: "none",
                }}
              >
                {currency}/{pricingUnit}
              </span>
            </div>
          </div>

          {/* Quick Step Buttons */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => handleQuickAdjust(-10)}
              style={chipBtnStyle}
            >
              -10%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdjust(-5)}
              style={chipBtnStyle}
            >
              -5%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdjust(+5)}
              style={chipBtnStyle}
            >
              +5%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdjust(+10)}
              style={chipBtnStyle}
            >
              +10%
            </button>
          </div>

          {/* Optional Message / Note */}
          <div>
            <label
              htmlFor="counter-note"
              style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.35rem" }}
            >
              Add note for {tutorName} (optional)
            </label>
            <textarea
              id="counter-note"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Can we meet in the middle? I need 3 lessons per week."
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "0.5rem",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            {Boolean(message && /(\+92|0092|92)?[\s\-]?3[0-9]{2}[\s\-]?[0-9]{7}|\b\d[\d\s\-]{8,12}\d\b|whatsapp|whatsap|watsapp|wa\.me|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(message)) && (
              <p style={{ fontSize: "0.75rem", color: "#b45309", background: "#fef3c7", padding: "6px 10px", borderRadius: 6, margin: "6px 0 0", border: "1px solid #fde68a" }}>
                ⚠️ <strong>Safety Warning:</strong> Sharing phone numbers, WhatsApp, or emails violates platform rules and will flag your counter-offer for review.
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.85rem",
                borderRadius: "0.625rem",
                border: "1.5px solid #cbd5e1",
                background: "white",
                color: "#475569",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                minHeight: "48px",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              style={{
                flex: 2,
                padding: "0.85rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "linear-gradient(135deg, #0329b2 0%, #016ef8 100%)",
                color: "white",
                fontWeight: 800,
                fontSize: "0.95rem",
                cursor: busy ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 14px rgba(3, 41, 178, 0.3)",
                minHeight: "48px",
              }}
            >
              <span>{busy ? "Sending Counter..." : "Send Counter-Offer"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes slideUpSheet {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const chipBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.45rem",
  borderRadius: "0.5rem",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "0.8rem",
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center",
};
