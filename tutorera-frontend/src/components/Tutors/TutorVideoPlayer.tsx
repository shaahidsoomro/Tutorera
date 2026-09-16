"use client";

import AvatarImage from "@/components/Common/AvatarImage";
import { Calendar,CheckCircle2,Film,Play,ShieldCheck,Sparkles,Video } from "lucide-react";
import { useState } from "react";

interface TutorVideoPlayerProps {
  videoUrl?: string | null;
  tutorName: string;
  posterUrl?: string;
  subjects?: string[];
  city?: string;
  hourlyRate?: number;
  currency?: string;
  tutorUserId?: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=0&rel=0` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function getLoomEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  return match ? `https://www.loom.com/embed/${match[1]}` : null;
}

export default function TutorVideoPlayer({
  videoUrl,
  tutorName,
  posterUrl,
  subjects = [],
}: TutorVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const cleanUrl = videoUrl?.trim() || "";
  const youtubeUrl = getYouTubeEmbedUrl(cleanUrl);
  const vimeoUrl = getVimeoEmbedUrl(cleanUrl);
  const loomUrl = getLoomEmbedUrl(cleanUrl);
  const hasVideo = Boolean(cleanUrl);

  const scrollToBooking = () => {
    if (typeof document !== "undefined") {
      const el = document.getElementById("booking-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  };

  // ─── IF VIDEO EXISTS ───
  if (hasVideo) {
    return (
      <section
        aria-label="Tutor Video Introduction"
        style={{
          background: "linear-gradient(145deg, #07153b 0%, #021550 100%)",
          borderRadius: 18,
          padding: "1.5rem",
          color: "white",
          boxShadow: "0 12px 32px -10px rgba(2, 21, 80, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: "rgba(200, 27, 127, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f472b6",
                border: "1px solid rgba(200, 27, 127, 0.4)",
              }}
            >
              <Film size={20} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                Demo Video & Teaching Style
              </h2>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
                Watch {tutorName}&apos;s explanation methodology, communication & concept delivery
              </p>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              backgroundColor: "rgba(16, 185, 129, 0.18)",
              color: "#86efac",
              padding: "0.35rem 0.85rem",
              borderRadius: 999,
              fontSize: "0.78rem",
              fontWeight: 700,
              border: "1px solid rgba(16, 185, 129, 0.4)",
            }}
          >
            <ShieldCheck size={15} />
            <span>Verified Demo Video</span>
          </div>
        </div>

        {/* Video Player Container */}
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "56.25%", // 16:9 Aspect Ratio
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#000",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {youtubeUrl ? (
            <iframe
              src={youtubeUrl}
              title={`${tutorName}'s demo lecture`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          ) : vimeoUrl ? (
            <iframe
              src={vimeoUrl}
              title={`${tutorName}'s demo lecture`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          ) : loomUrl ? (
            <iframe
              src={loomUrl}
              title={`${tutorName}'s demo lecture`}
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          ) : (
            <>
              <video
                src={cleanUrl}
                poster={posterUrl}
                controls
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  backgroundColor: "#040c21",
                }}
              />
              {!isPlaying && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "radial-gradient(circle, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      backgroundColor: "rgba(200, 27, 127, 0.92)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      boxShadow: "0 0 25px rgba(200, 27, 127, 0.7)",
                      border: "2px solid rgba(255,255,255,0.8)",
                    }}
                  >
                    <Play size={26} style={{ marginLeft: 3 }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pro Tip */}
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            fontSize: "0.82rem",
            color: "#94a3b8",
            lineHeight: 1.5,
          }}
        >
          <Sparkles size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong style={{ color: "#f8fafc" }}>Student Recommendation:</strong> Assess {tutorName}&apos;s
            explanation pace, concept clarity, and accent to ensure it suits your learning preferences before
            scheduling regular sessions.
          </span>
        </div>
      </section>
    );
  }

  // ─── IF NO VIDEO UPLOADED YET (LIVE INTERACTIVE DEMO PRESENTATION) ───
  return (
    <section
      aria-label="Tutor Demo & Trial Session"
      style={{
        background: "linear-gradient(145deg, #07153b 0%, #021550 100%)",
        borderRadius: 18,
        padding: "1.5rem",
        color: "white",
        boxShadow: "0 12px 32px -10px rgba(2, 21, 80, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: "rgba(3, 41, 178, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#93c5fd",
              border: "1px solid rgba(147, 197, 253, 0.3)",
            }}
          >
            <Video size={20} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Demo Video & Interactive Trial
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#cbd5e1" }}>
              Experience {tutorName}&apos;s teaching style via live 1-on-1 interactive demonstration
            </p>
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            backgroundColor: "rgba(16, 185, 129, 0.18)",
            color: "#86efac",
            padding: "0.35rem 0.85rem",
            borderRadius: 999,
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "1px solid rgba(16, 185, 129, 0.4)",
          }}
        >
          <Sparkles size={14} />
          <span>Live Demo Available</span>
        </div>
      </div>

      {/* Cinematic Preview & Trial Invitation Card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 14,
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(8, 26, 80, 0.95) 0%, rgba(3, 14, 45, 0.98) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          padding: "2.25rem 1.5rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Subtle Ambient Glows */}
        <div
          style={{
            position: "absolute",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200, 27, 127, 0.25) 0%, transparent 70%)",
            top: "-30px",
            right: "-30px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(3, 41, 178, 0.35) 0%, transparent 70%)",
            bottom: "-30px",
            left: "-30px",
            pointerEvents: "none",
          }}
        />

        {/* Tutor Avatar with Active Live Badge */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <AvatarImage
            src={posterUrl || null}
            alt={tutorName}
            name={tutorName}
            size={76}
            style={{
              border: "3px solid #ffffff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: "#10b981",
              borderRadius: "50%",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #07153b",
              color: "white",
            }}
            title="Available for Demo Session"
          >
            <Play size={12} fill="white" style={{ marginLeft: 1 }} />
          </div>
        </div>

        <h3
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            color: "#ffffff",
            margin: "0 0 0.5rem",
            letterSpacing: "-0.01em",
          }}
        >
          Meet {tutorName} in a 1-on-1 Interactive Demo
        </h3>

        <p
          style={{
            fontSize: "0.88rem",
            color: "#cbd5e1",
            maxWidth: 580,
            lineHeight: 1.6,
            margin: "0 0 1.5rem",
          }}
        >
          {tutorName} conducts live, interactive sessions. Request a trial lesson to test the digital
          whiteboard, review your specific curriculum (
          <strong style={{ color: "#93c5fd" }}>{subjects.slice(0, 2).join(", ") || "tuition"}</strong>
          ), and ensure full teaching compatibility before committing to a package.
        </p>

        {/* Feature Highlights Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.75rem",
            width: "100%",
            maxWidth: 620,
            marginBottom: "1.75rem",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              padding: "0.75rem 0.85rem",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#86efac", fontWeight: 700, fontSize: "0.82rem" }}>
              <CheckCircle2 size={15} />
              <span>Live Whiteboard</span>
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
              Real-time problem solving, equations & diagrams
            </p>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              padding: "0.75rem 0.85rem",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#93c5fd", fontWeight: 700, fontSize: "0.82rem" }}>
              <CheckCircle2 size={15} />
              <span>Syllabus Alignment</span>
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
              Targeted past papers & exam-focused strategy
            </p>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              padding: "0.75rem 0.85rem",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#f472b6", fontWeight: 700, fontSize: "0.82rem" }}>
              <CheckCircle2 size={15} />
              <span>100% Refundable</span>
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
              TUTORERA guarantee if first lesson is not satisfactory
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={scrollToBooking}
          type="button"
          style={{
            backgroundColor: "#0329B2",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: "0.85rem 1.75rem",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: "0.92rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 6px 20px rgba(3, 41, 178, 0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#02208a";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0329B2";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Calendar size={18} />
          <span>Book 1-on-1 Trial Session</span>
        </button>
      </div>

      <p
        style={{
          fontSize: "0.78rem",
          color: "#94a3b8",
          marginTop: "0.85rem",
          textAlign: "center",
          lineHeight: 1.5,
          marginBottom: 0,
        }}
      >
        💡 <strong>Pro tip for students:</strong> You can discuss timetable slots, customized test series, and specific chapter weaknesses directly with {tutorName}.
      </p>
    </section>
  );
}
