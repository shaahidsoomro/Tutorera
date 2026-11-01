// Shared rendering logic for both tutor profile routes:
// - /tutors/[id] (legacy, ObjectId-embedded - kept for old backlinks/bookmarks)
// - /tutors/[country]/[slug] (canonical, SEO-friendly - no ObjectId)
// Both routes resolve a TutorProfile by their own means and hand it to the
// functions below, so the actual rendering/metadata logic lives in exactly
// one place. This file is prefixed with "_" so Next.js does not treat it
// as a route segment.
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  CheckCircle,
  Clock,
  MapPin,
  Star,
  ShieldCheck,
  Award,
  Video,
  FileCheck2,
  Sparkles,
  Home,
  ChevronRight,
  Zap,
} from "lucide-react";
import TutorProfileActions from "@/components/Tutors/TutorProfileActions";
import StickyTutorProfileCTA from "@/components/Tutors/StickyTutorProfileCTA";
import AvatarImage from "@/components/Common/AvatarImage";
import TutorVideoPlayer from "@/components/Tutors/TutorVideoPlayer";
import ShareProfileButton from "@/components/Tutors/ShareProfileButton";
import { fetchTutors, tutorProfileHref } from "@/lib/tutor-directory";
import { assessTutorSeoQuality } from "@/lib/tutor-seo";
import TutorCard from "@/components/Tutors/TutorCard";
import { SITE_URL } from "@/lib/site";
import type { Review, TutorProfile } from "@/types/tutor";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.tutorera.ac.pk/api/v1";

