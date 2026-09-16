"use client";

import AvatarImage from "@/components/Common/AvatarImage";
import { AdminDialog,AdminEmptyState,AdminErrorState,AdminMetricCard } from "@/components/admin/AdminUI";
import MatchScoreBadge from "@/components/marketplace/MatchScoreBadge";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import { tutorProfileHref } from "@/lib/tutor-directory";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Play,
  Save,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";

interface MatchAnalytics {
  totalMatches: number;
  avgMatchScore: number | null;
  totalOffers: number;
  totalBookings: number;
  offerConversionRate: number;
  bookingConversionRate: number;
  avgStudentResponseMinutes: number | null;
  generatedAt: string;
  hasData: boolean;
  tierDistribution: {
    excellent: number;
    great: number;
    good: number;
    fair: number;
  };
}

interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  mode: string;
  algorithmVersion: string;
  countryCode: string;
  city: string;
  subject: string;
}

const EMPTY_ANALYTICS_FILTERS: AnalyticsFilters = {
  dateFrom: "", dateTo: "", mode: "", algorithmVersion: "", countryCode: "", city: "", subject: "",
};

export default function AdminMatchingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"analytics" | "weights" | "simulator">("analytics");
  const [analytics, setAnalytics] = useState<MatchAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>(EMPTY_ANALYTICS_FILTERS);
  const [appliedAnalyticsFilters, setAppliedAnalyticsFilters] = useState<AnalyticsFilters>(EMPTY_ANALYTICS_FILTERS);
  const [config, setConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState("");
  const [configHistory, setConfigHistory] = useState<any[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [confirmingConfig, setConfirmingConfig] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<{ id: string; revision: number } | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollingBack, setRollingBack] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"online" | "home">("online");

  // Simulator states
  const [simMode, setSimMode] = useState<"live" | "custom">("live");
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [customRequest, setCustomRequest] = useState({
    subject: "Mathematics",
    level: "O-Level",
    curriculum: "Cambridge O-Level",
    teachingMode: "online",
    city: "Lahore",
    budget: 2500,
    pricingUnit: "hour",
    currency: "PKR",
    schedule: "Evening",
    tutorGenderPreference: "none",
  });
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [dispatchingWave, setDispatchingWave] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setAnalyticsError("");
    try {
      const params = Object.fromEntries(Object.entries(appliedAnalyticsFilters).filter(([, value]) => value.trim()));
      const res = await api.get("/matching/admin/analytics", { params });
      setAnalytics(res.data.analytics);
    } catch (err) {
      console.error("Failed to load matching analytics:", err);
      setAnalyticsError("Matching analytics could not be loaded. Values are unavailable, not zero.");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [appliedAnalyticsFilters]);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    setConfigError("");
    try {
      const res = await api.get("/matching/admin/config");
      setConfig(res.data.config);
    } catch (err) {
      console.error("Failed to load matching config:", err);
      setConfigError("The active matching configuration could not be loaded.");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchLiveRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get("/requests?status=open,published,receiving_offers&limit=30");
      const list = res.data?.requests || res.data?.data || [];
      setLiveRequests(list);
      setSelectedRequestId((current) => current || list[0]?._id || "");
    } catch (err) {
      console.error("Failed to load live requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const fetchConfigHistory = useCallback(async () => {
    try {
      const res = await api.get("/matching/admin/config/history");
      setConfigHistory(res.data.history || []);
    } catch {
      setConfigHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchConfig();
    fetchLiveRequests();
    fetchConfigHistory();
  }, [fetchAnalytics, fetchConfig, fetchConfigHistory, fetchLiveRequests]);

  const handleWeightChange = (mode: "online" | "home", key: string, value: number) => {
    if (!config) return;
    const modeKey = mode === "online" ? "onlineWeights" : "homeWeights";
    setConfig({
      ...config,
      [modeKey]: {
        ...config[modeKey],
        [key]: value,
      },
    });
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const payload = {
        algorithmVersion: config.algorithmVersion,
        onlineWeights: config.onlineWeights,
        homeWeights: config.homeWeights,
        thresholds: config.thresholds,
        bayesian: config.bayesian,
        coldStart: config.coldStart,
        expectedUpdatedAt: config.updatedAt || undefined,
        changeReason,
      };
      await api.put("/matching/admin/config", payload);
      showSuccess("Matching weights successfully saved and activated in memory!");
      setConfirmingConfig(false);
      setChangeReason("");
      fetchConfig();
      fetchConfigHistory();
    } catch {
      showError("Failed to update matching configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRollbackConfig = async (historyId: string, revision: number) => {
    setRollingBack(true);
    try {
      await api.post(`/matching/admin/config/history/${historyId}/rollback`, { reason: rollbackReason });
      showSuccess(`Matching configuration rolled back to revision ${revision}.`);
      setRollbackTarget(null);
      setRollbackReason("");
      await Promise.all([fetchConfig(), fetchConfigHistory()]);
    } catch (err) {
      showError(err, "Failed to roll back matching configuration.");
    } finally {
      setRollingBack(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const payload =
        simMode === "live"
          ? { requestId: selectedRequestId, limit: 25 }
          : { customRequest, limit: 25 };

      const res = await api.post("/matching/admin/simulate", payload);
      setSimulationResult(res.data);
      showSuccess(`Smart matching evaluated: found ${res.data.totalRanked} candidate tutors.`);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to execute matching simulation.");
    } finally {
      setSimulating(false);
    }
  };

  const handleDispatchNotificationWave = async (requestId: string) => {
    if (!requestId) return;
    setDispatchingWave(true);
    try {
      await api.post(`/admin/at-risk/requests/${requestId}/action`, { action: "rematch" });
      showSuccess("Tutor notification wave dispatched.");
      setDispatchTarget(null);
    } catch {
      showError("Failed to trigger match dispatch wave.");
    } finally {
      setDispatchingWave(false);
    }
  };

  const currentWeights = config ? (selectedMode === "online" ? config.onlineWeights : config.homeWeights) : null;
  const currentWeightTotal = currentWeights
    ? Object.values(currentWeights).reduce((sum: number, value) => sum + Number(value || 0), 0)
    : 0;
  const isSuperAdmin = user?.adminRole === "super_admin" || user?.adminPermissions?.includes("*");
  const canConfigure = Boolean(isSuperAdmin || user?.adminRole === "marketplace_operations" || user?.adminPermissions?.includes("matching.configure"));
  const canSimulate = Boolean(isSuperAdmin || user?.adminRole === "marketplace_operations" || user?.adminPermissions?.includes("matching.simulate"));
  const tierDist = analytics?.tierDistribution || { excellent: 0, great: 0, good: 0, fair: 0 };
  const totalMatchesCount = analytics?.totalMatches || 0;
  const hasAnalyticsFilters = Object.values(appliedAnalyticsFilters).some(Boolean);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <header className="rounded-2xl border border-blue-800/50 bg-gradient-to-r from-[#021550] via-blue-950 to-slate-950 p-5 text-white shadow-lg sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/15 p-2.5 text-cyan-300">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Smart Tutor Matching</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">
                {config?.algorithmVersion || "Version unavailable"}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-blue-100/85">
              Monitor compatibility, conversion, safeguards, and explainable tutor rankings.
            </p>
          </div>
        </div>
      </header>

      <div
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        role="tablist"
        aria-label="Matching administration views"
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
          const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
          if (currentIndex < 0 || tabs.length === 0) return;
          event.preventDefault();
          const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length : (currentIndex - 1 + tabs.length) % tabs.length;
          tabs[nextIndex].focus();
          tabs[nextIndex].click();
        }}
      >
        <div className="flex min-w-max gap-1">
          <button
            type="button" role="tab" id="matching-tab-analytics"
            aria-selected={activeTab === "analytics"} aria-controls="matching-panel-analytics"
            tabIndex={activeTab === "analytics" ? 0 : -1}
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${
              activeTab === "analytics"
                ? "bg-blue-50 text-blue-900 shadow-sm dark:bg-blue-950 dark:text-blue-100"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Analytics & Conversion
          </button>
          {canSimulate && <button
            type="button" role="tab" id="matching-tab-simulator"
            aria-selected={activeTab === "simulator"} aria-controls="matching-panel-simulator"
            tabIndex={activeTab === "simulator" ? 0 : -1}
            onClick={() => setActiveTab("simulator")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${
              activeTab === "simulator"
                ? "bg-blue-50 text-blue-900 shadow-sm dark:bg-blue-950 dark:text-blue-100"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Match Simulator
          </button>}
          <button
            type="button" role="tab" id="matching-tab-weights"
            aria-selected={activeTab === "weights"} aria-controls="matching-panel-weights"
            tabIndex={activeTab === "weights" ? 0 : -1}
            onClick={() => setActiveTab("weights")}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${
              activeTab === "weights"
                ? "bg-blue-50 text-blue-900 shadow-sm dark:bg-blue-950 dark:text-blue-100"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Algorithm Weights
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === "analytics" && (
        <div id="matching-panel-analytics" role="tabpanel" aria-labelledby="matching-tab-analytics" className="space-y-6">
          <form
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            onSubmit={(event) => { event.preventDefault(); setAppliedAnalyticsFilters(analyticsFilters); }}
            aria-label="Filter matching analytics"
          >
            <div className="flex flex-wrap items-end gap-3">
              {([
                ["dateFrom", "From", "date", ""], ["dateTo", "To", "date", ""],
                ["algorithmVersion", "Algorithm", "text", "e.g. RULE_V1"], ["countryCode", "Country", "text", "e.g. PK"],
                ["city", "City", "text", "e.g. Lahore"], ["subject", "Subject", "text", "e.g. Mathematics"],
              ] as const).map(([key, label, type, placeholder]) => (
                <label key={key} className="min-w-36 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {label}
                  <input type={type} value={analyticsFilters[key]} placeholder={placeholder} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
              ))}
              <label className="min-w-36 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Mode
                <select value={analyticsFilters.mode} onChange={(event) => setAnalyticsFilters((current) => ({ ...current, mode: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="">All modes</option><option value="online">Online</option><option value="in-person">Home tuition</option><option value="both">Both</option>
                </select>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">Apply</button>
                <button type="button" disabled={!hasAnalyticsFilters && !Object.values(analyticsFilters).some(Boolean)} onClick={() => { setAnalyticsFilters(EMPTY_ANALYTICS_FILTERS); setAppliedAnalyticsFilters(EMPTY_ANALYTICS_FILTERS); }} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Clear</button>
              </div>
            </div>
          </form>
          {analyticsError && <AdminErrorState message={analyticsError} onRetry={fetchAnalytics} />}
          {analytics?.generatedAt && <p className="text-right text-xs text-slate-500">Data refreshed {new Date(analytics.generatedAt).toLocaleString()}</p>}
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Match Evaluations</span>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {loadingAnalytics ? "…" : analytics?.totalMatches !== undefined ? analytics.totalMatches.toLocaleString() : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Across student requests & offers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Average Match Score</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {loadingAnalytics ? "…" : analytics?.avgMatchScore != null ? `${analytics.avgMatchScore}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Target compatibility threshold: &ge; 70%</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Offer Conversion</span>
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics?.offerConversionRate !== undefined ? `${analytics.offerConversionRate}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Matches converting to formal tutor offers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Booking Conversion</span>
                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics?.bookingConversionRate !== undefined ? `${analytics.bookingConversionRate}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Matches leading to paid student bookings</p>
            </div>
            <AdminMetricCard
              loading={loadingAnalytics}
              label="Response time"
              value={analytics?.avgStudentResponseMinutes != null ? `${analytics.avgStudentResponseMinutes} min` : "—"}
              detail="Notification to tutor offer"
              icon={<Clock className="h-4 w-4 text-amber-600" />}
            />
          </div>

          {!loadingAnalytics && !analyticsError && analytics && !analytics.hasData && (
            <AdminEmptyState title="No matching evaluations yet" description="Analytics will appear after eligible tutors are evaluated against live student requests." />
          )}

          {/* Tier Breakdown & Marketplace Fairness */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Tier Distribution */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Match Score Tier Distribution
                </h3>
                <span className="text-xs text-slate-400">All-Time Live Data</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400">Excellent Match (&ge; 90%)</span>
                    <span>{tierDist.excellent}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
                      style={{
                        width: `${totalMatchesCount > 0 ? Math.round((tierDist.excellent / totalMatchesCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-blue-600 dark:text-blue-400">Great Match (80 - 89%)</span>
                    <span>{tierDist.great}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
                      style={{
                        width: `${totalMatchesCount > 0 ? Math.round((tierDist.great / totalMatchesCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-purple-600 dark:text-purple-400">Good Match (70 - 79%)</span>
                    <span>{tierDist.good}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-[width] duration-200"
                      style={{
                        width: `${totalMatchesCount > 0 ? Math.round((tierDist.good / totalMatchesCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-600 dark:text-amber-400">Fair Match (60 - 69%)</span>
                    <span>{tierDist.fair}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-[width] duration-200"
                      style={{
                        width: `${totalMatchesCount > 0 ? Math.round((tierDist.fair / totalMatchesCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Principles & Safety Checks */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Algorithm Fairness & Trust Rules
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                  Configured safeguards
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block">Zero Platform Revenue Bias</strong>
                    Matches are scored strictly on student-tutor compatibility and quality, never to maximize platform fees.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block">Home Tuition Police Verification Gate</strong>
                    Tutors cannot receive home tuition match notifications or rank for home requests without verified police clearance.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white block">Bayesian Cold-Start Protection</strong>
                    Prior rating (C = {config?.bayesian?.priorMean ?? "configured"}, m = {config?.bayesian?.minimumReviews ?? "configured"}) protects new tutors from sparse-data distortion while preserving student trust.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATCH SIMULATOR & DIAGNOSTICS */}
      {activeTab === "simulator" && (
        <div id="matching-panel-simulator" role="tabpanel" aria-labelledby="matching-tab-simulator" className="space-y-6">
          {/* Simulator Control Console */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-cyan-600 fill-cyan-600" />
                  Live Match Simulation & Diagnostics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Evaluate smart matching against live requests or test custom parameters to verify eligibility, scoring breakdown, and explainability reasons.
                </p>
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Simulation source">
                <button
                  type="button"
                  role="tab"
                  aria-selected={simMode === "live"}
                  aria-controls="simulation-live-panel"
                  onClick={() => setSimMode("live")}
                  className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,box-shadow] duration-150 ${
                    simMode === "live"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Live Student Request
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={simMode === "custom"}
                  aria-controls="simulation-custom-panel"
                  onClick={() => setSimMode("custom")}
                  className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,box-shadow] duration-150 ${
                    simMode === "custom"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Custom Test Sandbox
                </button>
              </div>
            </div>

            {/* Input Selection */}
            {simMode === "live" ? (
              <div id="simulation-live-panel" role="tabpanel" className="space-y-3">
                <label htmlFor="live-request" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Active Student Request:
                </label>
                {loadingRequests ? (
                  <div className="text-xs text-slate-500 py-3">Loading active requests...</div>
                ) : liveRequests.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs border border-amber-200 dark:border-amber-900">
                    No active student requests found currently. Switch to <strong>Custom Test Sandbox</strong> to simulate arbitrary requirements.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      id="live-request"
                      value={selectedRequestId}
                      onChange={(e) => setSelectedRequestId(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {liveRequests.map((req) => (
                        <option key={req._id} value={req._id}>
                          {req.subject} ({req.level}) · {req.currency || "PKR"} {req.budget?.toLocaleString()}/{req.pricingUnit || "hr"} · {req.teachingMode === "online" ? "Online" : req.city || "Home"} · Student: {req.student?.name || "Student"}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleRunSimulation}
                      disabled={simulating || !selectedRequestId}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow transition-[background-color,box-shadow,transform] duration-150 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      {simulating ? "Evaluating..." : "Run Match Evaluation"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div id="simulation-custom-panel" role="tabpanel" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="simulation-subject" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Subject</label>
                    <input
                      id="simulation-subject"
                      type="text"
                      value={customRequest.subject}
                      onChange={(e) => setCustomRequest({ ...customRequest, subject: e.target.value })}
                      placeholder="e.g. Mathematics, Physics..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="simulation-level" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Level</label>
                    <select
                      id="simulation-level"
                      value={customRequest.level}
                      onChange={(e) => setCustomRequest({ ...customRequest, level: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="Primary">Primary (1-5)</option>
                      <option value="Middle">Middle (6-8)</option>
                      <option value="Matric">Matric</option>
                      <option value="Intermediate">Intermediate / FSc</option>
                      <option value="O-Level">O-Level (Cambridge)</option>
                      <option value="A-Level">A-Level (Cambridge)</option>
                      <option value="University">University</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="simulation-mode" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Teaching Mode</label>
                    <select
                      id="simulation-mode"
                      value={customRequest.teachingMode}
                      onChange={(e) => setCustomRequest({ ...customRequest, teachingMode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="online">Online Worldwide</option>
                      <option value="in-person">In-Person Home Tuition</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="simulation-city" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">City (for Home Mode)</label>
                    <input
                      id="simulation-city"
                      type="text"
                      value={customRequest.city}
                      onChange={(e) => setCustomRequest({ ...customRequest, city: e.target.value })}
                      placeholder="e.g. Lahore, Karachi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="simulation-budget" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Student Budget</label>
                    <input
                      id="simulation-budget"
                      type="number"
                      value={customRequest.budget}
                      onChange={(e) => setCustomRequest({ ...customRequest, budget: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="simulation-pricing-unit" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Pricing Unit</label>
                    <select
                      id="simulation-pricing-unit"
                      value={customRequest.pricingUnit}
                      onChange={(e) => setCustomRequest({ ...customRequest, pricingUnit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="hour">Per Hour</option>
                      <option value="month">Per Month (12 sessions)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="simulation-currency" className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Currency</label>
                    <select
                      id="simulation-currency"
                      value={customRequest.currency}
                      onChange={(e) => setCustomRequest({ ...customRequest, currency: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="PKR">PKR (Rs.)</option>
                      <option value="USD">USD ($)</option>
                      <option value="AED">AED</option>
                      <option value="SAR">SAR</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRunSimulation}
                      disabled={simulating}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow transition-[background-color,box-shadow,transform] duration-150 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      {simulating ? "Evaluating..." : "Run Evaluation"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simulation Output */}
          {simulationResult && (
            <div className="space-y-6">
              {/* Summary Stats Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Eligible Pool</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {simulationResult.totalEligible} tutors
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Ranked Matches</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {simulationResult.totalRanked} tutors
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">High Compatibility (&ge;80%)</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {(simulationResult.tierSummary?.excellent || 0) + (simulationResult.tierSummary?.great || 0)} tutors
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Operations Action</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dispatch Notification Wave</span>
                  </div>
                  {simMode === "live" && (
                    <button
                      type="button"
                      onClick={() => setDispatchTarget(selectedRequestId)}
                      disabled={dispatchingWave}
                      className="min-h-11 min-w-11 rounded-xl bg-indigo-600 p-2 text-white shadow transition-[background-color,box-shadow,transform] duration-150 hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                      aria-label="Dispatch tutor notification wave"
                      title="Review tutor notification wave"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Match Cards List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Ranked Tutor Candidates ({simulationResult.matches?.length || 0})
                </h3>

                {simulationResult.matches?.length === 0 ? (
                  <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                    No tutors met the hard eligibility criteria (check subject, city for home mode, or police verification requirements).
                  </div>
                ) : (
                  simulationResult.matches.map((match: any, index: number) => {
                    const tutor = match.tutor;
                    const score = match.score ?? match.matchScore ?? 0;
                    const tier = match.tier === "strong" ? "great" : match.tier === "other" ? "fair" : match.tier;

                    return (
                      <div
                        key={tutor._id || index}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-800 transition-[border-color,box-shadow] duration-150"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          {/* Tutor Identity */}
                          <div className="flex items-start gap-3.5 flex-1">
                            <span className="font-black text-slate-300 dark:text-slate-700 text-lg w-6 shrink-0 mt-1">
                              #{index + 1}
                            </span>

                            <AvatarImage src={tutor.avatar} alt={`${tutor.name || "Tutor"} profile`} name={tutor.name || "Tutor"} size={48} />

                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={tutorProfileHref(tutor)}
                                  target="_blank"
                                  className="font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors flex items-center gap-1 text-sm"
                                >
                                  {tutor.name}
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                </Link>

                                {tutor.policeCertificateVerified && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                    <ShieldCheck className="w-3 h-3" /> Police Verified
                                  </span>
                                )}

                                {match.isColdStartExploration && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                                    🌟 Rising Explorer
                                  </span>
                                )}

                                <MatchScoreBadge
                                  score={score}
                                  tier={tier}
                                  reasons={match.reasons}
                                  breakdown={match.scoreBreakdown}
                                  showBreakdown={true}
                                />
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                <span>📍 {tutor.city || "Pakistan"}</span>
                                <span>•</span>
                                <span>💼 {tutor.experience ? `${tutor.experience} yrs exp` : "1 yr exp"}</span>
                                <span>•</span>
                                <span>★ {tutor.averageRating ? tutor.averageRating.toFixed(1) : "New (4.85)"}</span>
                                <span>•</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {tutor.currency || "PKR"} {tutor.hourlyRate ? tutor.hourlyRate.toLocaleString() : "2,500"}/hr
                                </span>
                              </div>

                              {tutor.education && tutor.education.length > 0 && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  🎓 {tutor.education[0].degree} {tutor.education[0].field ? `in ${tutor.education[0].field}` : ""} ({tutor.education[0].institution || "University"})
                                </p>
                              )}

                              {/* Explainability Reasons */}
                              {match.reasons && match.reasons.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1.5">
                                  {match.reasons.map((r: string, i: number) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score Breakdown Radar/Pills */}
                          {match.scoreBreakdown && (
                            <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 shrink-0 text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Point Breakdown:
                              </span>
                              {Object.entries(match.scoreBreakdown).map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center text-slate-500">
                                  <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {Number(v)} pts
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALGORITHM WEIGHTS */}
      {activeTab === "weights" && (
        <div id="matching-panel-weights" role="tabpanel" aria-labelledby="matching-tab-weights" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          {configError && <AdminErrorState message={configError} onRetry={fetchConfig} />}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                Live Weight Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review scoring parameters for Online and Home Tuition. Each mode must total exactly 100 points.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedMode("online")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-[background-color,color,box-shadow] duration-150 ${
                    selectedMode === "online"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Online Mode
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode("home")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-[background-color,color,box-shadow] duration-150 ${
                    selectedMode === "home"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Home Tuition Mode
                </button>
              </div>

              <button
                type="button"
                onClick={() => setConfirmingConfig(true)}
                disabled={savingConfig || !canConfigure || currentWeightTotal !== 100}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-[background-color,box-shadow,transform] duration-150 disabled:opacity-50"
                title={!canConfigure ? "You do not have permission to change matching weights" : currentWeightTotal !== 100 ? "Weights must total exactly 100 points" : undefined}
              >
                <Save className="w-4 h-4" />
                {savingConfig ? "Saving..." : canConfigure ? "Save Changes" : "Read only"}
              </button>
            </div>
          </div>

          <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${currentWeightTotal === 100 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`} aria-live="polite">
            <span>{selectedMode === "online" ? "Online" : "Home tuition"} weight total</span>
            <span>{currentWeightTotal} / 100 points</span>
          </div>

          {/* Weight Sliders */}
          {loadingConfig ? (
            <div className="py-12 text-center text-slate-500" role="status">Loading configuration…</div>
          ) : currentWeights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(currentWeights).map(([key, val]) => {
                const numericVal = Number(val) || 0;
                const readableLabel = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div
                    key={key}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{readableLabel}</span>
                      <span className="font-black px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                        {numericVal} pts
                      </span>
                    </div>

                    <input
                      aria-label={`${readableLabel} matching weight`}
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={numericVal}
                      onChange={(e) =>
                        handleWeightChange(selectedMode, key, Number(e.target.value))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />

                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0 pts (Disabled)</span>
                      <span>40 pts (Dominant)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Footer information */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong>Instant Cache Invalidation:</strong> Updates immediately flush the memory cache and take effect on all new student requests, offer rankings, and progressive tutor notification waves without requiring server restarts.
            </div>
          </div>

          <section aria-labelledby="configuration-history-title" className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div>
              <h2 id="configuration-history-title" className="text-base font-bold text-slate-950 dark:text-white">Configuration history</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Recent audited revisions can be restored without deleting newer history.</p>
            </div>
            {configHistory.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">No configuration changes have been recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {configHistory.slice(0, 8).map((entry) => (
                  <div key={entry._id} className="flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Revision {entry.revision}: {entry.changeReason}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{entry.changedBy?.name || "Administrator"} · {new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    {canConfigure && <button type="button" onClick={() => setRollbackTarget({ id: entry._id, revision: entry.revision })} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Restore this revision</button>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <AdminDialog open={confirmingConfig} onClose={() => !savingConfig && setConfirmingConfig(false)} title="Confirm matching configuration" description="This immediately changes ranking for new requests. The current version remains available in history for rollback." footer={<><button type="button" onClick={() => setConfirmingConfig(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={handleSaveConfig} disabled={savingConfig || changeReason.trim().length < 8} className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{savingConfig ? "Saving…" : "Confirm and activate"}</button></>}>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800"><div><dt className="text-slate-500">Mode reviewed</dt><dd className="font-semibold">{selectedMode === "online" ? "Online" : "Home tuition"}</dd></div><div><dt className="text-slate-500">Weight total</dt><dd className="font-semibold">{currentWeightTotal} / 100</dd></div></dl>
            <label htmlFor="matching-change-reason" className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-200">Reason for change</label>
            <textarea id="matching-change-reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} rows={3} maxLength={500} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Describe why these weights are changing" />
          </AdminDialog>

          <AdminDialog open={Boolean(rollbackTarget)} onClose={() => !rollingBack && setRollbackTarget(null)} title={`Restore revision ${rollbackTarget?.revision || ""}`} description="This creates a new audited revision from the selected snapshot; newer history will not be deleted." footer={<><button type="button" onClick={() => setRollbackTarget(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={() => rollbackTarget && handleRollbackConfig(rollbackTarget.id, rollbackTarget.revision)} disabled={rollingBack || rollbackReason.trim().length < 8} className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{rollingBack ? "Restoring…" : "Confirm rollback"}</button></>}>
            <label htmlFor="matching-rollback-reason" className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Reason for rollback</label>
            <textarea id="matching-rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} rows={3} maxLength={500} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Explain why this revision should be restored" />
          </AdminDialog>
        </div>
      )}
      <AdminDialog open={Boolean(dispatchTarget)} onClose={() => !dispatchingWave && setDispatchTarget(null)} title="Dispatch tutor notifications?" description="This operational action immediately sends a new matching notification wave for the selected live request. It does not change the request or accept any offer." footer={<><button type="button" onClick={() => setDispatchTarget(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">Cancel</button><button type="button" onClick={() => dispatchTarget && handleDispatchNotificationWave(dispatchTarget)} disabled={dispatchingWave} className="min-h-11 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{dispatchingWave ? "Dispatching…" : "Dispatch wave"}</button></>}>
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Only eligible tutors are notified. This action is recorded in the administrative audit trail.</p>
      </AdminDialog>
    </div>
  );
}
