"use client";

import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import { CalendarDays,Download } from "lucide-react";
import { useMemo,useState } from "react";
import styles from "./PayoutReportDownload.module.css";

type Props = {
  endpoint: string;
  label?: string;
  compact?: boolean;
};

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function PayoutReportDownload({ endpoint, label = "Download payout PDF", compact = false }: Props) {
  const defaults = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 1);
    return { from: dateInputValue(from), to: dateInputValue(to) };
  }, []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!from || !to || from > to) {
      showError("Choose a valid report date range.");
      return;
    }
    setDownloading(true);
    try {
      const response = await api.get(endpoint, { params: { from, to }, responseType: "blob" });
      const disposition = String(response.headers["content-disposition"] || "");
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `tutorera-payout-report-${to}.pdf`;
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showSuccess("Verified payout report downloaded.");
    } catch (error) {
      const responseData = (error as { response?: { data?: unknown } })?.response?.data;
      if (responseData instanceof Blob && responseData.type.includes("json")) {
        try {
          const parsed = JSON.parse(await responseData.text()) as { message?: string };
          showError(parsed.message || "Unable to generate the payout report.");
        } catch {
          showError("Unable to generate the payout report.");
        }
      } else {
        showError(error, "Unable to generate the payout report.");
      }
    } finally {
      setDownloading(false);
    }
  }

  return <div className={`${styles.control} ${compact ? styles.compact : ""}`}>
    <div className={styles.range} aria-label="Payout report period">
      <CalendarDays aria-hidden="true" size={16} />
      <label><span>From</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
      <label><span>To</span><input type="date" value={to} min={from} max={dateInputValue(new Date())} onChange={(event) => setTo(event.target.value)} /></label>
    </div>
    <button type="button" onClick={() => void download()} disabled={downloading} aria-busy={downloading}>
      <Download aria-hidden="true" size={16} /> {downloading ? "Generating PDF…" : label}
    </button>
  </div>;
}