function formatName(raw?: string): string {
  if (!raw) return "Verified Tutor";
  return raw
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function generateTutorProfileMetadata(tutor: TutorProfile | null): Promise<Metadata> {
  if (!tutor) {
    return {
      title: "Tutor Profile",
      robots: { index: false, follow: true },
    };
  }

  // Oct 2026 incident: a cached /tutors/.../testing-user URL kept
  // appearing in results because the profile detail page served 200
  // with structured data even for accounts that fail the SEO quality
  // bar. If the shared gate says a profile is not indexable (test-name
  // pattern, missing core data, unverified, etc.) emit robots noindex
  // so a crawler that already has the URL stops ranking it. The page
  // body still renders for direct human visitors.
  const notIndexable = !assessTutorSeoQuality(tutor).indexable;

  const name = formatName(tutor.user?.name || tutor.fullName);
  const primarySubject = tutor.subjects?.[0] || "Tuition";
  const city = tutor.city || tutor.user?.city || "Online worldwide";
  const modeText =
    tutor.teachingMode === "both"
      ? "Online & In-Person"
      : tutor.teachingMode === "online"
      ? "Online"
      : "In-Person";
  const rateText = tutor.hourlyRate
    ? `${tutor.currency || "Market currency"} ${tutor.hourlyRate.toLocaleString("en-US")}/hr`
    : "Competitive rates";

  const title = `${name} - ${primarySubject} Tutor in ${city} (${modeText})`;
  const description = `${name} is an approved, verified ${primarySubject} educator serving students in ${city} and worldwide (${modeText}). Offering ${
    tutor.subjects?.slice(0, 3).join(", ") || primarySubject
  } across ${tutor.levels?.slice(0, 3).join(", ") || "standard curricula"} at ${rateText}.`;
  const canonical = tutorProfileHref(tutor);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: notIndexable ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${title} | TUTORERA`,
      description,
      url: `${SITE_URL}${canonical}`,
      type: "profile",
      images: tutor.user?.avatar ? [{ url: tutor.user.avatar, alt: name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: tutor.user?.avatar ? [tutor.user.avatar] : undefined,
    },
  };
}

interface Slot {
  date: string;
  dayName: string;
  startTime: string;
  endTime: string;
}

async function extras(
  userId: string
): Promise<{ reviews: Review[]; slots: Slot[] }> {
  try {
    const [reviewsResponse, slotsResponse] = await Promise.all([
      fetch(`${API_URL}/reviews/${userId}?limit=10`, {
        next: { revalidate: 300 },
      }),
      fetch(`${API_URL}/tutors/${userId}/availability`, {
        next: { revalidate: 300 },
      }),
    ]);
    const reviews = reviewsResponse.ok ? await reviewsResponse.json() : {};
    const slots = slotsResponse.ok ? await slotsResponse.json() : {};
    return { reviews: reviews.reviews ?? [], slots: slots.slots ?? [] };
  } catch {
    return { reviews: [], slots: [] };
  }
}

const card = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: "1.5rem",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
} as const;

export async function TutorProfilePageBody({ tutor }: { tutor: TutorProfile | null }) {
  if (!tutor) notFound();

  const name = formatName(tutor.user?.name || tutor.fullName);
  const city = tutor.city || tutor.user?.city || "";
  const countryCode = tutor.countryCode || tutor.user?.countryCode || "";
  const countryName =
    tutor.countryName || tutor.user?.countryName || (countryCode === "PK" ? "Pakistan" : countryCode) || "Online worldwide";
  const locationDisplay = city ? `${city}, ${countryName}` : countryName;
  const avatarUrl = tutor.user?.avatar || null;
  const tutorUserId = tutor.user?._id || String(tutor.user || tutor._id);

  const { reviews, slots } = await extras(tutorUserId);

  // Spec §42 + Oct 2026 incident: this profile's own indexability
  // decides whether we emit ProfilePage/Person/Offer/AggregateRating
  // JSON-LD at all. If the tutor fails the gate (test name, missing
  // core data, unverified), schema is suppressed so crawlers can't
  // ingest it as structured marketplace facts even if they fetch the
  // page via a stale link.
  const indexableSelf = assessTutorSeoQuality(tutor).indexable;

  const primarySubject = tutor.subjects?.[0];
  const similarTutorsResult = primarySubject
    ? await fetchTutors({ subject: primarySubject, countryCode }, 10)
    : { tutors: [] };
  // Related-tutor section is a major source of internal links a crawler
  // uses to discover other profiles. If an unindexable account (e.g.
  // "Testing User") shares a subject with the current tutor, it would
  // otherwise be linked here on real tutors' pages. Gate it the same
  // way the sitemap and SEO landings now do.
  const similarTutors = similarTutorsResult.tutors
    .filter((t) => t._id !== tutor._id && assessTutorSeoQuality(t).indexable)
    .slice(0, 4);

  const hasVideo = Boolean(tutor.videoIntro);
  const isHomeTutor = tutor.teachingMode === "in-person" || tutor.teachingMode === "both";
  const modeLabel =
    tutor.teachingMode === "both"
      ? "online worldwide and in-person"
      : tutor.teachingMode === "online"
      ? "online worldwide"
      : "in-person";

  const canonical = tutorProfileHref(tutor);
  const profileSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}${canonical}#webpage`,
        url: `${SITE_URL}${canonical}`,
        name: `${name} - ${tutor.subjects?.[0] || "Tuition"} Tutor`,
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Tutors", item: `${SITE_URL}/tutors` },
            { "@type": "ListItem", position: 3, name, item: `${SITE_URL}${canonical}` },
          ],
        },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}${canonical}#person`,
        name,
        image: avatarUrl || undefined,
        jobTitle: `${tutor.subjects?.[0] || "Academic"} Tutor`,
        description: tutor.bio || undefined,
        // Links this tutor into the sitewide entity graph (Organization <-> Service <->
        // Person <-> Course) instead of leaving Person as an isolated node.
        worksFor: { "@id": `${SITE_URL}/#organization` },
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressCountry: countryCode,
        },
        knowsAbout: [
          ...(tutor.subjects || []),
          ...(tutor.curricula || []),
          ...(tutor.levels || []),
        ],
        alumniOf: tutor.education?.map((edu) => ({
          "@type": "EducationalOrganization",
          name: edu.institution,
        })),
        // Only emit an Offer with a real price + currency (spec §42: never
        // fabricate prices). "Availability: InStock" alone tells a crawler
        // nothing genuine when the rate is missing.
        ...(tutor.hourlyRate && tutor.currency
          ? {
              makesOffer: {
                "@type": "Offer",
                price: tutor.hourlyRate,
                priceCurrency: tutor.currency,
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
        // Only emit AggregateRating when both the review count AND a real
        // average rating exist. The previous `tutor.averageRating || 5`
        // fallback fabricated a 5-star rating for tutors with reviews but no
        // computed average — spec §42 forbids fabricated ratings.
        ...(tutor.totalReviews && tutor.averageRating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: tutor.averageRating,
                reviewCount: tutor.totalReviews,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        ...(reviews.length
          ? {
              review: reviews.slice(0, 10).map((r) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.student?.name || "TUTORERA student" },
                datePublished: r.createdAt,
                reviewBody: r.comment,
                reviewRating: {
                  "@type": "Rating",
                  ratingValue: r.rating,
                  bestRating: 5,
                  worstRating: 1,
                },
              })),
            }
          : {}),
      },
    ],
  };

  return (
    <main
      style={{
        background: "#F5F7FF",
        minHeight: "100vh",
        color: "#021550",
      }}
    >
      {indexableSelf && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
        />
      )}

      {/* ── COVER BANNER & BREADCRUMB ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #021550 0%, #062b8c 45%, #021245 100%)",
          position: "relative",
          padding: "1.5rem 1.5rem 5.5rem",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
        aria-label="Tutor Profile Banner"
      >
        {/* Ambient Decorative Blurs & Mesh Pattern */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200, 27, 127, 0.28) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "5%",
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(3, 41, 178, 0.45) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.05,
            pointerEvents: "none",
          }}
        >
          <defs>
            <pattern id="cover-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M0 32V.5H32" fill="none" stroke="#ffffff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cover-grid)" />
        </svg>

        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* High-contrast, Accessible Glassmorphic Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.45rem 1rem",
              borderRadius: 999,
              backgroundColor: "rgba(2, 21, 80, 0.65)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              fontSize: "0.82rem",
              color: "#e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                color: "#93c5fd",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <Home size={14} /> Home
            </Link>
            <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
            <Link
              href="/tutors"
              style={{
                color: "#93c5fd",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Tutors
            </Link>
            {countryCode && countryName && (
              <>
                <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
                <Link
                  href={`/${countryCode.toLowerCase()}/tutors`}
                  style={{
                    color: "#93c5fd",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  {countryName}
                </Link>
              </>
            )}
            <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
            <span style={{ color: "#ffffff", fontWeight: 700 }} aria-current="page">
              {name}
            </span>
          </nav>

          <ShareProfileButton tutorName={name} />
        </div>
      </section>

      {/* ── OVERLAPPING HERO PROFILE CARD ── */}
      <section
        style={{
          maxWidth: 1100,
          margin: "-4.5rem auto 0",
          padding: "0 1.5rem",
          position: "relative",
          zIndex: 10,
        }}
        aria-label="Tutor Profile Overview"
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 20,
            padding: "2rem",
            boxShadow: "0 14px 38px rgba(2, 21, 80, 0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2rem",
              flexWrap: "wrap",
            }}
          >
            {/* Avatar with Verified Badge */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <AvatarImage
                src={avatarUrl}
                alt={`${name}, tutor in ${city}`}
                name={name}
                size={124}
                style={{
                  border: "4px solid #ffffff",
                  boxShadow: "0 8px 26px rgba(2, 21, 80, 0.15)",
                }}
              />
              {tutor.isVerified && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    background: "#10b981",
                    color: "white",
                    borderRadius: "50%",
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2.5px solid #ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                  title="Verified Tutor"
                >
                  <CheckCircle size={18} />
                </span>
              )}
            </div>

            {/* Profile Identity Details */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: "0.35rem",
                }}
              >
                <h1
                  style={{
                    color: "#021550",
                    fontSize: "2.2rem",
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {name}
                </h1>

                {tutor.isVerified && (
                  <span
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.12)",
                      color: "#166534",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <CheckCircle size={14} color="#16a34a" /> Verified Tutor
                  </span>
                )}

                {tutor.teachingMode === "online" && (
                  <span
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      color: "#1d4ed8",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    🌐 Online Worldwide
                  </span>
                )}

                {tutor.teachingMode === "both" && (
                  <span
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      color: "#1d4ed8",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    🌐 Online & In-Person
                  </span>
                )}

                {tutor.policeVerificationStatus === "approved" && (
                  <span
                    style={{
                      backgroundColor: "rgba(147, 51, 234, 0.1)",
                      color: "#6b21a8",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(147, 51, 234, 0.3)",
                    }}
                  >
                    Background/Safety Verified
                  </span>
                )}

                {hasVideo && (
                  <span
                    style={{
                      backgroundColor: "rgba(200, 27, 127, 0.1)",
                      color: "#9d174d",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(200, 27, 127, 0.3)",
                    }}
                  >
                    <Video size={14} color="#db2777" /> Video Demo Verified
                  </span>
                )}

                {tutor.badges?.experiencedTutor && (
                  <span
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.1)",
                      color: "#92400e",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    ⭐ Experienced Tutor
                  </span>
                )}

                {tutor.badges?.topPerformer && (
                  <span
                    style={{
                      backgroundColor: "rgba(234, 88, 12, 0.1)",
                      color: "#9a3412",
                      display: "inline-flex",
                      gap: "0.35rem",
                      alignItems: "center",
                      padding: "0.25rem 0.75rem",
                      borderRadius: 999,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "1px solid rgba(234, 88, 12, 0.3)",
                    }}
                  >
                    🏆 Top Performer
                  </span>
                )}
              </div>

              {/* Primary Subjects Headline */}
              <p
                style={{
                  color: "#0329B2",
                  margin: "0.3rem 0 0.6rem",
                  fontSize: "1.08rem",
                  fontWeight: 700,
                }}
              >
                {tutor.subjects?.join(" • ") || "Academic Specialist"}
              </p>

              {/* Meta Stats Row */}
              <div
                style={{
                  color: "#64748b",
                  display: "flex",
                  gap: "1.25rem",
                  flexWrap: "wrap",
                  fontSize: "0.88rem",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <MapPin size={16} color="#0329B2" /> {locationDisplay}
                </span>
                {tutor.averageRating && tutor.totalReviews ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" />
                    <strong style={{ color: "#021550" }}>
                      {tutor.averageRating.toFixed(1)}
                    </strong>{" "}
                    ({tutor.totalReviews} student {tutor.totalReviews === 1 ? "review" : "reviews"})
                  </span>
                ) : (
                  // Spec §16: never fabricate ratings. A tutor with no
                  // reviews yet is explicitly shown as new, not as 5.0.
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#64748b" }}>
                    <Star size={16} color="#cbd5e1" />
                    New tutor — no reviews yet
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Clock size={16} color="#0329B2" /> {tutor.experience || 0} years experience
                </span>
                {tutor.averageResponseMinutes !== undefined && tutor.averageResponseMinutes > 0 ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#7c3aed" }}>
                    <Zap size={15} color="#7c3aed" /> Responds in ~{tutor.responseTimeFormatted || `${Math.round(tutor.averageResponseMinutes)}m`}
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#166534" }}>
                    <Zap size={15} color="#16a34a" /> Fast Responder
                  </span>
                )}
              </div>
            </div>

            {/* Quick Pricing Badge / Desktop Direct Action */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "0.5rem",
                marginLeft: "auto",
              }}
              className="tutor-hero-rate-box"
            >
              <div
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  color: "#0329B2",
                }}
              >
                {tutor.currency || "Market currency"} {tutor.hourlyRate?.toLocaleString("en-US")}
                <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>
                  /hr
                </span>
              </div>
              <a
                href="#booking-card"
                style={{
                  backgroundColor: "#0329B2",
                  color: "white",
                  padding: "0.65rem 1.25rem",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 4px 14px rgba(3, 41, 178, 0.25)",
                }}
              >
                Book Session
              </a>
            </div>
          </div>

          {/* Integrated Teaching Overview Statement (replacing raw SEO paragraph) */}
          <div
            style={{
              marginTop: "1.5rem",
              padding: "0.85rem 1.25rem",
              borderRadius: 12,
              backgroundColor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.92rem",
              color: "#334155",
              lineHeight: 1.5,
            }}
          >
            <BookOpen size={20} color="#0329B2" style={{ flexShrink: 0 }} />
            <span>
              <strong>{name}</strong> specializes in{" "}
              <strong>{tutor.subjects?.join(", ") || "academic tutoring"}</strong> ({locationDisplay}) and
              offers <strong>{modeLabel}</strong> lessons focused on deep conceptual clarity, past paper
              practice, and customized student pacing.
            </span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "2.5rem 1.5rem 6rem",
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(300px,1fr)",
          gap: "2rem",
        }}
        className="profile-grid"
      >
        {/* Left Column Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── DEMO VIDEO / TRIAL SESSION SECTION (Always rendered) ── */}
          <TutorVideoPlayer
            videoUrl={tutor.videoIntro}
            tutorName={name}
            posterUrl={avatarUrl || undefined}
            subjects={tutor.subjects || []}
            city={city}
            hourlyRate={tutor.hourlyRate}
            currency={tutor.currency || ""}
            tutorUserId={tutorUserId}
          />

          {/* ── TRUST & VERIFICATION PILLARS ── */}
          <section style={card}>
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#021550",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <ShieldCheck size={20} color="#0329B2" />
              Verification & Marketplace Trust
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.85rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <CheckCircle size={18} color="#16a34a" />
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>
                    Identity Document
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#15803d" }}>
                    Verified by Admin
                  </div>
                </div>
              </div>

              {tutor.education?.some((e) => e.degree) && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <Award size={18} color="#2563eb" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e40af" }}>
                      Academic Degree
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#1d4ed8" }}>
                      Credentials Checked
                    </div>
                  </div>
                </div>
              )}

              {tutor.policeVerificationStatus === "approved" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#faf5ff",
                    border: "1px solid #e9d5ff",
                  }}
                >
                  <ShieldCheck size={18} color="#9333ea" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6b21a8" }}>
                      Background/Safety Review
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#7e22ce" }}>
                      Home Tuition Safe
                    </div>
                  </div>
                </div>
              )}

              {hasVideo ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#fdf2f8",
                    border: "1px solid #fbcfe8",
                  }}
                >
                  <Video size={18} color="#db2777" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#9d174d" }}>
                      Demo Video
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#be185d" }}>
                      Screening Verified
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <FileCheck2 size={18} color="#64748b" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                      Platform Screened
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      TUTORERA Guarantee
                    </div>
                  </div>
                </div>
              )}

              {isHomeTutor && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#faf5ff",
                    border: "1px solid #e9d5ff",
                  }}
                >
                  <ShieldCheck size={18} color="#9333ea" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6b21a8" }}>
                      Home Tuition Safe
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#7e22ce" }}>
                      Background Screened
                    </div>
                  </div>
                </div>
              )}

              {tutor.badges?.experiencedTutor && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>⭐</span>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#92400e" }}>
                      Experienced Tutor
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#b45309" }}>
                      Admin-recognised excellence
                    </div>
                  </div>
                </div>
              )}

              {tutor.badges?.topPerformer && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem 1rem",
                    borderRadius: 10,
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#9a3412" }}>
                      Top Performer
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#c2410c" }}>
                      ≥4.5 rating · 10+ reviews
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* About section */}
          <section style={card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: ".8rem" }}>
              About {name}
            </h2>
            <p style={{ color: "#374151", lineHeight: 1.8, fontSize: "0.95rem", whiteSpace: "pre-line" }}>
              {tutor.bio ||
                `${name} is a verified tutor on TUTORERA specializing in ${tutor.subjects?.join(
                  ", "
                )}. Dedicated to student-centric learning, conceptual clarity, and regular assessment.`}
            </p>
          </section>

          {/* Subjects & Levels */}
          <section style={card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
              Subjects & Teaching Levels
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: "1.25rem" }}>
              {tutor.subjects?.map((subject) => (
                <span
                  key={subject}
                  style={{
                    backgroundColor: "#eef2ff",
                    color: "#0329B2",
                    padding: "0.45rem 0.85rem",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    border: "1px solid #c7d2fe",
                  }}
                >
                  {subject}
                </span>
              ))}
            </div>

            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4b5563", marginBottom: ".6rem" }}>
              Grade Levels Covered:
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
              {tutor.levels?.length ? (
                tutor.levels.map((lvl) => (
                  <span
                    key={lvl}
                    style={{
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      padding: "0.3rem 0.7rem",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    {lvl}
                  </span>
                ))
              ) : (
                <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                  Primary, Middle, Matric, O/A Levels
                </span>
              )}
            </div>
          </section>

          {/* Curricula & Boards */}
          {tutor.curricula && tutor.curricula.length > 0 && (
            <section style={card}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
                Target Curricula & Examination Boards
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
                {tutor.curricula.map((curr) => (
                  <span
                    key={curr}
                    style={{
                      backgroundColor: "#fdf2f8",
                      color: "#C81B7F",
                      padding: "0.45rem 0.85rem",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      border: "1px solid #fbcfe8",
                    }}
                  >
                    {curr}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Education & Degrees */}
          {tutor.education && tutor.education.length > 0 && (
            <section style={card}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
                Academic Background & Degrees
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {tutor.education.map((edu) => (
                  <div
                    key={edu._id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.85rem",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: "0.85rem",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor: "#f0fdf4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#16a34a",
                        flexShrink: 0,
                      }}
                    >
                      <Award size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#021550", fontSize: "0.95rem" }}>
                        {edu.degree}
                      </div>
                      <div style={{ color: "#4b5563", fontSize: "0.85rem" }}>
                        {edu.institution} {edu.year ? `(${edu.year})` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Teaching Details / Summary */}
          <section style={card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
              Teaching Details
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: 10 }}>
                <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>MODE</span>
                <p style={{ color: "#021550", fontWeight: 700, margin: "0.25rem 0 0", textTransform: "capitalize" }}>
                  {tutor.teachingMode === "both"
                    ? "Online & In-Person"
                    : tutor.teachingMode === "online"
                    ? "Online Only"
                    : "In-Person Only"}
                </p>
              </div>

              <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: 10 }}>
                <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>LOCATION</span>
                <p style={{ color: "#021550", fontWeight: 700, margin: "0.25rem 0 0" }}>
                  {locationDisplay}
                </p>
              </div>

              <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: 10 }}>
                <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>LANGUAGES</span>
                <p style={{ color: "#021550", fontWeight: 700, margin: "0.25rem 0 0" }}>
                  {tutor.languages && tutor.languages.length > 0
                    ? tutor.languages.map((l) => l.language).filter(Boolean).join(", ")
                    : "English"}
                </p>
              </div>

              <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: 10 }}>
                <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>EXPERIENCE</span>
                <p style={{ color: "#021550", fontWeight: 700, margin: "0.25rem 0 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={17} color="#0329B2" />
                  {tutor.experience || 0} Years Teaching
                </p>
              </div>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "1rem", lineHeight: 1.5 }}>
              * You can discuss syllabus coverage, test series frequency, and custom lesson schedules directly with the tutor or negotiate rates through our student-led marketplace.
            </p>
          </section>

          {/* Upcoming availability */}
          {slots.length > 0 && (
            <section style={card}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
                Upcoming Availability
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: ".6rem" }}>
                {slots.slice(0, 8).map((slot) => (
                  <div
                    key={`${slot.date}-${slot.startTime}`}
                    style={{
                      padding: "0.6rem 0.85rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: "0.85rem",
                      color: "#334155",
                    }}
                  >
                    <strong>{slot.dayName}</strong>
                    <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {slot.startTime} – {slot.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Student Reviews */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", margin: 0 }}>
                Student Reviews ({tutor.totalReviews || 0})
              </h2>
              {/* Spec §16: only render the rating badge against real reviews. */}
              {tutor.averageRating && tutor.totalReviews ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, color: "#021550" }}>
                  <Star size={18} color="#fbbf24" fill="#fbbf24" />
                  <span>{tutor.averageRating.toFixed(1)} / 5.0</span>
                </div>
              ) : null}
            </div>

            {reviews.length ? (
              reviews.map((review) => (
                <article
                  key={review._id}
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    padding: "1.1rem 0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#021550", fontSize: "0.95rem" }}>
                      {review.student?.name || "Verified Student"}
                    </strong>
                    <div style={{ display: "flex", gap: "2px" }}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          color={i < review.rating ? "#fbbf24" : "#e2e8f0"}
                          fill={i < review.rating ? "#fbbf24" : "#e2e8f0"}
                        />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", lineHeight: 1.6, marginTop: ".4rem", fontSize: "0.9rem" }}>
                    {review.comment}
                  </p>
                  {review.tutorResponse && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.65rem 0.875rem",
                        backgroundColor: "#f0f9ff",
                        borderLeft: "3px solid #0369a1",
                        borderRadius: "0 0.375rem 0.375rem 0",
                      }}
                    >
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0369a1", margin: "0 0 0.25rem" }}>
                        Tutor's response
                        {review.tutorRespondedAt && (
                          <span style={{ fontWeight: 400, marginLeft: "0.5rem", color: "#64748b" }}>
                            · {new Date(review.tutorRespondedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </p>
                      <p style={{ color: "#0c4a6e", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                        {review.tutorResponse}
                      </p>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                No completed session reviews yet. Book the first session with {name}!
              </p>
            )}
          </section>
        </div>

        {/* Right Sticky Column: Actions & Booking / Marketplace Invite */}
        <aside id="booking-card">
          <div style={{ ...card, position: "sticky", top: 90 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
                DIRECT HOURLY RATE
              </span>
              <span
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  color: "#0329B2",
                }}
              >
                {tutor.currency || "Market currency"} {tutor.hourlyRate?.toLocaleString("en-US")}
                <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>
                  /hr
                </span>
              </span>
            </div>

            <div
              style={{
                padding: "0.6rem 0.85rem",
                borderRadius: 8,
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                fontSize: "0.78rem",
                color: "#166534",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Sparkles size={14} color="#16a34a" />
              <span>
                <strong>First-session protection:</strong> eligible sessions may qualify for replacement, credit, or refund review.
              </span>
            </div>

            <TutorProfileActions
              profileId={tutor._id}
              tutorUserId={tutorUserId}
              tutorName={name}
              hourlyRate={tutor.hourlyRate}
              currency={tutor.currency || ""}
              countryCode={tutor.countryCode}
              subjects={tutor.subjects || []}
              teachingMode={tutor.teachingMode}
              city={city}
            />
          </div>
        </aside>
      </div>

      {similarTutors.length > 0 && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
            More {primarySubject} tutors {city ? `near ${city}` : ""}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {similarTutors.map((t) => (
              <TutorCard key={t._id} tutor={t} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Bottom CTA for Mobile */}
      <StickyTutorProfileCTA
        tutorId={tutor._id}
        tutorUserId={tutorUserId}
        tutorName={name}
        hourlyRate={tutor.hourlyRate}
        currency={tutor.currency || ""}
        countryCode={tutor.countryCode}
        rating={tutor.averageRating}
        teachingMode={tutor.teachingMode}
        city={city}
        subjects={tutor.subjects || []}
      />

      <style>{`
        @media(max-width:860px){
          .profile-grid {
            grid-template-columns: 1fr !important;
          }
          .tutor-hero-rate-box {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}
