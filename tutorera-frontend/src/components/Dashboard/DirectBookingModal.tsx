"use client";
// components/tutors/DirectBookingModal.tsx
import SlotPicker from "@/components/Tutors/SlotPicker";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import axiosInstance from "@/lib/axios";
import { formatMoney } from "@/lib/site";
import { useEffect,useRef,useState } from "react";
import styles from "./PostRequestModal.module.css";

const LEVELS = ["Primary (Grades 1-5)", "Middle (Grades 6-8)", "Matric (9th & 10th)", "Intermediate / FSc", "O-Level (Cambridge / Edexcel)", "A-Level (Cambridge / Edexcel)", "IB (Middle Years / Diploma)", "University / Degree", "Test Preparation", "Other"];

interface Slot {
  date: string;
  dayName: string;
  startTime: string;
  endTime: string;
}

interface Props {
  tutorId: string;
  tutorUserId: string;
  tutorName: string;
  hourlyRate: number;
  currency?: string;
  tutorSubjects: string[];
  tutorTeachingMode: "online" | "in-person" | "both";
  tutorCity: string;
  initialSubject?: string;
  initialLevel?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface DirectBookingForm {
  subject: string;
  level: string;
  description: string;
  teachingMode: string;
}

export default function DirectBookingModal({
  tutorId, tutorUserId, tutorName, hourlyRate, currency = "PKR",
  tutorSubjects, tutorTeachingMode, tutorCity,
  initialSubject = "", initialLevel = "",
  onClose, onSuccess,
}: Props) {
  const [form, setForm] = useState<DirectBookingForm>({
    subject: initialSubject || "", level: initialLevel || "", description: "",
    teachingMode: tutorTeachingMode === "both" ? "" : tutorTeachingMode,
  });
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useFocusTrap(true, onClose);

  function set(key: keyof DirectBookingForm, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    const hasMeaningfulProgress = Boolean(form.subject || form.level || form.description || form.teachingMode || selectedSlot);
    if (!hasMeaningfulProgress || submitted) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      axiosInstance.post("/requests/draft", {
        type: "direct_booking",
        tutorId,
        tutorName,
        subject: form.subject,
        level: form.level,
        description: form.description,
        teachingMode: form.teachingMode,
        selectedDate: selectedSlot?.date,
        selectedStartTime: selectedSlot?.startTime,
        selectedEndTime: selectedSlot?.endTime,
      }).catch(() => {});
    }, 1500);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [form, selectedSlot, submitted, tutorId, tutorName]);

  async function handleSubmit() {
    const { subject, level, description, teachingMode } = form;
    if (!subject || !level || !description || !teachingMode) {
      setError("Please fill in all fields."); return;
    }
    if (!selectedSlot) {
      setError("Please select a time slot."); return;
    }
    setLoading(true); setError("");
    try {
      await axiosInstance.post("/requests/direct", {
        tutorId,
        subject, level, description, teachingMode,
        city: tutorCity,
        currency,
        schedule: `${selectedSlot.dayName} ${selectedSlot.startTime}–${selectedSlot.endTime}`,
        selectedDate: selectedSlot.date,
        selectedStartTime: selectedSlot.startTime,
        selectedEndTime: selectedSlot.endTime,
      });
      setSubmitted(true);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Failed to send booking request. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div ref={modalRef} className={styles.modal} style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ width: 64, height: 64, backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <span style={{ fontSize: '1.75rem' }}>✅</span>
          </div>
          <h2 className={styles.modalTitle} style={{ marginBottom: '0.75rem' }}>Request Sent!</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Your booking request for <strong>{selectedSlot?.dayName} at {selectedSlot?.startTime}</strong> has been sent to <strong>{tutorName}</strong>. You'll be notified once they respond.
          </p>
          <button onClick={onClose} className={styles.submitBtn} style={{ width: '100%' }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Book a session">
      <div ref={modalRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Book {tutorName.split(' ')[0]}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">×</button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Rate */}
          <div style={{ backgroundColor: '#EEF5FF', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#0329B2', fontWeight: 600 }}>Tutor's Rate</span>
            <span style={{ fontSize: '0.95rem', color: '#021550', fontWeight: 800 }}>{formatMoney(hourlyRate, currency, "hour")}</span>
          </div>

          {/* Subject + Level */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="db-subject">Subject *</label>
              <select id="db-subject" aria-label="Subject" className={styles.select}
                value={form.subject} onChange={e => set("subject", e.target.value)}>
                <option value="">Select subject</option>
                {tutorSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="db-level">Level *</label>
              <select id="db-level" aria-label="Level" className={styles.select}
                value={form.level} onChange={e => set("level", e.target.value)}>
                <option value="">Select level</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Message */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="db-desc">Message to Tutor *</label>
            <textarea id="db-desc" className={styles.textarea} rows={2}
              placeholder="Tell the tutor what you need help with..."
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {/* Teaching mode */}
          {tutorTeachingMode === "both" ? (
            <div className={styles.field} style={{ marginBottom: '1rem' }}>
              <label className={styles.label} htmlFor="db-mode">Teaching Mode *</label>
              <select id="db-mode" aria-label="Teaching Mode" className={styles.select}
                value={form.teachingMode} onChange={e => set("teachingMode", e.target.value)}>
                <option value="">Select mode</option>
                <option value="online">Online Tuition (Instant Borderless — No Police Check Needed)</option>
                <option value="in-person">In-Person Home Tuition (Police Verified)</option>
              </select>
              {form.teachingMode === "in-person" && (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "#9a3412", fontWeight: 500 }}>
                  🛡️ Home Tuition: Tutors must hold an approved Police Verification Report.
                </p>
              )}
              {form.teachingMode === "online" && (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "#15803d", fontWeight: 500 }}>
                  🌐 Online Tuition: Conducted live via interactive video & screen-sharing.
                </p>
              )}
            </div>
          ) : (
            <div className={styles.field} style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Teaching Mode</label>
              <div style={{ padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#021550', fontWeight: 600, backgroundColor: '#F5F7FF' }}>
                {tutorTeachingMode === "online" ? "🌐 Online Tuition (Borderless — No Police Check Needed)" : "🏠 In-Person Home Tuition (Police Verified)"}
              </div>
            </div>
          )}

          {/* ── Slot Picker ── */}
          <div>
            <label className={styles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>
              Select Time Slot *
            </label>
            <SlotPicker
              tutorUserId={tutorUserId}
              selectedSlot={selectedSlot}
              onSlotSelect={setSelectedSlot}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !selectedSlot} className={styles.submitBtn}
            style={{ opacity: !selectedSlot ? 0.6 : 1 }}>
            {loading ? "Sending…" : "Send Booking Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
