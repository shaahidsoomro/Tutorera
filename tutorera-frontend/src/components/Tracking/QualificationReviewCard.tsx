"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import styles from "./qualificationReview.module.css";

export interface ReviewedQualification {
  degree: string;
  institution: string;
  year: number;
  discipline?: string;
  degreeDoc?: string;
  verificationStatus?: "pending" | "approved" | "rejected";
  verifiedDegreeLevel?: string;
  reviewedAt?: string;
  reviewReason?: string;
}

export interface QualificationDecision {
  status: "approved" | "rejected" | "pending";
  reason: string;
  verifiedDegreeLevel?: string;
}

export default function QualificationReviewCard({ qualification, index, onReview, onViewDocument }: {
  qualification: ReviewedQualification;
  index: number;
  onReview?: (index: number, decision: QualificationDecision) => Promise<void>;
  onViewDocument?: (index: number) => Promise<void>;
}) {
  const id = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [level, setLevel] = useState(qualification.verifiedDegreeLevel || "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const status = qualification.verificationStatus || "pending";
  const complete = Boolean(qualification.degree && qualification.institution && qualification.degreeDoc);

  async function review(nextStatus: QualificationDecision["status"]) {
    if (!onReview || busy) return;
    setError(""); setFeedback("");
    if (nextStatus === "rejected" && !reason.trim()) {
      setError("Explain what is wrong with this qualification and what the tutor must correct.");
      reasonRef.current?.focus();
      return;
    }
    if (nextStatus === "approved" && (!complete || !level)) {
      setError("Review the uploaded credential and select its verified degree level before approval.");
      return;
    }
    setBusy(true);
    try {
      await onReview(index, { status: nextStatus, reason: reason.trim(), verifiedDegreeLevel: nextStatus === "approved" ? level : undefined });
      setReason("");
      setFeedback(`Qualification ${index + 1} ${nextStatus === "pending" ? "returned to review" : nextStatus}.`);
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : "Unable to save this decision. Please retry.");
    } finally { setBusy(false); }
  }

  return (
    <article className={styles.card} aria-labelledby={`${id}-title`} aria-busy={busy}>
      <div className={styles.heading}>
        <h3 id={`${id}-title`}>Qualification {index + 1}: {qualification.degree || "Incomplete credential"}</h3>
        <span className={styles.status} data-status={status}>{status}</span>
      </div>
      <dl className={styles.details}>
        <div><dt>Institution</dt><dd>{qualification.institution || "Not provided"}</dd></div>
        <div><dt>Year</dt><dd>{qualification.year || "Not provided"}</dd></div>
        <div><dt>Discipline</dt><dd>{qualification.discipline || "Not provided"}</dd></div>
        <div><dt>Document</dt><dd>{qualification.degreeDoc ? "Uploaded" : "Missing — mandatory"}</dd></div>
        <div><dt>Verified degree level</dt><dd>{qualification.verifiedDegreeLevel || "Not verified"}</dd></div>
        {qualification.reviewedAt && <div><dt>Last reviewed</dt><dd>{new Date(qualification.reviewedAt).toLocaleString()}</dd></div>}
      </dl>
      {qualification.reviewReason && <p className={styles.reason}><strong>Reviewer feedback:</strong> {qualification.reviewReason}</p>}
      {!onReview && status !== "approved" && <Link href="/onboarding/tutor?step=2" className={styles.link}>Update education and documents</Link>}
      {onReview && (
        <fieldset className={styles.controls} disabled={busy}>
          <legend>Review this qualification</legend>
          {onViewDocument && <button type="button" disabled={!qualification.degreeDoc} className={styles.view} onClick={async () => {
            setError("");
            try { await onViewDocument(index); } catch (failure: unknown) { setError(failure instanceof Error ? failure.message : "Unable to open this document."); }
          }}>View qualification {index + 1} document</button>}
          <label htmlFor={`${id}-level`}>Verified degree level — required for approval</label>
          <select id={`${id}-level`} value={level} onChange={(event) => setLevel(event.target.value)} aria-describedby={`${id}-help`}>
            <option value="">Choose the level shown by the credential</option>
            <option value="secondary">Secondary</option><option value="diploma">Diploma</option>
            <option value="bachelors">Bachelor’s</option><option value="masters">Master’s</option><option value="doctorate">Doctorate</option>
          </select>
          <p id={`${id}-help`} className={styles.help}>Confirm the uploaded credential before selecting a level. Approving also approves the tutor's directly-eligible subjects at their declared levels. Subjects outside this qualification stay pending for manual review.</p>
          <label htmlFor={`${id}-reason`}>Review reason — mandatory when rejecting</label>
          <textarea id={`${id}-reason`} ref={reasonRef} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} aria-describedby={error ? `${id}-error` : undefined} />
          <div className={styles.actions}>
            <button type="button" onClick={() => review("approved")} disabled={!complete}>Approve qualification</button>
            <button type="button" className={styles.reject} onClick={() => review("rejected")}>Reject qualification</button>
            <button type="button" className={styles.secondary} onClick={() => review("pending")}>Return to pending</button>
          </div>
        </fieldset>
      )}
      {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
      <p className={styles.help} role="status">{busy ? "Saving review…" : feedback}</p>
    </article>
  );
}
