"use client";

import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import { useState } from "react";
import s from "./tracking.module.css";

export function TrackingUrlBlock({ applicationId, token, basePath = "/track/tutor" }: { applicationId: string; token?: string; basePath?: string }) {
  const [tokenState, setTokenState] = useState(token);
  const [rotating, setRotating] = useState(false);
  const url = tokenState ? `${typeof window !== "undefined" ? window.location.origin : "https://tutorera.ac.pk"}${basePath}/${tokenState}` : `${basePath}/[secure-token]`;

  const handleCopy = async () => {
    if (!tokenState) return;
    try {
      await navigator.clipboard.writeText(url);
      showSuccess("Tracking link copied");
    } catch {
      showError("Copy failed. Please copy the link manually.");
    }
  };

  const handleRotate = async () => {
    setRotating(true);
    try {
      const { data } = await api.post("/tracking/application-status/rotate-token");
      setTokenState(data.trackingToken);
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${basePath}/${data.trackingToken}`);
        showSuccess("New tracking link copied. The previous link no longer works.");
      } catch {
        showSuccess("New tracking link generated. Save it now — it won't be shown again.");
      }
    } catch (err) {
      showError(err, "Failed to rotate tracking link");
    } finally {
      setRotating(false);
    }
  };

  return (
    <div>
      <p className={s.cardSub}>
        Share this secure link with anyone who needs to view your application status. It uses a cryptographic token that never exposes your personal data.
      </p>
      <div className={s.copyBox}>
        <input readOnly value={url} aria-label="Tracking URL" />
        {tokenState ? (
          <button type="button" onClick={handleCopy}>Copy</button>
        ) : null}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
        Application ID: <strong style={{ color: "#1f2937" }}>{applicationId}</strong>
      </p>
      {tokenState && (
        <button type="button" onClick={handleRotate} disabled={rotating} className={s.ctaButton} style={{ marginTop: 12 }}>
          {rotating ? "Rotating…" : "Rotate tracking link"}
        </button>
      )}
    </div>
  );
}
