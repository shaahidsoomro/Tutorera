"use client";

import api from "@/lib/axios";
import { VerificationComponents } from "@/types/tracking";
import { CheckCircle2,FileCheck2,Upload,X } from "lucide-react";
import { useRef,useState } from "react";
import s from "./DocumentResubmitPanel.module.css";

interface Props {
  components: VerificationComponents;
  policeRequired: boolean;
  onResubmitted?: () => void;
}

interface DocConfig {
  key: "cnicFront" | "cnicBack" | "degree" | "videoIntro" | "policeCertificate";
  label: string;
  hint: string;
  accept: string;
  componentKey: keyof VerificationComponents;
}

const DOC_CONFIGS: DocConfig[] = [
  { key: "cnicFront", label: "CNIC (Front Side)", hint: "Clear photo or scan of the front of your national ID — PDF, JPG, PNG", accept: ".pdf,.jpg,.jpeg,.png", componentKey: "cnic" },
  { key: "cnicBack", label: "CNIC (Back Side)", hint: "Clear photo or scan of the back of your national ID — PDF, JPG, PNG", accept: ".pdf,.jpg,.jpeg,.png", componentKey: "cnic" },
  { key: "degree", label: "Degree / Educational Document", hint: "Scan of your highest degree certificate — PDF, JPG, PNG", accept: ".pdf,.jpg,.jpeg,.png", componentKey: "degree" },
  { key: "videoIntro", label: "Demo Teaching Video", hint: "Re-record your 2-5 minute demo video in a well-lit environment — MP4 only", accept: ".mp4", componentKey: "demoVideo" },
  { key: "policeCertificate", label: "Police Verification Certificate", hint: "Fresh police character certificate (required for home/in-person tuition) — PDF, JPG, PNG", accept: ".pdf,.jpg,.jpeg,.png", componentKey: "police" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <span className={`${s.badge} ${s.badgeApproved}`}>Approved</span>;
  if (status === "rejected") return <span className={`${s.badge} ${s.badgeRejected}`}>Rejected — Action Required</span>;
  if (status === "pending") return <span className={`${s.badge} ${s.badgePending}`}>Under review</span>;
  if (status === "not_required") return <span className={`${s.badge} ${s.badgeNeutral}`}>Not required</span>;
  return <span className={`${s.badge} ${s.badgeNeutral}`}>Not submitted</span>;
}

export function DocumentResubmitPanel({ components, policeRequired, onResubmitted }: Props) {
  const [files, setFiles] = useState<Partial<Record<DocConfig["key"], File>>>({});
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Partial<Record<DocConfig["key"], HTMLInputElement | null>>>({});

  const visibleDocs = DOC_CONFIGS.filter((d) => {
    if (d.componentKey === "police" && !policeRequired) return false;
    const comp = components[d.componentKey];
    if (comp.status === "approved") return false;
    if (comp.status === "not_required") return false;
    return true;
  });

  if (visibleDocs.length === 0) {
    return (
      <div className={s.allClear}>
        <div className={s.allClearIcon}><CheckCircle2 aria-hidden="true" /></div>
        <p>All documents are submitted and under review or approved. No action needed right now.</p>
      </div>
    );
  }

  function onFileChange(key: DocConfig["key"], file: File | undefined) {
    setFiles((prev) => { const n = { ...prev }; if (file) n[key] = file; else delete n[key]; return n; });
    setSuccess(null); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(files).length === 0) { setError("Please select at least one file to resubmit."); return; }
    setUploading(true); setError(null); setSuccess(null);
    try {
      const form = new FormData();
      for (const [key, file] of Object.entries(files)) form.append(key, file as File);
      const res = await api.post("/upload/resubmit", form);
      if (res.data.success) {
        setSuccess("Documents submitted. Our team will review within 24-48 hours.");
        setFiles({});
        Object.values(inputRefs.current).forEach((ref) => { if (ref) ref.value = ""; });
        onResubmitted?.();
      } else { setError(res.data.message || "Upload failed. Please try again."); }
    } catch (err: any) { setError(err?.response?.data?.message || "An error occurred during upload."); }
    finally { setUploading(false); }
  }

  const selectedCount = Object.keys(files).length;

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <h2 className={s.panelTitle}>Resubmit Verification Documents</h2>
        <p className={s.panelSubtitle}>Upload corrected files below. Our team will review within <strong>24-48 hours</strong>. You can resubmit individual documents — you do not need to upload everything at once.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className={s.docList}>
          {visibleDocs.map((doc) => {
            const comp = components[doc.componentKey];
            const isRejected = comp.status === "rejected";
            const selectedFile = files[doc.key];
            return (
              <div key={doc.key} className={`${s.docRow} ${isRejected ? s.docRowRejected : s.docRowPending}`}>
                <div className={s.docInfo}>
                  <div className={s.docLabelRow}>
                    <span className={s.docLabel}>{doc.label}</span>
                    <StatusBadge status={comp.status} />
                  </div>
                  {isRejected && comp.rejectionReason && (
                    <div className={s.rejectionBox}>
                      <strong>Admin feedback:</strong> {comp.rejectionReason}
                    </div>
                  )}
                  <p className={s.docHint}>{doc.hint}</p>
                  {comp.reviewedAt && <p className={s.reviewedAt}>Last reviewed: {new Date(comp.reviewedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</p>}
                </div>
                <div className={s.docUpload}>
                  <input
                    ref={(el) => { inputRefs.current[doc.key] = el; }}
                    id={`resubmit-${doc.key}`} type="file" accept={doc.accept}
                    className={s.fileInput}
                    onChange={(e) => onFileChange(doc.key, e.target.files?.[0] ?? undefined)}
                    disabled={uploading}
                  />
                  <label htmlFor={`resubmit-${doc.key}`} className={`${s.fileLabel} ${selectedFile ? s.fileLabelActive : ""}`}>
                    {selectedFile ? (
                      <><span><FileCheck2 aria-hidden="true" size={16} /> {selectedFile.name}</span><button type="button" className={s.clearBtn} onClick={(e) => { e.preventDefault(); onFileChange(doc.key, undefined); if (inputRefs.current[doc.key]) inputRefs.current[doc.key]!.value = ""; }}><X aria-hidden="true" size={15} /> Remove</button></>
                    ) : (
                      <span><Upload aria-hidden="true" size={16} /> Choose file</span>
                    )}
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        {error && <div className={s.errorMsg} role="alert">{error}</div>}
        {success && <div className={s.successMsg} role="status">{success}</div>}
        <div className={s.submitRow}>
          <p className={s.submitHint}>{selectedCount === 0 ? "Select files above to submit." : `${selectedCount} file${selectedCount !== 1 ? "s" : ""} selected.`}</p>
          <button id="resubmit-submit-btn" type="submit" className={s.submitBtn} disabled={uploading || selectedCount === 0}>
            {uploading ? "Uploading..." : `Submit ${selectedCount > 0 ? `(${selectedCount}) ` : ""}Document${selectedCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </form>
    </div>
  );
}
