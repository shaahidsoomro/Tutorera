"use client";
import { useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";
import { DashCard, DashButton } from "./ui";
import api from "@/lib/axios";

interface Props {
  bookingId: string;
  currentSchedule: string;
  onClose: () => void;
  onSuccess: (updatedBooking: unknown) => void;
}

export default function RescheduleModal({ bookingId, currentSchedule, onClose, onSuccess }: Props) {
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMins, setDurationMins] = useState("60");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useFocusTrap(true, onClose);

  const handleSubmit = async () => {
    if (!startDate || !startTime) {
      setError("Please select a date and start time.");
      return;
    }
    const dur = parseInt(durationMins) || 60;
    if (dur < 15 || dur > 480) {
      setError("Duration must be between 15 and 480 minutes.");
      return;
    }
    const proposedStart = new Date(`${startDate}T${startTime}`);
    if (isNaN(proposedStart.getTime())) {
      setError("Invalid date or time.");
      return;
    }
    if (proposedStart <= new Date()) {
      setError("The proposed time must be in the future.");
      return;
    }
    const proposedEnd = new Date(proposedStart.getTime() + dur * 60_000);

    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/bookings/${bookingId}/reschedule`, {
        proposedStartAt: proposedStart.toISOString(),
        proposedEndAt: proposedEnd.toISOString(),
        note: note.trim() || undefined,
      });
      onSuccess(res.data.booking);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to send proposal. Please try again.");
      setLoading(false);
    }
  };

  // Min date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-modal-title"
        style={{ backgroundColor: UI_COLORS.surface, borderRadius: "1rem", padding: "2rem", width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h2 id="reschedule-modal-title" style={{ fontSize: "1.1rem", fontWeight: 800, color: TEXT_COLORS.primary, margin: "0 0 4px" }}>
              Propose a New Time
            </h2>
            <p style={{ fontSize: "0.8rem", color: TEXT_COLORS.muted, margin: 0 }}>
              Current: {currentSchedule}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_COLORS.muted, fontSize: "1.25rem", lineHeight: 1, padding: "0 0 0 1rem" }}>
            ×
          </button>
        </div>

        {error && (
          <DashCard padding="sm" style={{ background: STATUS_COLORS.danger.bg, borderColor: STATUS_COLORS.danger.border, boxShadow: "none", padding: "0.6rem 0.875rem", marginBottom: "1rem", color: TEXT_COLORS.danger, fontSize: "0.8rem" }}>
            {error}
          </DashCard>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: TEXT_COLORS.primary, marginBottom: "0.35rem" }}>
              New Date *
            </label>
            <input
              type="date"
              value={startDate}
              min={minDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.875rem", color: TEXT_COLORS.primary, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: TEXT_COLORS.primary, marginBottom: "0.35rem" }}>
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.875rem", color: TEXT_COLORS.primary, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: TEXT_COLORS.primary, marginBottom: "0.35rem" }}>
                Duration (minutes) *
              </label>
              <select
                value={durationMins}
                onChange={e => setDurationMins(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.875rem", color: TEXT_COLORS.primary, boxSizing: "border-box", background: "white" }}>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: TEXT_COLORS.primary, marginBottom: "0.35rem" }}>
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. I have a conflict at the original time..."
              style={{ width: "100%", padding: "0.65rem 0.875rem", border: `1.5px solid ${UI_COLORS.border}`, borderRadius: "0.5rem", fontSize: "0.875rem", color: TEXT_COLORS.primary, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <p style={{ fontSize: "0.75rem", color: TEXT_COLORS.muted, marginBottom: "1.25rem", lineHeight: 1.5 }}>
          The other party will be notified and must accept before the session time changes. The original time remains until accepted.
        </p>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <DashButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </DashButton>
          <DashButton variant="primary" size="md" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
            {loading ? "Sending..." : "Send Proposal"}
          </DashButton>
        </div>
      </div>
    </div>
  );
}
