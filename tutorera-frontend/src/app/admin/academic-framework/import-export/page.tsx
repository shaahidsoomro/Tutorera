"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, FileUp, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import api from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import { UI_COLORS, STATUS_COLORS, TEXT_COLORS } from "@/lib/brand";

type Dataset = "categories" | "subjects" | "disciplines" | "eligibility-rules";
const datasets: { value: Dataset; label: string; help: string }[] = [
  { value: "categories", label: "Subject categories", help: "Stable category codes such as CAT-STEM." },
  { value: "subjects", label: "Subjects", help: "Subject codes reference a category code, never an internal ID." },
  { value: "disciplines", label: "Academic disciplines", help: "Qualification disciplines such as DISC-MATH." },
  { value: "eligibility-rules", label: "Teaching eligibility", help: "Discipline-to-subject direct or conditional rules." },
];

export default function AcademicImportExportPage() {
  const [dataset, setDataset] = useState<Dataset>("categories");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [commitConfirm, setCommitConfirm] = useState(false);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/admin/academic-framework/import-export/history");
      setHistory(data.jobs || []);
    } catch { /* history is supplementary */ }
  };

  useEffect(() => { void loadHistory(); }, []);

  const form = () => { const data = new FormData(); if (file) data.append("file", file); return data; };

  const dryRun = async () => {
    if (!file) return showError("Choose a CSV file first");
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/academic-framework/import-export/dry-run/${dataset}`, form());
      setPreview(data);
      setCommitConfirm(false);
      data.errors?.length ? showError("The preview found validation errors") : showSuccess("CSV validated. Review the preview before committing.");
    } catch (error) {
      showError(error, "Could not validate this CSV");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!file || !preview || preview.errors?.length) return;
    setBusy(true);
    setCommitConfirm(false);
    try {
      const { data } = await api.post(`/admin/academic-framework/import-export/commit/${dataset}`, form());
      showSuccess(`Import complete: ${data.created} created, ${data.updated} updated.`);
      setPreview(null);
      setFile(null);
      await loadHistory();
    } catch (error) {
      showError(error, "The import could not be committed");
    } finally {
      setBusy(false);
    }
  };

  const download = async (kind: "templates" | "export") => {
    try {
      const response = await api.get(`/admin/academic-framework/import-export/${kind}/${dataset}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${dataset}-${kind}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showError(error, "Could not download CSV");
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    if (next && !next.name.toLowerCase().endsWith(".csv")) { showError("Upload a .csv file"); return; }
    setFile(next);
    setPreview(null);
    setCommitConfirm(false);
  };

  const inp: React.CSSProperties = { marginTop:"0.25rem", width:"100%", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.border}`, padding:"0.5rem 0.6rem", fontSize:"0.875rem", boxSizing:"border-box" };

  return (
    <div style={{ padding:"1.75rem 2rem" }}>
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.4rem" }}>
        <Link href="/admin" style={{ color:TEXT_COLORS.muted, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"0.3rem", fontSize:"0.82rem", fontWeight:700 }}>
          <ArrowLeft size={14} /> Control Tower
        </Link>
        <span style={{ color:UI_COLORS.border }}>/</span>
        <Link href="/admin/academic-framework" style={{ color:TEXT_COLORS.muted, textDecoration:"none", fontSize:"0.82rem", fontWeight:700 }}>Academic Framework</Link>
        <span style={{ color:UI_COLORS.border }}>/</span>
        <span style={{ fontSize:"0.82rem", fontWeight:700, color:STATUS_COLORS.purple.color }}>Import &amp; Export</span>
      </div>

      <h1 style={{ fontSize:"1.5rem", fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 0.25rem" }}>Import &amp; Export</h1>
      <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", margin:"0 0 1.5rem" }}>
        Validate a code-based CSV before committing it. Imports never require or expose MongoDB IDs.
      </p>

      <div style={{ display:"grid", gap:"1.25rem", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))" }}>
        {/* Upload panel */}
        <section style={{ borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, padding:"1.25rem" }}>
          <label style={{ fontSize:"0.8rem", fontWeight:700, color:TEXT_COLORS.secondary, display:"block" }} htmlFor="dataset">
            Dataset
            <select id="dataset" value={dataset} onChange={e => { setDataset(e.target.value as Dataset); setPreview(null); setCommitConfirm(false); }} style={inp}>
              {datasets.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <p style={{ fontSize:"0.78rem", color:TEXT_COLORS.muted, marginTop:"0.4rem" }}>{datasets.find(item => item.value === dataset)?.help}</p>

          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", marginTop:"1rem" }}>
            <button onClick={() => void download("templates")} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.45rem 0.75rem", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.accentLight}`, background:"white", color:UI_COLORS.accent, fontWeight:700, fontSize:"0.8rem", cursor:"pointer", minHeight:40 }}>
              <Download size={14} aria-hidden="true" /> Template
            </button>
            <button onClick={() => void download("export")} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.45rem 0.75rem", borderRadius:"0.4rem", border:`1px solid ${UI_COLORS.border}`, background:"white", color:TEXT_COLORS.secondary, fontWeight:700, fontSize:"0.8rem", cursor:"pointer", minHeight:40 }}>
              <Download size={14} aria-hidden="true" /> Export
            </button>
          </div>

          <label
            htmlFor="csv-file"
            style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginTop:"1rem", padding:"1.5rem 1rem", borderRadius:"0.5rem", border:`2px dashed ${UI_COLORS.border}`, cursor:"pointer", textAlign:"center" }}
          >
            <FileUp size={28} color={UI_COLORS.accent} aria-hidden="true" />
            <span style={{ marginTop:"0.5rem", fontWeight:700, color:TEXT_COLORS.body, fontSize:"0.875rem" }}>{file?.name || "Choose a CSV file"}</span>
            <span style={{ fontSize:"0.72rem", color:TEXT_COLORS.muted, marginTop:"0.25rem" }}>Maximum 2 MB</span>
            <input id="csv-file" style={{ position:"absolute", left:"-9999px" }} type="file" accept=".csv,text/csv" onChange={onFile} />
          </label>

          <button
            disabled={!file || busy}
            onClick={() => void dryRun()}
            style={{ display:"inline-flex", width:"100%", alignItems:"center", justifyContent:"center", gap:"0.4rem", marginTop:"0.75rem", padding:"0.65rem 1rem", borderRadius:"0.4rem", background:UI_COLORS.accent, color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44, opacity:(!file||busy)?0.5:1 }}
          >
            {busy ? <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
            Validate CSV
          </button>
        </section>

        {/* History panel */}
        <section style={{ borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, padding:"1.25rem" }}>
          <h2 style={{ fontWeight:800, color:TEXT_COLORS.body, fontSize:"0.9rem", margin:"0 0 0.75rem" }}>Import history</h2>
          {history.length ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {history.slice(0, 6).map(job => (
                <div key={job._id} style={{ display:"flex", justifyContent:"space-between", gap:"0.5rem", borderBottom:`1px solid ${UI_COLORS.border}`, paddingBottom:"0.5rem", fontSize:"0.82rem" }}>
                  <div>
                    <p style={{ fontWeight:700, color:TEXT_COLORS.body, margin:0 }}>{job.dataset}</p>
                    <p style={{ color:TEXT_COLORS.muted, margin:"0.1rem 0 0", fontSize:"0.75rem" }}>{job.filename || "CSV import"} · {new Date(job.createdAt).toLocaleString()}</p>
                  </div>
                  <span style={{ padding:"0.15rem 0.5rem", borderRadius:"999px", fontSize:"0.72rem", fontWeight:700, backgroundColor:UI_COLORS.card, color:TEXT_COLORS.secondary, alignSelf:"flex-start", whiteSpace:"nowrap" }}>{job.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color:TEXT_COLORS.muted, fontSize:"0.85rem", padding:"1rem 0" }}>No academic imports recorded yet.</p>
          )}
        </section>
      </div>

      {/* Validation preview */}
      {preview && (
        <section style={{ marginTop:"1.25rem", borderRadius:"0.75rem", border:`1px solid ${UI_COLORS.border}`, backgroundColor:UI_COLORS.surface, padding:"1.25rem" }}>
          <h2 style={{ fontWeight:800, color:TEXT_COLORS.body, margin:"0 0 0.4rem" }}>Validation preview</h2>
          <p style={{ fontSize:"0.85rem", color:TEXT_COLORS.muted, margin:"0 0 1rem" }}>{preview.validRows} valid of {preview.totalRows} rows.</p>

          {preview.errors?.length > 0 ? (
            <div style={{ borderRadius:"0.4rem", background:"#fef2f2", border:"1px solid #fca5a5", padding:"0.9rem 1rem", fontSize:"0.85rem", color:"#991b1b" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", fontWeight:700, marginBottom:"0.5rem" }}>
                <AlertTriangle size={16} aria-hidden="true" /> Correct these errors before committing
              </div>
              <ul style={{ paddingLeft:"1.25rem", margin:0 }}>
                {preview.errors.map((error: any, i: number) => (
                  <li key={i}>Row {error.row}{error.field ? ` (${error.field})` : ""}: {error.message}</li>
                ))}
              </ul>
            </div>
          ) : commitConfirm ? (
            <div role="alert" style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.85rem", fontWeight:600, color:"#b45309" }}>Commit this validated CSV to the academic framework? Existing rows with matching codes will be updated.</span>
              <button onClick={() => void commit()} disabled={busy} style={{ padding:"0.45rem 0.9rem", borderRadius:4, border:"none", background:"#059669", color:"white", fontWeight:700, fontSize:"0.82rem", cursor:"pointer", minHeight:40, opacity:busy?0.6:1 }}>
                {busy ? "Committing…" : "Yes, commit"}
              </button>
              <button onClick={() => setCommitConfirm(false)} style={{ padding:"0.45rem 0.9rem", borderRadius:4, border:`1px solid ${UI_COLORS.border}`, background:"white", color:TEXT_COLORS.muted, fontWeight:700, fontSize:"0.82rem", cursor:"pointer", minHeight:40 }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setCommitConfirm(true)} style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.65rem 1rem", borderRadius:"0.4rem", background:"#059669", color:"#fff", fontWeight:700, fontSize:"0.875rem", border:"none", cursor:"pointer", minHeight:44 }}>
              <Upload size={16} aria-hidden="true" /> Commit validated import
            </button>
          )}
        </section>
      )}
    </div>
  );
}
