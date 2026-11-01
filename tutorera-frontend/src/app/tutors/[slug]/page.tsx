import { fetchTutor, extractTutorId } from "@/lib/tutor-directory";
import type { TutorProfile } from "@/types/tutor";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TutorProfileActions from "@/components/Tutors/TutorProfileActions";
import StarRating from "@/components/Tutors/StarRating";
import TutorVideoPlayer from "@/components/Tutors/TutorVideoPlayer";
import ShareProfileButton from "@/components/Tutors/ShareProfileButton";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = extractTutorId(slug);
  const profile = await fetchTutor(id);
  if (!profile) return { title: "Tutor Not Found" };
  const name = profile.user?.name || profile.fullName || "Tutor";
  const subject = profile.subjects?.[0] || "Tuition";
  const city = profile.city || profile.user?.city || "Pakistan";
  const title = `${name} — ${subject} Tutor in ${city}`;
  const description = profile.bio?.slice(0, 155) || `Book ${name} for ${subject} tutoring in ${city} on TUTORERA.`;
  return {
    title,
    description,
    alternates: { canonical: `/tutors/${slug}` },
    openGraph: { title: `${title} | TUTORERA`, description, url: `/tutors/${slug}` },
    twitter: { title: `${title} | TUTORERA`, description },
  };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", background: "#eef5ff", color: "#0329b2", border: "1px solid #bfdbfe", borderRadius: 6, padding: "2px 10px", fontSize: "0.8rem", fontWeight: 600, margin: "2px 3px" }}>
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#021550", borderBottom: "2px solid #eef5ff", paddingBottom: "0.4rem", marginBottom: "0.75rem" }}>{title}</h2>
      {children}
    </div>
  );
}

export default async function TutorProfilePage({ params }: Props) {
  const { slug } = await params;
  const id = extractTutorId(slug);
  if (!id) notFound();

  const profile: TutorProfile | null = await fetchTutor(id);
  if (!profile) notFound();

  const name = profile.user?.name || profile.fullName || "Tutor";
  const avatar = profile.user?.avatar;
  const city = profile.city || profile.user?.city || "";
  const country = profile.countryName || profile.user?.countryName || "";
  const avgRating = Number(profile.averageRating) || 0;
  const rate = profile.hourlyRate ?? 0;
  const currency = profile.currency || "PKR";

  const teachingLabel = profile.teachingMode === "both" ? "Online & In-Person" :
    profile.teachingMode === "online" ? "Online Only" : "In-Person Only";

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: "1.25rem" }}>
        <Link href="/" style={{ color: "#0329b2", textDecoration: "none" }}>Home</Link>
        {" › "}
        <Link href="/tutors" style={{ color: "#0329b2", textDecoration: "none" }}>Tutors</Link>
        {" › "}
        <span>{name}</span>
      </nav>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "2rem", alignItems: "start" }}>
        {/* LEFT — main profile */}
        <div>
          {/* Header card */}
          <div style={{ background: "linear-gradient(135deg,#eef5ff 0%,#fff 100%)", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", overflow: "hidden", border: "3px solid #bfdbfe", flexShrink: 0 }}>
              {avatar ? (
                <Image src={avatar} alt={name} fill sizes="96px" style={{ objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#0329b2", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "2rem", fontWeight: 800 }}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#021550", margin: 0 }}>{name}</h1>
                {profile.isVerified && (
                  <span title="Verified by TUTORERA" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 20, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}>✓ Verified</span>
                )}
              </div>
              {(city || country) && (
                <p style={{ margin: "4px 0 0", color: "#52627e", fontSize: "0.9rem" }}>📍 {[city, country].filter(Boolean).join(", ")}</p>
              )}
              {avgRating > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <StarRating rating={avgRating} />
                  <span style={{ fontSize: "0.85rem", color: "#52627e" }}>{avgRating.toFixed(1)} ({profile.totalReviews} review{profile.totalReviews !== 1 ? "s" : ""})</span>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0329b2" }}>{currency} {rate.toLocaleString()}<span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#64748b" }}>/hr</span></span>
                <Badge>{teachingLabel}</Badge>
                {profile.experience && <Badge>{profile.experience}+ yrs exp</Badge>}
                {profile.responseTimeFormatted && <Badge>Responds {profile.responseTimeFormatted}</Badge>}
              </div>
            </div>
            <ShareProfileButton tutorName={name} />
          </div>

          {/* Subjects & Levels */}
          {(profile.subjects?.length || profile.levels?.length) && (
            <Section title="Subjects & Levels">
              {profile.subjects?.length && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>SUBJECTS: </span>
                  {profile.subjects.map((s) => <Badge key={s}>{s}</Badge>)}
                </div>
              )}
              {profile.levels?.length && (
                <div>
                  <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>LEVELS: </span>
                  {profile.levels.map((l) => <Badge key={l}>{l}</Badge>)}
                </div>
              )}
              {profile.curricula?.length && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>CURRICULA: </span>
                  {profile.curricula.map((c) => <Badge key={c}>{c}</Badge>)}
                </div>
              )}
            </Section>
          )}

          {/* Bio */}
          {profile.bio && (
            <Section title="About This Tutor">
              <p style={{ color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{profile.bio}</p>
            </Section>
          )}

          {/* Video intro */}
          {profile.videoIntro && (
            <Section title="Introduction Video">
              <TutorVideoPlayer videoUrl={profile.videoIntro} tutorName={name} />
            </Section>
          )}

          {/* Education */}
          {profile.education?.length > 0 && (
            <Section title="Education">
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.education.map((edu) => (
                  <li key={edu._id} style={{ padding: "0.75rem 1rem", background: "#f8faff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <strong style={{ color: "#021550" }}>{edu.degree}</strong>
                    <span style={{ color: "#52627e", fontSize: "0.88rem" }}> — {edu.institution}{edu.year ? `, ${edu.year}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Availability */}
          {profile.availability?.length > 0 && (
            <Section title="Availability">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
                {profile.availability.filter((a) => a.slots?.length).map((a) => (
                  <div key={a.day} style={{ padding: "0.6rem 0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: "0.85rem" }}>
                    <strong style={{ color: "#15803d", display: "block" }}>{a.day}</strong>
                    <span style={{ color: "#374151" }}>{a.slots.join(", ")}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Languages */}
          {profile.languages?.length && (
            <Section title="Languages">
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {profile.languages.map((l) => <Badge key={l.language}>{l.language} ({l.proficiency})</Badge>)}
              </div>
            </Section>
          )}
        </div>

        {/* RIGHT — sticky CTA sidebar */}
        <div style={{ position: "sticky", top: "1.5rem" }}>
          <div style={{ background: "white", border: "1.5px solid #bfdbfe", borderRadius: 14, padding: "1.25rem", boxShadow: "0 4px 24px rgba(3,41,178,.08)" }}>
            <p style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0329b2", margin: "0 0 4px" }}>
              {currency} {rate.toLocaleString()}<span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>/hr</span>
            </p>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 1rem" }}>{teachingLabel}</p>
            <TutorProfileActions
              profileId={profile._id}
              tutorUserId={typeof profile.user === "object" ? profile.user._id : String(profile.user)}
              tutorName={name}
              hourlyRate={rate}
              currency={currency}
              countryCode={profile.countryCode || profile.user?.countryCode}
              subjects={profile.subjects || []}
              teachingMode={profile.teachingMode}
              city={city}
            />
          </div>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
            TUTORERA connects you with verified tutors. <Link href="/safety" style={{ color: "#0329b2" }}>Learn about safety</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
