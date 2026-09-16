"use client";

import Image from "next/image";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import axiosInstance from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import { tutorProfileHref } from "@/lib/tutor-directory";
import { Check,ExternalLink,MessageSquare,ShieldCheck,Sparkles,ThumbsDown,ThumbsUp,X } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import MatchScoreBadge from "./MatchScoreBadge";

interface MatchedTutor {
  tutor: {
    _id: string;
    name: string;
    avatar?: string;
    city?: string;
    countryName?: string;
    phone?: string;
    averageRating?: number;
    hourlyRate?: number;
    teachingModes?: string[];
    subjects?: string[];
    levels?: string[];
    curricula?: string[];
    experience?: number;
    policeCertificateVerified?: boolean;
    education?: { degree: string; field: string; institution: string }[];
  };
  score: number;
  tier: "excellent" | "great" | "good" | "fair";
  reasons: string[];
  scoreBreakdown?: Record<string, number>;
  logId?: string;
}

interface MatchedTutorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  subject: string;
  teachingMode: string;
  budget: number;
  currency?: string;
}

export default function MatchedTutorsModal({
  isOpen,
  onClose,
  requestId,
  subject,
  teachingMode,
  budget,
  currency = "PKR",
}: MatchedTutorsModalProps) {
  const [loading, setLoading] = useState(true);
  const [tutors, setTutors] = useState<MatchedTutor[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});
  const modalRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (!isOpen || !requestId) return;

    let isMounted = true;
    setLoading(true);

    axiosInstance
      .get(`/matching/requests/${requestId}/tutors?limit=10`)
      .then((res) => {
        if (isMounted) {
          const rawMatches: any[] = res.data?.matches || [];
          const normalizedMatches: MatchedTutor[] = rawMatches.map((m) => {
            const rawTier = (m.tier || "").toLowerCase();
            const tier: "excellent" | "great" | "good" | "fair" =
              rawTier === "excellent"
                ? "excellent"
                : rawTier === "great" || rawTier === "strong"
                ? "great"
                : rawTier === "good"
                ? "good"
                : "fair";

            const score = typeof m.score === "number" ? m.score : typeof m.matchScore === "number" ? m.matchScore : 75;

            return {
              ...m,
              score,
              tier,
              tutor: m.tutor || {},
              reasons: m.reasons || [],
              scoreBreakdown: m.scoreBreakdown || {},
            };
          });

          setTutors(normalizedMatches);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch matched tutors:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, requestId]);

  const handleFeedback = async (match: MatchedTutor, feedback: "helpful" | "not_relevant") => {
    const tutorId = match.tutor?._id;
    if (!tutorId) return;

    try {
      await axiosInstance.post("/matching/feedback", {
        requestId,
        tutorId,
        feedback,
      });
      setFeedbackGiven((prev) => ({ ...prev, [tutorId]: true }));
      showSuccess("Thanks for your feedback! This helps optimize your tutor matches.");
    } catch {
      showError("Unable to submit feedback.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="AI Matched Tutors" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">AI Matched Tutors</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-medium">
                  {subject} · {teachingMode}
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Ranked by qualification, availability, budget compatibility, and trust
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Finding the best qualified tutors for your request...
              </p>
            </div>
          ) : tutors.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                No direct matches found right now
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Tutors receive notifications as soon as your tuition request is published. You will receive offers directly here shortly.
              </p>
            </div>
          ) : (
            tutors.map((match) => {
              const t = match.tutor;
              const tutorId = t._id;
              const hasGivenFeedback = feedbackGiven[tutorId];

              return (
                <div
                  key={tutorId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-all bg-white dark:bg-slate-900/50 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Tutor info */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        {t.avatar ? (
                          <Image src={t.avatar} alt={t.name} className="w-full h-full object-cover"  width={100} height={100} unoptimized/>
                        ) : (
                          t.name?.charAt(0).toUpperCase() || "T"
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link
                            href={tutorProfileHref(t as any)}
                            target="_blank"
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors flex items-center gap-1 text-base"
                          >
                            {t.name}
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </Link>

                          {t.policeCertificateVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Police Verified
                            </span>
                          )}

                          <MatchScoreBadge
                            score={match.score}
                            tier={match.tier}
                            reasons={match.reasons}
                            breakdown={match.scoreBreakdown}
                            showBreakdown={true}
                          />
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          {t.city || "Pakistan"} · {t.experience ? `${t.experience} yrs exp` : "Fresh tutor"} · ★ {t.averageRating ? t.averageRating.toFixed(1) : "New"} · {currency} {t.hourlyRate?.toLocaleString() || budget.toLocaleString()}/hr
                        </p>

                        {/* Top Reasons */}
                        {match.reasons && match.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {match.reasons.slice(0, 3).map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300"
                              >
                                <Check className="w-3 h-3 text-emerald-500" />
                                {r}
                              </span>
                            ))}
                          </div>
                        )}

                        {t.education && t.education.length > 0 && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            🎓 {t.education[0].degree} {t.education[0].field ? `in ${t.education[0].field}` : ""} ({t.education[0].institution || "University"})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                      <Link
                        href={`/chat?userId=${tutorId}&subject=${encodeURIComponent(subject)}`}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow transition-all inline-flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message Tutor
                      </Link>

                      {/* Feedback icons */}
                      {!hasGivenFeedback ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>Match quality:</span>
                          <button
                            onClick={() => handleFeedback(match, "helpful")}
                            className="p-1 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Helpful match"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(match, "not_relevant")}
                            className="p-1 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Not relevant"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">Feedback recorded ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Matches update in real-time as tutors respond and update availability.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
