"use client";

import { Check,Share2 } from "lucide-react";
import { useState } from "react";

interface ShareProfileButtonProps {
  tutorName: string;
}

export default function ShareProfileButton({ tutorName }: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window === "undefined") return;

    const url = window.location.href;
    const shareData = {
      title: `${tutorName} - Verified Tutor on TUTORERA`,
      text: `Check out ${tutorName}'s profile on TUTORERA - verified educator with transparent rates and student reviews.`,
      url,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard if user dismissed or native share failed
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      onClick={handleShare}
      type="button"
      aria-label="Share Tutor Profile"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.45rem 0.9rem",
        borderRadius: 999,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.22)",
        color: "#ffffff",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.22)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
      }}
    >
      {copied ? (
        <>
          <Check size={14} color="#86efac" />
          <span style={{ color: "#86efac" }}>Link Copied!</span>
        </>
      ) : (
        <>
          <Share2 size={14} />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
