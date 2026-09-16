"use client";

import { Award,CheckCircle2,ChevronDown,Info,ShieldCheck,Sparkles,Zap } from "lucide-react";
import { useState } from "react";

export interface MatchScoreBadgeProps {
  score?: number;
  tier?: "excellent" | "great" | "good" | "fair";
  reasons?: string[];
  breakdown?: {
    eligibility?: number;
    subjectExpertise?: number;
    curriculumExperience?: number;
    budgetCompatibility?: number;
    locationFeasibility?: number;
    scheduleAvailability?: number;
    studentFeedback?: number;
    responseRate?: number;
    completionRate?: number;
    policeVerification?: number;
    languageMatch?: number;
    genderPreference?: number;
    [key: string]: number | undefined;
  };
  compact?: boolean;
  showBreakdown?: boolean;
}

export default function MatchScoreBadge({
  score = 75,
  tier = "good",
  reasons = [],
  breakdown,
  compact = false,
  showBreakdown = false,
}: MatchScoreBadgeProps) {
  const [open, setOpen] = useState(false);

  // Derive tier if not provided
  const derivedTier = tier || (score >= 90 ? "excellent" : score >= 80 ? "great" : score >= 70 ? "good" : "fair");

  const tierConfig = {
    excellent: {
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      badgeGradient: "from-emerald-500 to-teal-600 text-white",
      label: "Excellent Match",
      iconColor: "text-emerald-500",
    },
    great: {
      bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
      badgeGradient: "from-blue-600 to-indigo-600 text-white",
      label: "Great Match",
      iconColor: "text-blue-500",
    },
    good: {
      bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
      badgeGradient: "from-purple-600 to-violet-600 text-white",
      label: "Good Match",
      iconColor: "text-purple-500",
    },
    fair: {
      bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
      badgeGradient: "from-amber-600 to-orange-600 text-white",
      label: "Fair Match",
      iconColor: "text-amber-500",
    },
  }[derivedTier] || {
    bg: "bg-gray-500/10 text-gray-700 border-gray-500/25",
    badgeGradient: "from-gray-600 to-slate-700 text-white",
    label: "Compatible",
    iconColor: "text-gray-500",
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow active:scale-95 ${tierConfig.bg}`}
        aria-expanded={open}
        aria-label={`Match score ${score}%, ${tierConfig.label}. Click to see why.`}
      >
        <span className={`inline-flex items-center justify-center p-0.5 rounded-full bg-gradient-to-r ${tierConfig.badgeGradient}`}>
          <Sparkles className="w-3 h-3 text-white animate-pulse" />
        </span>
        <span className="font-bold">{score}% Match</span>
        {!compact && (
          <>
            <span className="opacity-40">·</span>
            <span className="hidden sm:inline font-medium">{tierConfig.label}</span>
          </>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 opacity-60 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop click dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Details Dropdown / Popover */}
          <div className="absolute left-0 mt-2 w-80 max-w-[90vw] sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-xl bg-gradient-to-br ${tierConfig.badgeGradient}`}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-slate-900 dark:text-white">{score}% Match</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${tierConfig.bg}`}>
                      {tierConfig.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">TUTORERA Smart Recommendation Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Why This Tutor Matches */}
            <div className="py-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-blue-500" />
                Why this match is suitable
              </h4>
              {reasons && reasons.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Matches key subject, teaching mode, and schedule preferences.</p>
              )}
            </div>

            {/* Component Breakdown (if available) */}
            {breakdown && showBreakdown && Object.keys(breakdown).length > 0 && (
              <div className="pt-2 pb-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  Compatibility Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {breakdown.subjectExpertise !== undefined && (
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block">Subject Fit</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">+{breakdown.subjectExpertise} pts</span>
                    </div>
                  )}
                  {breakdown.curriculumExperience !== undefined && (
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block">Curriculum</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">+{breakdown.curriculumExperience} pts</span>
                    </div>
                  )}
                  {breakdown.budgetCompatibility !== undefined && (
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block">Price Affordability</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">+{breakdown.budgetCompatibility} pts</span>
                    </div>
                  )}
                  {breakdown.studentFeedback !== undefined && (
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block">Student Reviews</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">+{breakdown.studentFeedback} pts</span>
                    </div>
                  )}
                  {breakdown.policeVerification !== undefined && (
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                      <span className="text-emerald-700 dark:text-emerald-400 block">Police Verified</span>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">+{breakdown.policeVerification} pts</span>
                    </div>
                  )}
                  {breakdown.responseRate !== undefined && (
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block">Responsiveness</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">+{breakdown.responseRate} pts</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Zero Commission / Impartiality Guarantee */}
            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                <strong>100% Impartial:</strong> Scored strictly on compatibility & trust. Never promoted for extra fees or commissions.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
