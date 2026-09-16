"use client";
import Image from "next/image";
import MatchScoreBadge from "@/components/marketplace/MatchScoreBadge";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatPKR } from "@/lib/site";
import { DashBid } from "@/types/dashboard";
import Link from "next/link";
import React from "react";

interface OfferComparisonModalProps {
  offers: DashBid[];
  selected: string[];
  onClose: () => void;
  onAccept: (id: string) => void;
  acceptingId: string | null;
}

export default function OfferComparisonModal({
  offers,
  selected,
  onClose,
  onAccept,
  acceptingId,
}: OfferComparisonModalProps) {
  const modalRef = useFocusTrap(true, onClose);
  const selectedOffers = offers.filter((o) => selected.includes(o._id));

  const comparisonRows: {
    label: string;
    render: (bid: DashBid) => React.ReactNode;
  }[] = [
    {
      label: "Match Score",
      render: (bid) =>
        bid.matchScore ? (
          <MatchScoreBadge
            score={bid.matchScore}
            tier={bid.matchTier as any}
            reasons={bid.matchReasons}
            breakdown={bid.matchScoreBreakdown}
            showBreakdown={false}
          />
        ) : (
          <span style={{ color: "#9ca3af" }}>N/A</span>
        ),
    },
    {
      label: "Rate",
      render: (bid) => (
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>
          {formatPKR(bid.amount, bid.pricingUnit || "hour")}
        </span>
      ),
    },
    {
      label: "Rating",
      render: (bid) => (
        <span>
          {bid.profile?.isVerified ? (
            <span style={{ color: "#059669", fontWeight: 600 }}>✓ </span>
          ) : null}
          <strong>{bid.profile?.averageRating?.toFixed(1) || "New"}</strong>{" "}
          <span style={{ color: "#6b7280", fontSize: "0.85em" }}>
            ({bid.profile?.totalReviews || 0} reviews)
          </span>
        </span>
      ),
    },
    {
      label: "Experience",
      render: (bid) => (
        <span>
          {bid.profile?.experience || 0} years experience
        </span>
      ),
    },
    {
      label: "Sessions",
      render: (bid) => (
        <span>{bid.completedSessions || 0} completed</span>
      ),
    },
    {
      label: "Response Rate",
      render: (bid) => (
        <span>{bid.responseRate || 0}%</span>
      ),
    },
    {
      label: "Education",
      render: (bid) =>
        bid.profile?.education?.length ? (
          bid.profile.education.map((ed: any, i: number) => (
            <div key={i}>
              <strong>{ed.degree}</strong>
              {ed.institution ? ` — ${ed.institution}` : ""}
            </div>
          ))
        ) : (
          <span style={{ color: "#9ca3af" }}>Not listed</span>
        ),
    },
    {
      label: "Subjects",
      render: (bid) =>
        bid.profile?.subjects?.length ? (
          <span>{bid.profile.subjects.slice(0, 4).join(", ")}</span>
        ) : (
          <span style={{ color: "#9ca3af" }}>Not listed</span>
        ),
    },
    {
      label: "Availability",
      render: (bid) =>
        bid.availability ? (
          <span>{bid.availability}</span>
        ) : (
          <span style={{ color: "#9ca3af" }}>Not specified</span>
        ),
    },
    {
      label: "Verification",
      render: (bid) =>
        bid.profile?.isVerified ? (
          <span style={{ color: "#059669", fontWeight: 600 }}>✓ Fully Verified</span>
        ) : (
          <span style={{ color: "#dc2626" }}>Unverified</span>
        ),
    },
    {
      label: "Trust & Eligibility",
      render: (bid) => (
        <span style={{ fontSize: "0.82em", lineHeight: 1.5 }}>
          {bid.profile?.degreeVerificationStatus === "approved" ? "Education verified" : "Education pending"}<br />
          {bid.profile?.cnicVerificationStatus === "approved" ? "Identity verified" : "Identity pending"}<br />
          {bid.profile?.policeVerificationStatus === "approved" ? "Background check approved" : "No approved background check"}<br />
          {bid.profile?.homeTuitionEligible ? "Home tuition eligible" : "Online tuition only"}
        </span>
      ),
    },
    {
      label: "Demo Video",
      render: (bid) => bid.profile?.demoVideoStatus === "approved" && bid.profile.videoIntro ? (
        <a href={bid.profile.videoIntro} target="_blank" rel="noopener noreferrer">Watch demo</a>
      ) : <span style={{ color: "#9ca3af" }}>Not available</span>,
    },
    {
      label: "Message",
      render: (bid) => (
        <span style={{ fontSize: "0.85em", color: "#374151" }}>
          {bid.message || <span style={{ color: "#9ca3af" }}>No message</span>}
        </span>
      ),
    },
  ];

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label="Compare tutor offers"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "white",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "white",
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#021550" }}>
              Compare Tutor Offers ({selectedOffers.length})
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              Side-by-side comparison of selected offers
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            style={{
              background: "#f3f4f6",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#374151",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.88rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    background: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 700,
                    color: "#374151",
                    minWidth: 120,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  Criterion
                </th>
                {selectedOffers.map((bid) => (
                  <th
                    key={bid._id}
                    style={{
                      textAlign: "center",
                      padding: "0.75rem 1rem",
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      minWidth: 200,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "1.1rem",
                          color: "#3730a3",
                          overflow: "hidden",
                        }}
                      >
                        {bid.tutor.avatar ? (
                          <Image src={bid.tutor.avatar} alt={bid.tutor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}  width={100} height={100} unoptimized/>
                        ) : (
                          bid.tutor.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span style={{ fontWeight: 800, color: "#021550" }}>{bid.tutor.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.label}
                  style={{
                    background: i % 2 === 0 ? "white" : "#f9fafb",
                  }}
                >
                  <td
                    style={{
                      padding: "0.65rem 1rem",
                      borderBottom: "1px solid #f3f4f6",
                      fontWeight: 600,
                      color: "#374151",
                      position: "sticky",
                      left: 0,
                      background: i % 2 === 0 ? "white" : "#f9fafb",
                      zIndex: 1,
                    }}
                  >
                    {row.label}
                  </td>
                  {selectedOffers.map((bid) => (
                    <td
                      key={bid._id}
                      style={{
                        padding: "0.65rem 1rem",
                        borderBottom: "1px solid #f3f4f6",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {row.render(bid)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: "#eff6ff" }}>
                <td
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 700,
                    color: "#1d4ed8",
                    position: "sticky",
                    left: 0,
                    background: "#eff6ff",
                    zIndex: 1,
                  }}
                >
                  Actions
                </td>
                {selectedOffers.map((bid) => (
                  <td
                    key={bid._id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid #e5e7eb",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    {["pending", "submitted", "viewed", "countered"].includes(bid.status) ? (
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={() => onAccept(bid._id)}
                          disabled={acceptingId === bid._id}
                          style={{
                            padding: "0.4rem 0.85rem",
                            background: "#0329b2",
                            color: "white",
                            border: "none",
                            borderRadius: "0.4rem",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            cursor: acceptingId === bid._id ? "not-allowed" : "pointer",
                            opacity: acceptingId === bid._id ? 0.6 : 1,
                          }}
                        >
                          {acceptingId === bid._id ? "Accepting..." : "Accept"}
                        </button>
                        <Link
                          href={`/tutors/${bid.tutor._id}`}
                          style={{
                            padding: "0.4rem 0.85rem",
                            background: "white",
                            color: "#374151",
                            border: "1px solid #e5e7eb",
                            borderRadius: "0.4rem",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            textDecoration: "none",
                          }}
                        >
                          Profile
                        </Link>
                      </div>
                    ) : (
                      <span
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background:
                            bid.status === "accepted"
                              ? "#d1fae5"
                              : bid.status === "rejected" || bid.status === "withdrawn"
                              ? "#fee2e2"
                              : "#f3f4f6",
                          color:
                            bid.status === "accepted"
                              ? "#065f46"
                              : bid.status === "rejected" || bid.status === "withdrawn"
                              ? "#991b1b"
                              : "#6b7280",
                        }}
                      >
                        {bid.status}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
