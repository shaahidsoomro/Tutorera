"use client";

import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showSuccess } from "@/lib/toast";
import { MailCheck,ShieldCheck,X } from "lucide-react";
import { FormEvent,useEffect,useRef,useState } from "react";

type Props = { onClose: () => void; onLinked: () => void };

export default function ConsentLinkChildModal({ onClose, onLinked }: Props) {
  const [studentEmail, setStudentEmail] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [subjects, setSubjects] = useState("");
  const [relationship, setRelationship] = useState("child");
  const [requestId, setRequestId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]") || []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleDialogKeys);
    return () => document.removeEventListener("keydown", handleDialogKeys);
  }, [onClose]);

  async function requestConsent(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/parent/children", {
        studentEmail: studentEmail.trim(), name: name.trim(), level: level.trim(),
        subjects: subjects.split(",").map((subject) => subject.trim()).filter(Boolean), relationship,
      });
      setRequestId(response.data.requestId);
      showSuccess("Verification code sent to the student.");
    } catch (caught: unknown) {
      const message = (caught as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Unable to request student consent.");
    } finally { setLoading(false); }
  }

  async function confirmConsent(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/parent/children/confirm", { requestId, code });
      showSuccess("Student consent confirmed. Account linked.");
      onLinked();
      onClose();
    } catch (caught: unknown) {
      const message = (caught as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Unable to confirm the verification code.");
    } finally { setLoading(false); }
  }

  const inputStyle = { width: "100%", minHeight: 44, padding: "0.7rem 0.85rem", border: "1.5px solid #cbd5e1", borderRadius: "0.55rem", color: UI_COLORS.primary, boxSizing: "border-box" as const };
  const labelStyle = { display: "block", color: UI_COLORS.primary, fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.35rem" };

  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: "1rem", background: "rgba(2,21,80,.62)" }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="link-child-title" aria-describedby="link-child-description" style={{ width: "min(100%, 520px)", maxHeight: "calc(100vh - 2rem)", overflowY: "auto", borderRadius: "1rem", background: "white", padding: "1.5rem", boxShadow: "0 24px 70px rgba(2,21,80,.28)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "start" }}>
        <div><p style={{ margin: 0, color: "#016EF8", fontWeight: 800, fontSize: "0.8rem" }}>CONSENT REQUIRED</p><h2 id="link-child-title" style={{ margin: "0.25rem 0", color: UI_COLORS.primary }}>Link a student account</h2></div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close link student dialog" style={{ width: 44, height: 44, display: "grid", placeItems: "center", border: "1px solid #dbe5f3", borderRadius: "0.65rem", background: "white", color: UI_COLORS.primary, cursor: "pointer" }}><X aria-hidden="true" size={20} /></button>
      </div>
      <p id="link-child-description" style={{ color: "#475569", lineHeight: 1.55 }}>The student must approve access using a code sent to their registered email. TUTORERA never links accounts from a shared user ID alone.</p>
      {error && <div role="alert" style={{ padding: "0.75rem", marginBottom: "1rem", border: "1px solid #fecaca", borderRadius: "0.55rem", background: "#fef2f2", color: "#b91c1c" }}>{error}</div>}

      {!requestId ? <form onSubmit={requestConsent} style={{ display: "grid", gap: "1rem" }}>
        <div><label htmlFor="student-link-email" style={labelStyle}>Student’s registered email</label><input id="student-link-email" type="email" autoComplete="email" required value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} style={inputStyle} /></div>
        <div><label htmlFor="student-link-name" style={labelStyle}>Student name</label><input id="student-link-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem" }}><div><label htmlFor="student-link-level" style={labelStyle}>Education level</label><input id="student-link-level" maxLength={100} value={level} onChange={(event) => setLevel(event.target.value)} style={inputStyle} /></div><div><label htmlFor="student-link-relationship" style={labelStyle}>Relationship</label><select id="student-link-relationship" value={relationship} onChange={(event) => setRelationship(event.target.value)} style={inputStyle}><option value="child">Child</option><option value="sibling">Sibling</option><option value="other">Other</option></select></div></div>
        <div><label htmlFor="student-link-subjects" style={labelStyle}>Subjects, separated by commas</label><input id="student-link-subjects" value={subjects} onChange={(event) => setSubjects(event.target.value)} style={inputStyle} /></div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "start", padding: "0.75rem", background: "#eef5ff", borderRadius: "0.6rem", color: UI_COLORS.primary }}><ShieldCheck aria-hidden="true" size={20} /><span style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>Access begins only after the student shares the email code with you.</span></div>
        <button type="submit" disabled={loading} style={{ minHeight: 46, border: 0, borderRadius: "0.6rem", background: "#0329B2", color: "white", fontWeight: 800, cursor: loading ? "wait" : "pointer" }}>{loading ? "Sending code…" : "Request student consent"}</button>
      </form> : <form onSubmit={confirmConsent} style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.65rem", color: UI_COLORS.primary }}><MailCheck aria-hidden="true" size={24} /><div><strong>Code sent</strong><p style={{ margin: "0.2rem 0", color: "#475569", lineHeight: 1.5 }}>Ask the student for the six-digit code. It expires after 15 minutes.</p></div></div>
        <div><label htmlFor="student-link-code" style={labelStyle}>Verification code</label><input id="student-link-code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} style={{ ...inputStyle, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "0.3em", textAlign: "center" }} /></div>
        <button type="submit" disabled={loading || code.length !== 6} style={{ minHeight: 46, border: 0, borderRadius: "0.6rem", background: "#0329B2", color: "white", fontWeight: 800, cursor: loading ? "wait" : "pointer" }}>{loading ? "Confirming…" : "Confirm and link account"}</button>
        <button type="button" onClick={() => { setRequestId(""); setCode(""); setError(""); }} style={{ minHeight: 44, border: "1px solid #cbd5e1", borderRadius: "0.6rem", background: "white", color: UI_COLORS.primary, fontWeight: 700, cursor: "pointer" }}>Use a different email</button>
      </form>}
    </section>
  </div>;
}
