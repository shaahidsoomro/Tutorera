"use client";

import api from "@/lib/axios";
import { Banknote,CheckCircle2,Clock3,RefreshCw,TriangleAlert } from "lucide-react";
import { useCallback,useEffect,useState } from "react";
import styles from "./PayoutTimeline.module.css";

type Payout = {
  _id: string; studentName: string; subject: string; currency: string;
  tutorPayout: number; payoutStatus: string; payoutNote?: string;
  createdAt: string; payoutRequestedAt?: string; payoutApprovedAt?: string;
  payoutProcessingAt?: string; payoutPaidAt?: string; payoutFailedAt?: string;
};

type Response = { stats: { pendingAmount: number; paidAmount: number }; payouts: Payout[] };
const statuses = ["all", "pending", "approved", "processing", "paid", "failed", "held"];
const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;
const date = (value?: string) => value ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : null;

export default function PayoutTimeline() {
  const [status, setStatus] = useState("all");
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData((await api.get(`/earnings/payouts?status=${status}&limit=10`)).data); }
    catch { setError("Payout history could not be loaded."); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const request = async (id: string) => {
    setRequesting(id); setError("");
    try { await api.post(`/earnings/payouts/${id}/request`); await load(); }
    catch (err: any) { setError(err?.response?.data?.message || "Payout request could not be submitted."); }
    finally { setRequesting(null); }
  };

  return <section className={styles.panel} aria-labelledby="payout-history-title">
    <div className={styles.heading}>
      <div><h2 id="payout-history-title">Payout tracking</h2><p>Verified settlement states for your completed lessons.</p></div>
      <button className={styles.refresh} onClick={() => void load()} disabled={loading}><RefreshCw size={17} aria-hidden="true" /> Refresh</button>
    </div>
    {data && <div className={styles.summary}>
      <div><Clock3 aria-hidden="true" /><span>Awaiting settlement</span><strong>{money(data.stats.pendingAmount)}</strong></div>
      <div><CheckCircle2 aria-hidden="true" /><span>Paid</span><strong>{money(data.stats.paidAmount)}</strong></div>
    </div>}
    <label className={styles.filter}>Payout status<select value={status} onChange={e => setStatus(e.target.value)}>{statuses.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
    {error && <div className={styles.error} role="alert"><TriangleAlert size={18} aria-hidden="true" /><span>{error}</span><button onClick={() => void load()}>Try again</button></div>}
    {loading ? <div className={styles.skeleton} aria-label="Loading payout history"><span /><span /></div>
      : !data?.payouts.length ? <div className={styles.empty}><Banknote aria-hidden="true" /><h3>No payouts in this view</h3><p>Completed, paid lessons will appear here.</p></div>
      : <div className={styles.list}>{data.payouts.map(payout => {
        const steps = [
          { label: "Eligible", value: payout.createdAt },
          { label: "Requested", value: payout.payoutRequestedAt },
          { label: "Approved", value: payout.payoutApprovedAt },
          { label: "Processing", value: payout.payoutProcessingAt },
          { label: payout.payoutStatus === "failed" ? "Failed" : "Paid", value: payout.payoutStatus === "failed" ? payout.payoutFailedAt : payout.payoutPaidAt },
        ];
        return <article className={styles.card} key={payout._id}>
          <div className={styles.cardTop}><div><h3>{payout.subject}</h3><p>{payout.studentName}</p></div><div className={styles.amount}><strong>{money(payout.tutorPayout)}</strong><span data-status={payout.payoutStatus}>{payout.payoutStatus.replace("_", " ")}</span></div></div>
          <ol className={styles.timeline} aria-label={`Payout timeline for ${payout.subject}`}>{steps.map(step => <li className={step.value ? styles.complete : ""} key={step.label}><i aria-hidden="true" /><b>{step.label}</b><small>{date(step.value) || "Not reached"}</small></li>)}</ol>
          {payout.payoutNote && <p className={styles.note}>{payout.payoutNote}</p>}
          {payout.payoutStatus === "pending" && <button className={styles.request} onClick={() => void request(payout._id)} disabled={requesting === payout._id}>{requesting === payout._id ? "Submitting…" : "Request payout"}</button>}
          {payout.payoutStatus === "processing" && <p className={styles.disclosure}>A settlement reference and arrival estimate will appear only after the payment provider confirms them.</p>}
        </article>;
      })}</div>}
  </section>;
}
