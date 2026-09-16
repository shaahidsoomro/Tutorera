"use client";

import AvatarImage from "@/components/Common/AvatarImage";
import MatchScoreBadge from "@/components/marketplace/MatchScoreBadge";
import { useFavourites } from "@/hooks/useFavourites";
import { tutorProfileHref } from "@/lib/tutor-directory";
import type { TutorProfile } from "@/types/tutor";
import { Heart,Video } from "lucide-react";
import Link from "next/link";
import StarRating from "./StarRating";
import styles from "./Tutorcard.module.css";

interface TutorCardProps {
  tutor: TutorProfile;
  matchScore?: number;
}

function getModeClass(mode: TutorProfile["teachingMode"]): string {
  const map = {
    online: styles.modeOnline,
    "in-person": styles.modeInPerson,
    both: styles.modeBoth,
  };
  return map[mode] ?? styles.modeOnline;
}

function getModeLabel(mode: TutorProfile["teachingMode"]): string {
  if (mode === "both") return "Online & In-Person";
  if (mode === "online") return "Online";
  return "In-Person";
}

export default function TutorCard({ tutor, matchScore }: TutorCardProps) {
  const { isFavourited, toggleFavourite, isStudent } = useFavourites();
  const favourited = isFavourited(tutor._id);

  const handleHeartClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavourite(tutor._id);
  };

  const name = tutor.user?.name || tutor.fullName || "Tutor";
  const city = tutor.city || tutor.user?.city || "";
  const countryName = tutor.countryName || tutor.user?.countryName || "";
  const locationLabel = city && countryName ? `${city}, ${countryName}` : city || countryName || "Online availability varies";
  const hasVideo = Boolean(tutor.videoIntro);
  const hasReviews = Number(tutor.totalReviews) > 0 && Number(tutor.averageRating) > 0;
  const hasRate = Number.isFinite(Number(tutor.hourlyRate)) && Number(tutor.hourlyRate) > 0;
  const currency = tutor.currency?.trim() || "";
  const rateLabel = hasRate
    ? `${currency ? `${currency} ` : ""}${Number(tutor.hourlyRate).toLocaleString()}`
    : "Rate not listed";

  return (
    <Link href={tutorProfileHref(tutor)} className={styles.card} style={{ position: "relative" }}>
      <div className={styles.badgeContainer}>
        {hasVideo && (
          <span className={styles.videoBadge} title="Intro video available">
            <Video size={11} /> Video
          </span>
        )}

        {tutor.isVerified && (
          <span className={styles.verifiedBadge} aria-label="Verified tutor">
            <svg width={10} height={10} viewBox="0 0 20 20" fill="white" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        )}

        {typeof matchScore === "number" && (
          <span style={{ position: "relative", zIndex: 1 }}>
            <MatchScoreBadge score={matchScore} compact />
          </span>
        )}
      </div>

      {isStudent && (
        <button
          onClick={handleHeartClick}
          aria-label={favourited ? "Remove from favourites" : "Add to favourites"}
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            zIndex: 2,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            transition: "transform 0.15s",
          }}
          onMouseEnter={(event) => (event.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(event) => (event.currentTarget.style.transform = "scale(1)")}
        >
          <Heart size={16} color={favourited ? "#C81B7F" : "#9ca3af"} fill={favourited ? "#C81B7F" : "none"} />
        </button>
      )}

      <div className={styles.topRow}>
        <div className={styles.avatarWrap}>
          <AvatarImage src={tutor.user?.avatar} alt={`${name}'s avatar`} name={name} size={64} />
        </div>
        <div className={styles.nameBlock}>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.cityRow}>
            <svg width={13} height={13} viewBox="0 0 20 20" fill="#9ca3af" aria-hidden="true">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className={styles.cityText}>{locationLabel}</span>
          </div>
        </div>
      </div>

      <div className={styles.ratingRow}>
        <div className={styles.ratingLeft}>
          {hasReviews ? (
            <>
              <StarRating rating={tutor.averageRating} />
              <span className={styles.ratingValue}>{tutor.averageRating.toFixed(1)}</span>
              <span className={styles.ratingCount}>({tutor.totalReviews})</span>
            </>
          ) : (
            <span className={styles.ratingCount}>No completed-booking reviews yet</span>
          )}
        </div>
        <span className={`${styles.modeBadge} ${getModeClass(tutor.teachingMode)}`}>
          {getModeLabel(tutor.teachingMode)}
        </span>
      </div>

      {tutor.averageResponseMinutes !== undefined && tutor.averageResponseMinutes > 0 && (
        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              padding: "0.15rem 0.5rem",
              borderRadius: "999px",
              backgroundColor: "#f5f3ff",
              color: "#7c3aed",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
            title={`Average response time: ${tutor.responseTimeFormatted || `${Math.round(tutor.averageResponseMinutes)} minutes`}`}
          >
            <svg width="10" height="10" viewBox="0 0 20 20" fill="#7c3aed" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {tutor.responseTimeFormatted || `~${Math.round(tutor.averageResponseMinutes)}m response`}
          </span>
        </div>
      )}

      {tutor.bio && <p className={styles.bio}>{tutor.bio}</p>}

      <div className={styles.tagRow}>
        {tutor.subjects?.slice(0, 4).map((subject) => (
          <span key={subject} className={styles.tagBlue}>{subject}</span>
        ))}
        {tutor.subjects?.length > 4 && <span className={styles.tagGray}>+{tutor.subjects.length - 4}</span>}
      </div>

      {tutor.levels && tutor.levels.length > 0 && (
        <div className={styles.tagRow}>
          {tutor.levels.slice(0, 3).map((level) => (
            <span key={level} className={styles.tagGray}>{level}</span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <div>
          <span className={styles.price}>{rateLabel}</span>
          {hasRate && <span className={styles.priceUnit}>/hr</span>}
        </div>
        <span className={styles.cta}>View Profile</span>
      </div>
    </Link>
  );
}
