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
import { fetchTutor, tutorProfileHref } from "@/lib/tutor-directory";
import { SITE_URL } from "@/lib/site";
import type { Review } from "@/types/tutor";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://tutorera-backend.onrender.com/api/v1";

type Props = { params: Promise<{ id: string }> };

function formatName(raw?: string): string {
  if (!raw) return "Tutor";
  return raw
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tutor = await fetchTutor(id);
  if (!tutor) {
    return {
      title: "Tutor Profile | TUTORERA",
      robots: { index: false, follow: true },
    };
  }

  const name = formatName(tutor.user?.name || tutor.fullName);
  const primarySubject = tutor.subjects?.[0] || "Tuition";
  const city = tutor.city || tutor.user?.city || "Pakistan";
  const modeText =
    tutor.teachingMode === "both"
      ? "Online & In-Person"
      : tutor.teachingMode === "online"
      ? "Online"
      : "In-Person";
  const rateText = tutor.hourlyRate && tutor.hourlyRate > 0
    ? `${tutor.currency || "PKR"} ${tutor.hourlyRate.toLocaleString("en-US")}/hr`
    : "rate shown on the tutor profile when available";

  const title = `${name} - ${primarySubject} Tutor in ${city} (${modeText}) | TUTORERA`;
  const verificationText = tutor.isVerified ? " The profile carries TUTORERA's verification badge." : "";
  const description = `${name} teaches ${primarySubject} for students in ${city} and ${modeText.toLowerCase()} lessons. Subjects include ${
    tutor.subjects?.slice(0, 3).join(", ") || primarySubject
  }; levels include ${tutor.levels?.slice(0, 3).join(", ") || "those listed on the profile"}. Current rate: ${rateText}.${verificationText}`;
  const canonical = tutorProfileHref(tutor);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
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

export default async function TutorProfilePage({ params }: Props) {
  const { id } = await params;
  const tutor = await fetchTutor(id);
  if (!tutor) notFound();

  const name = formatName(tutor.user?.name || tutor.fullName);
  const city = tutor.city || tutor.user?.city || "Pakistan";
  const countryCode = tutor.countryCode || tutor.user?.countryCode || "PK";
  const countryName =
    tutor.countryName || tutor.user?.countryName || (countryCode === "PK" ? "Pakistan" : countryCode);
  const locationDisplay = city ? `${city}, ${countryName}` : countryName;
  const avatarUrl = tutor.user?.avatar || null;
  const tutorUserId = tutor.user?._id || String(tutor.user || tutor._id);

  const { reviews, slots } = await extras(tutorUserId);

  const hasVideo = Boolean(tutor.videoIntro);
  const isHomeTutor = tutor.teachingMode === "in-person" || tutor.teachingMode === "both";
  const modeLabel =
    tutor.teachingMode === "both"
      ? "online worldwide and in-person"
      : tutor.teachingMode === "online"
      ? "online worldwide"
      : "in-person";
  const displayRating = tutor.averageRating ?? tutor.rating;
  const hasReviews = Boolean(tutor.totalReviews && tutor.totalReviews > 0 && displayRating && displayRating > 0);
  const hasRate = Boolean(tutor.hourlyRate && tutor.hourlyRate > 0);
  const verificationStatus = tutor.verificationStatus?.toLowerCase();
  const isApproved = verificationStatus === "approved" || verificationStatus === "verified";
  const canShowVerification = tutor.isVerified === true && isApproved;
  const canShowPoliceCheck = tutor.policeVerificationStatus === "approved";

  const canonical = tutorProfileHref(tutor);
  const personSchema: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${SITE_URL}${canonical}#person`,
    name,
    image: avatarUrl || undefined,
    jobTitle: `${tutor.subjects?.[0] || "Academic"} Tutor`,
    description: tutor.bio || undefined,
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
  };

  if (hasRate) {
    personSchema.offers = {
      "@type": "Offer",
      price: tutor.hourlyRate,
      priceCurrency: tutor.currency || "PKR",
      availability: "https://schema.org/InStock",
    };
  }

  if (hasReviews) {
    personSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: displayRating,
      reviewCount: tutor.totalReviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

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
      personSchema,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }}
      />

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
              {canShowVerification && (
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

                {canShowVerification && (
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
                    Online Worldwide
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
                    Online & In-Person
                  </span>
                )}

                {canShowPoliceCheck && (
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
                    <ShieldCheck size={14} /> Police Verification Approved
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
                    <Video size={14} color="#db2777" /> Demo Video Available
                  </span>
                )}
              </div>

              <p
                style={{
                  color: "#0329B2",
                  margin: "0.3rem 0 0.6rem",
                  fontSize: "1.08rem",
                  fontWeight: 700,
                }}
              >
                {tutor.subjects?.join(" • ") || "Academic Tutor"}
              </p>

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
                {hasReviews ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" />
                    <strong style={{ color: "#021550" }}>{displayRating?.toFixed(1)}</strong>{" "}
                    ({tutor.totalReviews} student reviews)
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <Star size={16} color="#94a3b8" /> No student reviews yet
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Clock size={16} color="#0329B2" /> {tutor.experience && tutor.experience > 0 ? `${tutor.experience} years experience` : "Experience not specified"}
                </span>
                {tutor.averageResponseMinutes !== undefined && tutor.averageResponseMinutes > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#7c3aed" }}>
                    <Zap size={15} color="#7c3aed" /> Responds in ~{tutor.responseTimeFormatted || `${Math.round(tutor.averageResponseMinutes)}m`}
                  </span>
                )}
              </div>
            </div>

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
                {hasRate ? <>{tutor.currency || "PKR"} {tutor.hourlyRate?.toLocaleString("en-US")}<span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>/hr</span></> : "Rate on request"}
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
              <strong>{name}</strong> lists{" "}
              <strong>{tutor.subjects?.join(", ") || "academic tutoring"}</strong> ({locationDisplay}) and
              offers <strong>{modeLabel}</strong> lessons. Review the tutor's profile, availability, verification status, and teaching information before booking.
            </span>
          </div>
        </div>
      </section>

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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <TutorVideoPlayer
            videoUrl={tutor.videoIntro}
            tutorName={name}
            posterUrl={avatarUrl || undefined}
            subjects={tutor.subjects || []}
            city={city}
            hourlyRate={tutor.hourlyRate}
            currency={tutor.currency || "PKR"}
            tutorUserId={tutorUserId}
          />

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
              {canShowVerification && (
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
                      Identity Verification
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#15803d" }}>
                      Verification badge active
                    </div>
                  </div>
                </div>
              )}

              {tutor.education?.some((e) => e.degree && e.institution) && (
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
                      Education Listed
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#1d4ed8" }}>
                      Degree and institution provided
                    </div>
                  </div>
                </div>
              )}

              {canShowPoliceCheck && (
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
                      Police Verification
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#7e22ce" }}>
                      Approved status recorded
                    </div>
                  </div>
                </div>
              )}

              {hasVideo && (
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
                      Available on this profile
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
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Home size={18} color="#475569" />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                      In-Person Tuition
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Offered where location permits
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!canShowVerification && !canShowPoliceCheck && !hasVideo && !tutor.education?.some((e) => e.degree && e.institution) && (
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
                No additional verification or profile trust signals are currently published for this tutor.
              </p>
            )}
          </section>

          <section style={card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: ".8rem" }}>
              About {name}
            </h2>
            <p style={{ color: "#374151", lineHeight: 1.8, fontSize: "0.95rem", whiteSpace: "pre-line" }}>
              {tutor.bio || `${name} has not added a detailed tutor biography yet.`}
            </p>
          </section>

          <section style={card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
              Subjects & Teaching Levels
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: "1.25rem" }}>
              {tutor.subjects?.length ? tutor.subjects.map((subject) => (
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
              )) : <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Subjects not specified</span>}
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
                <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>Teaching levels not specified</span>
              )}
            </div>
          </section>

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

          <section style={card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", marginBottom: "1rem" }}>
              Teaching Details
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: 10 }}>
                <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>MODE</span>
                <p style={{ color: "#021550", fontWeight: 700, margin: "0.25rem 0 0", textTransform: "capitalize" }}>
                  {tutor.teachingMode === "both" ? "Online & In-Person" : tutor.teachingMode === "online" ? "Online Only" : tutor.teachingMode === "in-person" ? "In-Person Only" : "Not specified"}
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
                  {tutor.languages?.length ? tutor.languages.join(", ") : "Not specified"}
                </p>
              </div>

              <div style={{ background: "#F8FAFC", padding: "1rem", borderRadius: 10 }}>
                <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>EXPERIENCE</span>
                <p style={{ color: "#021550", fontWeight: 700, margin: "0.25rem 0 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={17} color="#0329B2" />
                  {tutor.experience && tutor.experience > 0 ? `${tutor.experience} Years Teaching` : "Not specified"}
                </p>
              </div>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "1rem", lineHeight: 1.5 }}>
              You can discuss syllabus coverage, assessment frequency, lesson schedules, and rates directly through the student-led marketplace before confirming a booking.
            </p>
          </section>

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

          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#021550", margin: 0 }}>
                Student Reviews ({tutor.totalReviews || 0})
              </h2>
              {hasReviews && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 700, color: "#021550" }}>
                  <Star size={18} color="#fbbf24" fill="#fbbf24" />
                  <span>{displayRating?.toFixed(1)} / 5.0</span>
                </div>
              )}
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
                      {review.student?.name || "Student"}
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
                </article>
              ))
            ) : (
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                No completed-session reviews are available for this tutor yet.
              </p>
            )}
          </section>
        </div>

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
                {hasRate ? <>{tutor.currency || "PKR"} {tutor.hourlyRate?.toLocaleString("en-US")}<span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>/hr</span></> : "Rate on request"}
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
                <strong>First-session protection:</strong> eligible sessions may qualify for replacement, credit, or refund review under TUTORERA's published policy.
              </span>
            </div>

            <TutorProfileActions
              profileId={tutor._id}
              tutorUserId={tutorUserId}
              tutorName={name}
              hourlyRate={tutor.hourlyRate}
              currency={tutor.currency || "PKR"}
              subjects={tutor.subjects || []}
              teachingMode={tutor.teachingMode}
              city={city}
            />
          </div>
        </aside>
      </div>

      <StickyTutorProfileCTA
        tutorId={tutor._id}
        tutorUserId={tutorUserId}
        tutorName={name}
        hourlyRate={tutor.hourlyRate}
        currency={tutor.currency || "PKR"}
        rating={hasReviews ? displayRating : undefined}
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
