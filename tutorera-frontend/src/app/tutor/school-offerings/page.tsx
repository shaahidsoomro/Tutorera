"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Offering = {
  _id: string;
  boardName: string;
  boardCode: string;
  qualificationName: string;
  classLevel?: string;
  subjectDisplay: string;
  subject: string;
};

const inp: React.CSSProperties = {
  display: "block", width: "100%", borderRadius: "0.5rem",
  border: `1px solid ${UI_COLORS.border}`, padding: "0.5rem 0.75rem",
  fontSize: "0.875rem", color: TEXT_COLORS.body, backgroundColor: UI_COLORS.surface,
  boxSizing: "border-box",
};
const lbl: React.CSSProperties = { display: "block", fontSize: "0.82rem", fontWeight: 700, color: TEXT_COLORS.secondary, marginBottom: "0.35rem" };

export default function SchoolPreferences() {
  const [items, setItems] = useState<Offering[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [board, setBoard] = useState("");
  const [qualification, setQualification] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/geo/school-offerings"),
      api.get("/tutors/school-offerings/me"),
    ])
      .then(([catalogue, profile]) => {
        setItems(catalogue.data.offerings || []);
        setIds(profile.data.schoolOfferingIds || []);
        setSubjects(profile.data.subjects || []);
      })
      .catch(() => { setMessage("Could not load teaching preferences. Complete your tutor profile and try again."); setMessageType("error"); });
  }, []);

  const boards = useMemo(() => [...new Set(items.map((o) => o.boardName))].sort(), [items]);
  const qualifications = useMemo(() => [...new Set(items.filter((o) => o.boardName === board).map((o) => o.qualificationName))].sort(), [items, board]);
  const classes = useMemo(() => [...new Set(items.filter((o) => o.boardName === board && o.qualificationName === qualification && o.classLevel).map((o) => o.classLevel!))].sort(), [items, board, qualification]);
  const subjectOptions = useMemo(() => [...new Set(items.filter((o) => o.boardName === board && o.qualificationName === qualification && (!o.classLevel || o.classLevel === classLevel)).map((o) => o.subjectDisplay))].sort(), [items, board, qualification, classLevel]);

  const selected = useMemo(() => items.find((o) =>
    o.boardName === board &&
    o.qualificationName === qualification &&
    (!o.classLevel || o.classLevel === classLevel) &&
    o.subjectDisplay === subject
  ), [items, board, qualification, classLevel, subject]);

  function addSelected() {
    if (!selected || ids.includes(selected._id)) return;
    setIds([...ids, selected._id]);
    setSubject("");
  }

  const save = async () => {
    setBusy(true); setMessage("");
    try {
      await api.put("/tutors/school-offerings/me", { schoolOfferingIds: ids });
      setMessage("Saved. Each subject and level still requires admin approval before you can receive matching requests.");
      setMessageType("success");
    } catch {
      setMessage("Could not save. Check that each selected subject is on your tutor profile, then try again.");
      setMessageType("error");
    } finally { setBusy(false); }
  };

  const msgColor = messageType === "success" ? STATUS_COLORS.success : messageType === "error" ? STATUS_COLORS.danger : { bg: "#eff6ff", color: "#1d4ed8" };

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "2.5rem 1rem" }}>
      <Link
        href="/dashboard"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: TEXT_COLORS.muted, textDecoration: "none", fontSize: "0.82rem", fontWeight: 700, marginBottom: "1.25rem" }}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back to dashboard
      </Link>

      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: TEXT_COLORS.body, margin: "0 0 0.5rem" }}>School teaching preferences</h1>
      <p style={{ color: TEXT_COLORS.secondary, fontSize: "0.9rem", margin: "0 0 0.4rem", lineHeight: 1.6 }}>
        Choose every board, qualification, class and subject you teach. Add subjects to your tutor profile first — preferences do not replace eligibility approval.
      </p>
      <p style={{ fontSize: "0.82rem", color: TEXT_COLORS.muted, margin: "0 0 1.5rem" }}>
        Subjects on your profile: <strong style={{ color: TEXT_COLORS.secondary }}>{subjects.join(", ") || "None yet"}</strong>
      </p>

      {/* Add offering card */}
      <div style={{ borderRadius: "0.75rem", border: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.surface, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: TEXT_COLORS.body, margin: "0 0 1rem" }}>Add a teaching offering</h2>

        <div style={{ display: "grid", gap: "1rem" }}>
          <label style={lbl}>
            Board
            <select
              style={inp}
              value={board}
              onChange={(e) => { setBoard(e.target.value); setQualification(""); setClassLevel(""); setSubject(""); }}
              aria-label="Select board"
            >
              <option value="">Select board…</option>
              {boards.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          {board && (
            <label style={lbl}>
              Qualification
              <select
                style={inp}
                value={qualification}
                onChange={(e) => { setQualification(e.target.value); setClassLevel(""); setSubject(""); }}
                aria-label="Select qualification"
              >
                <option value="">Select qualification…</option>
                {qualifications.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </label>
          )}

          {qualification && classes.length > 0 && (
            <label style={lbl}>
              Class / Year
              <select
                style={inp}
                value={classLevel}
                onChange={(e) => { setClassLevel(e.target.value); setSubject(""); }}
                aria-label="Select class or year"
              >
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}

          {qualification && (classes.length === 0 || classLevel) && (
            <label style={lbl}>
              Subject
              <select
                style={inp}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Select subject"
              >
                <option value="">Select subject…</option>
                {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}

          <button
            type="button"
            disabled={!selected || ids.includes(selected._id)}
            onClick={addSelected}
            style={{
              alignSelf: "flex-start", padding: "0.55rem 1.1rem", minHeight: 44,
              borderRadius: "0.5rem", border: "none",
              backgroundColor: !selected || ids.includes(selected._id) ? UI_COLORS.border : UI_COLORS.accent,
              color: "white", fontWeight: 700, fontSize: "0.875rem",
              cursor: !selected || ids.includes(selected._id) ? "not-allowed" : "pointer",
              opacity: !selected || ids.includes(selected._id) ? 0.6 : 1,
            }}
          >
            Add to my list
          </button>
        </div>
      </div>

      {/* Selected offerings */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: TEXT_COLORS.body, margin: "0 0 0.75rem" }}>
          Selected offerings{ids.length > 0 && <span style={{ marginLeft: "0.5rem", fontSize: "0.82rem", fontWeight: 600, color: TEXT_COLORS.muted }}>({ids.length})</span>}
        </h2>
        {ids.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ids.map((id) => {
              const x = items.find((o) => o._id === id);
              return (
                <li key={id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", borderRadius: "0.5rem", border: `1px solid ${UI_COLORS.border}`, backgroundColor: UI_COLORS.surface, padding: "0.6rem 0.9rem" }}>
                  <span style={{ fontSize: "0.875rem", color: TEXT_COLORS.body }}>
                    {x ? `${x.boardName} · ${x.qualificationName}${x.classLevel ? ` · ${x.classLevel}` : ""} · ${x.subjectDisplay}` : "Unavailable offering"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIds(ids.filter((i) => i !== id))}
                    style={{ background: "none", border: "none", color: STATUS_COLORS.danger.color, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", padding: "0.25rem 0.5rem", minHeight: 36 }}
                    aria-label={`Remove ${x?.subjectDisplay ?? "offering"}`}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={{ fontSize: "0.875rem", color: TEXT_COLORS.muted }}>No offerings selected yet.</p>
        )}
      </div>

      {message && (
        <p
          role="status"
          style={{ fontSize: "0.875rem", padding: "0.6rem 0.9rem", borderRadius: "0.5rem", border: `1px solid ${msgColor.color}20`, backgroundColor: msgColor.bg, color: msgColor.color, marginBottom: "1rem" }}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={busy || ids.length === 0}
        onClick={save}
        style={{
          padding: "0.65rem 1.5rem", minHeight: 44, borderRadius: "0.5rem", border: "none",
          backgroundColor: UI_COLORS.accent, color: "white", fontWeight: 700, fontSize: "0.9rem",
          cursor: busy || ids.length === 0 ? "not-allowed" : "pointer",
          opacity: busy || ids.length === 0 ? 0.6 : 1,
        }}
      >
        {busy ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}
