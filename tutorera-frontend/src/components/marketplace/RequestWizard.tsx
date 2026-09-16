"use client";

import CountryCitySelector from "@/components/marketplace/CountryCitySelector";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { convertToPKR,useGeoData } from "@/lib/geoService";
import { Country } from "@/lib/location";
import { showError,showSuccess } from "@/lib/toast";
import { PostRequestPayload } from "@/types/dashboard";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  Send,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useRef,useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CONTACT_INFO_REGEX = /(\+?\d[\d\s\-().]{8,}\d)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(whatsapp|wa\.me|wechat|telegram|viber|skype)/i;

interface RequestWizardProps {
  initialMode?: "online" | "in-person" | "both";
  prefill?: Partial<PostRequestPayload>;
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function RequestWizard({
  initialMode = "both",
  prefill = {},
  onSuccess,
  isModal = false,
  onClose
}: RequestWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const geo = useGeoData();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [parsingNLP, setParsingNLP] = useState(false);

  const handleNLPParse = async () => {
    if (!freeText.trim()) return;
    setParsingNLP(true);
    try {
      const res = await api.post("/ai/parse-request", { text: freeText });
      const p = res.data?.parsed || {};
      if (p.subject && typeof p.subject === "string") update("subject", p.subject);
      if (p.level && typeof p.level === "string") update("level", p.level);
      if (p.budget && !isNaN(Number(p.budget))) update("budget", String(p.budget));
      if (p.city && typeof p.city === "string") update("city", p.city);
      if (p.teachingMode && typeof p.teachingMode === "string") update("teachingMode", p.teachingMode);
      if (p.schedule && typeof p.schedule === "string") update("schedule", p.schedule);
      if (p.description && typeof p.description === "string") update("description", p.description);
      if (p.currency && typeof p.currency === "string") update("currency", p.currency);
      if (p.pricingUnit && typeof p.pricingUnit === "string") update("pricingUnit", p.pricingUnit);
      if (p.studentLevel && typeof p.studentLevel === "string") update("studentLevel", p.studentLevel);
      if (p.curriculum && typeof p.curriculum === "string") update("curriculum", p.curriculum);
      showSuccess("Form auto-filled from your description!");
      setStep(1);
    } catch {
      showError("Could not parse your description. Please fill the form manually.");
    } finally {
      setParsingNLP(false);
    }
  };

  const [form, setForm] = useState<PostRequestPayload>({
    subject: prefill.subject || "",
    level: prefill.level || "",
    description: prefill.description || "",
    budget: prefill.budget || "2000",
    currency: prefill.currency || "PKR",
    countryCode: prefill.countryCode || "PK",
    countryName: prefill.countryName || "Pakistan",
    timezone: prefill.timezone || "Asia/Karachi",
    isWorldwideEligible: prefill.isWorldwideEligible !== undefined ? prefill.isWorldwideEligible : (initialMode === "online" || initialMode === "both"),
    teachingMode: prefill.teachingMode || initialMode,
    city: prefill.city || "",
    schedule: prefill.schedule || "",
    maximumBudget: prefill.maximumBudget || "",
    pricingUnit: prefill.pricingUnit || "hour",
    allowCounterOffers: prefill.allowCounterOffers !== undefined ? prefill.allowCounterOffers : true,
    classGrade: prefill.classGrade || "",
    curriculum: prefill.curriculum || "",
    examType: prefill.examType || "",
    studentLevel: prefill.studentLevel || "",
    learningObjectives: prefill.learningObjectives || "",
    area: prefill.area || "",
    travelRadiusKm: prefill.travelRadiusKm || "8",
    tutorGenderPreference: prefill.tutorGenderPreference || "none",
    minimumQualification: prefill.minimumQualification || "",
    minimumExperience: prefill.minimumExperience || "",
    preferredLanguage: prefill.preferredLanguage || "English & Urdu",
    preferredTutorRating: prefill.preferredTutorRating || "4.5",
    preferredDays: prefill.preferredDays || ["Monday", "Wednesday", "Friday"],
    preferredStartTime: prefill.preferredStartTime || "17:00",
    sessionDurationMinutes: prefill.sessionDurationMinutes || "60",
    sessionsPerWeek: prefill.sessionsPerWeek || "3",
    expectedStartDate: prefill.expectedStartDate || "",
  });

  useEffect(() => {
    if (prefill.countryCode || !user?.countryCode) return;
    const market = geo.countries.find((country) => country.code === user.countryCode);
    if (!market) return;
    setForm((current) => ({
      ...current,
      countryCode: market.code,
      countryName: market.name,
      currency: market.currency,
      timezone: market.defaultTimezone,
      city: user.city || "",
      budget: current.budget === "2000" && market.currency !== "PKR" ? (market.currency === "AED" ? "80" : market.currency === "GBP" ? "25" : "30") : current.budget,
    }));
  }, [geo.countries, prefill.countryCode, user?.countryCode, user?.city]);

  const hasContactInfo = Boolean(form.learningObjectives && CONTACT_INFO_REGEX.test(form.learningObjectives)) || Boolean(form.description && CONTACT_INFO_REGEX.test(form.description));

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-sync draft if logged in
  useEffect(() => {
    if (!user) {
      try {
        sessionStorage.setItem("tutorera_quick_request", JSON.stringify(form));
      } catch {}
      return;
    }

    const hasData = Boolean(form.subject || form.level || form.budget);
    if (!hasData) return;

    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      api.post("/requests/draft", form).catch(() => {});
    }, 2000);

    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [form, user]);

  const update = (key: keyof PostRequestPayload, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (day: string) => {
    const exists = form.preferredDays.includes(day);
    if (exists) {
      update("preferredDays", form.preferredDays.filter((d) => d !== day));
    } else {
      update("preferredDays", [...form.preferredDays, day]);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.subject) return showError("Please select a subject.");
      if (!form.level) return showError("Please select your academic level / class.");
    }
    if (step === 2) {
      if (!form.teachingMode) return showError("Please select your preferred teaching mode.");
      if (form.teachingMode !== "online" && !form.city) return showError("Please select your city.");
    }
    if (step === 3) {
      if (!form.schedule && form.preferredDays.length === 0) {
        return showError("Please provide a schedule or choose preferred days.");
      }
      if (!form.schedule) {
        update("schedule", `${form.preferredDays.join(", ")} at ${form.preferredStartTime || "Flexible timing"}`);
      }
    }
    if (step === 4) {
      if (!form.budget || Number(form.budget) <= 0) return showError("Please enter your proposed budget.");
      if (form.maximumBudget && Number(form.maximumBudget) < Number(form.budget)) {
        return showError("Private max budget cannot be lower than your proposed rate.");
      }
    }
    setStep((s) => Math.min(s + 1, 6));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handlePublish = async () => {
    if (hasContactInfo) {
      showError("Please remove personal phone numbers, WhatsApp, or email addresses before publishing your request.");
      return;
    }

    if (!user) {
      sessionStorage.setItem("tutorera_quick_request", JSON.stringify(form));
      sessionStorage.setItem("tutorera_redirect_after_auth", "/post-tuition-request");
      showSuccess("Your request details are saved! Please sign in or create an account to publish.");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const numericKeys = [
        "maximumBudget", "travelRadiusKm", "minimumExperience", 
        "preferredTutorRating", "sessionDurationMinutes", "sessionsPerWeek"
      ] as const;

      const payload: Record<string, unknown> = {
        ...form,
        budget: Number(form.budget),
        description: form.description || `${form.subject} tuition for ${form.level}. Goals: ${form.learningObjectives || "Concept clarity & exam preparation."}`,
        schedule: form.schedule || `${form.preferredDays.join(", ")} around ${form.preferredStartTime || "evening"}`,
        expectedStartDate: form.expectedStartDate ? new Date(form.expectedStartDate).toISOString() : undefined
      };

      numericKeys.forEach((k) => {
        payload[k] = form[k] ? Number(form[k]) : undefined;
      });

      if (form.teachingMode === "online") {
        payload.city = undefined;
        payload.area = undefined;
        payload.travelRadiusKm = undefined;
      }

      await api.post("/requests", payload);
      setIsPublished(true);
      showSuccess("Tuition request published successfully!");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      showError(err, "Failed to publish tuition request. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  if (isPublished) {
    return (
      <div style={{
        background: "white",
        borderRadius: "1.5rem",
        padding: "3rem 2rem",
        maxWidth: 680,
        margin: "0 auto",
        boxShadow: "0 20px 40px rgba(2, 21, 80, 0.08)",
        border: "1px solid #e2e8f0",
        textAlign: "center"
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#ecfdf5",
          color: "#10b981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 1.5rem",
          border: "2px solid #a7f3d0"
        }}>
          <Check size={36} strokeWidth={2.5} />
        </div>

        <span style={{
          display: "inline-block",
          fontSize: "0.8rem",
          fontWeight: 800,
          color: "#0329b2",
          background: "#eef5ff",
          padding: "0.3rem 0.8rem",
          borderRadius: "999px",
          marginBottom: "0.75rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }}>
          Marketplace Request Active
        </span>

        <h2 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#021550", marginBottom: "0.75rem" }}>
          Your Tuition Request is Live!
        </h2>
        <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.6, maxWidth: 520, margin: "0 auto 2rem" }}>
          Relevant verified tutors matching your subject and mode are now being notified. You will start receiving tutor offers with their accepted price or transparent counter-offers.
        </p>

        <div style={{
          background: "#f8faff",
          borderRadius: "1rem",
          padding: "1.25rem",
          border: "1px solid #e2e8f0",
          textAlign: "left",
          marginBottom: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem"
        }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Subject & Level</span>
            <strong style={{ fontSize: "0.95rem", color: "#021550" }}>{form.subject} ({form.level})</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Learning Mode</span>
            <strong style={{ fontSize: "0.95rem", color: "#021550", textTransform: "capitalize" }}>{form.teachingMode}</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Your Proposed Rate</span>
            <strong style={{ fontSize: "0.95rem", color: "#0329b2" }}>{form.currency} {Number(form.budget).toLocaleString()}/{form.pricingUnit}</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Location / Area</span>
            <strong style={{ fontSize: "0.95rem", color: "#021550" }}>{form.city ? `${form.area ? `${form.area}, ` : ""}${form.city}` : "Online Nationwide"}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard?tab=requests"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#0329b2",
              color: "white",
              padding: "0.85rem 1.75rem",
              borderRadius: "0.75rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(3, 41, 178, 0.2)"
            }}
          >
            View in Dashboard <ArrowRight size={16} />
          </Link>
          <Link
            href="/tutors"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "white",
              color: "#021550",
              border: "1.5px solid #cbd5e1",
              padding: "0.85rem 1.75rem",
              borderRadius: "0.75rem",
              fontWeight: 700,
              textDecoration: "none"
            }}
          >
            Browse Tutors While You Wait
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "white",
      borderRadius: isModal ? "1rem" : "1.5rem",
      padding: isModal ? "1.5rem" : "2.5rem 2rem",
      maxWidth: 760,
      margin: "0 auto",
      boxShadow: isModal ? "none" : "0 20px 40px rgba(2, 21, 80, 0.08)",
      border: isModal ? "none" : "1px solid #e2e8f0"
    }}>
      {/* Header & Stepper */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#016ef8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Step {step} of 6
            </span>
            <h1 style={{ fontSize: isModal ? "1.35rem" : "1.65rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0 0" }}>
              {step === 1 && "What do you need help with?"}
              {step === 2 && "How do you want to learn?"}
              {step === 3 && "When do you need tutoring?"}
              {step === 4 && "What is your proposed budget?"}
              {step === 5 && "Any tutor preferences?"}
              {step === 6 && "Review & publish your request"}
            </h1>
          </div>
          {isModal && onClose && (
            <button 
              onClick={onClose} 
              style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#64748b", cursor: "pointer", padding: "0.5rem" }}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", display: "flex" }}>
          <div 
            style={{ 
              width: `${(step / 6) * 100}%`, 
              background: "linear-gradient(90deg, #0329b2, #016ef8)", 
              transition: "width 0.3s ease",
              borderRadius: "999px"
            }} 
          />
        </div>
      </div>

      {/* Step Content */}
      <div style={{ minHeight: "320px" }}>
        {/* STEP 1: Academic Needs */}
        {step === 1 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            {/* Ask Tutorera — Free text NLP parsing */}
            <div style={{
              background: "linear-gradient(135deg, #f0f9ff 0%, #eef5ff 100%)",
              border: "1.5px solid #bfdbfe",
              borderRadius: "0.875rem",
              padding: "1rem 1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <Sparkles size={15} color="#0329b2" />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0329b2" }}>Ask Tutorera — Describe your need in plain English</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="e.g. I need Grade 9 Maths tutor in Lahore, willing to pay 3000 per hour"
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.85rem",
                    borderRadius: "0.5rem",
                    border: "1.5px solid #bfdbfe",
                    fontSize: "0.85rem",
                    outline: "none",
                    color: "#021550",
                    minHeight: "42px",
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleNLPParse(); }}
                />
                <button
                  type="button"
                  onClick={() => void handleNLPParse()}
                  disabled={parsingNLP || !freeText.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.6rem 0.9rem",
                    background: parsingNLP ? "#93c5fd" : "#0329b2",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: parsingNLP || !freeText.trim() ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    minHeight: "42px",
                  }}
                >
                  {parsingNLP ? (
                    <>Parsing…</>
                  ) : (
                    <><Zap size={13} /> Auto-fill</>
                  )}
                </button>
              </div>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                Describe your tuition need in any language — we'll extract subject, level, city, and budget automatically.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Select Subject *</label>
              <select 
                value={form.subject} 
                onChange={(e) => update("subject", e.target.value)}
                style={inputStyle}
              >
                <option value="">Choose subject...</option>
                {(geo.subjects && geo.subjects.length > 0 ? geo.subjects : ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"]).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Academic Level / Class *</label>
              <select 
                value={form.level} 
                onChange={(e) => update("level", e.target.value)}
                style={inputStyle}
              >
                <option value="">Choose class / qualification...</option>
                {(geo.levels && geo.levels.length > 0 ? geo.levels : ["Primary (Grades 1-5)", "Middle (Grades 6-8)", "Matric (9th & 10th)", "Intermediate / FSc", "O-Level (Cambridge / Edexcel)", "A-Level (Cambridge / Edexcel)", "IB (Middle Years / Diploma)", "University / Degree", "Test Preparation", "Other"]).map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Curriculum / Board (optional)</label>
                <input 
                  type="text" 
                  list="curriculum-suggestions"
                  value={form.curriculum} 
                  onChange={(e) => update("curriculum", e.target.value)} 
                  placeholder="e.g. Cambridge, FBISE, Punjab Board, Edexcel"
                  style={inputStyle}
                />
                <datalist id="curriculum-suggestions">
                  {(geo.countries?.find(c => c.code === form.countryCode)?.curricula || geo.curricula || []).map((cur) => (
                    <option key={cur} value={cur} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Exam / Target (optional)</label>
                <input 
                  type="text" 
                  value={form.examType} 
                  onChange={(e) => update("examType", e.target.value)} 
                  placeholder="e.g. Board Exam 2026, May/June O-Level"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>What are your main learning goals or weak topics?</label>
              <textarea 
                rows={3} 
                value={form.learningObjectives} 
                onChange={(e) => update("learningObjectives", e.target.value)}
                placeholder="e.g. Needs help with past papers, calculus basics, and weekly test preparation."
                style={{ ...inputStyle, resize: "vertical" }}
              />
              {hasContactInfo && (
                <div style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "0.5rem",
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  fontSize: "0.8rem",
                  color: "#92400e"
                }}>
                  <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: "2px", color: "#d97706" }} />
                  <div>
                    <strong>Keep contact details private:</strong> For your safety and guarantee eligibility, phone numbers, WhatsApp links, and emails cannot be shared in request posts. Tutors will chat with you directly on TUTORERA.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Mode & Location */}
        {step === 2 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <label style={labelStyle}>Preferred Learning Mode *</label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
              gap: "0.75rem"
            }}>
              {[
                { id: "online", title: "Online Tuition", desc: "Live 1-on-1 worldwide matching" },
                { id: "in-person", title: "Home Tuition", desc: "Tutor travels to your location" },
                { id: "both", title: "Either", desc: "Open to online & nearby home tutors" },
              ].map((m) => {
                const active = form.teachingMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      update("teachingMode", m.id);
                      update("isWorldwideEligible", m.id === "online" || m.id === "both");
                    }}
                    style={{
                      padding: "1rem",
                      borderRadius: "0.875rem",
                      border: active ? "2px solid #0329b2" : "1.5px solid #e2e8f0",
                      background: active ? "#eef5ff" : "white",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      minHeight: "48px"
                    }}
                  >
                    <strong style={{ display: "block", color: active ? "#0329b2" : "#021550", fontSize: "0.95rem" }}>{m.title}</strong>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Location Selector */}
            <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "0.875rem", border: "1px solid #e2e8f0", display: "grid", gap: "1rem" }}>
              <CountryCitySelector
                countryCode={form.countryCode || "PK"}
                city={form.city || ""}
                onCountryChange={(c: Country) => {
                  update("countryCode", c.code);
                  update("countryName", c.name);
                  update("currency", c.currency);
                  update("timezone", c.defaultTimezone);
                  if (c.code === "US" || c.code === "GB" || c.code === "CA" || c.code === "AU") {
                    if (Number(form.budget) > 500) update("budget", "25");
                  } else if (c.code === "AE" || c.code === "SA" || c.code === "QA") {
                    if (Number(form.budget) > 500) update("budget", "80");
                  }
                }}
                onCityChange={(cityName: string) => update("city", cityName)}
                showCurrency={true}
                showTimezone={true}
                countries={geo.countries}
              />

              {form.teachingMode !== "online" && (
                <div>
                  <label style={labelStyle}>Area / Neighborhood / Locality *</label>
                  <input 
                    type="text" 
                    value={form.area} 
                    onChange={(e) => update("area", e.target.value)}
                    placeholder="e.g. DHA Phase 5, Downtown, Gulberg, F-10"
                    style={inputStyle}
                  />
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0" }}>
                    Exact address is private and only shared upon confirmed booking.
                  </p>
                </div>
              )}

              {form.teachingMode === "online" && (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "0.85rem", borderRadius: "0.625rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <ShieldCheck size={18} color="#059669" />
                  <span style={{ fontSize: "0.8rem", color: "#065f46" }}>
                    <strong>Borderless Matching:</strong> You will receive offers from top qualified tutors worldwide compatible with your curriculum and timezone ({form.timezone || "your timezone"}).
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Schedule */}
        {step === 3 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div>
              <label style={labelStyle}>Preferred Days of the Week</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                {DAYS.map((day) => {
                  const active = form.preferredDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "999px",
                        border: active ? "1.5px solid #0329b2" : "1px solid #cbd5e1",
                        background: active ? "#0329b2" : "white",
                        color: active ? "white" : "#475569",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Preferred Start Time</label>
                <input 
                  type="text" 
                  value={form.preferredStartTime} 
                  onChange={(e) => update("preferredStartTime", e.target.value)}
                  placeholder="e.g. 5:00 PM or Evenings"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Sessions per Week</label>
                <select 
                  value={form.sessionsPerWeek} 
                  onChange={(e) => update("sessionsPerWeek", e.target.value)}
                  style={inputStyle}
                >
                  <option value="1">1 session / week</option>
                  <option value="2">2 sessions / week</option>
                  <option value="3">3 sessions / week</option>
                  <option value="4">4 sessions / week</option>
                  <option value="5">5 sessions / week</option>
                  <option value="6">6 sessions / week</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Schedule Summary / Flexibility Note</label>
              <input 
                type="text" 
                value={form.schedule} 
                onChange={(e) => update("schedule", e.target.value)}
                placeholder="e.g. Mon, Wed, Fri after 5 PM (flexible on weekends)"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Budget */}
        {step === 4 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ background: "#eef5ff", border: "1.5px solid #bfdbfe", padding: "1.5rem", borderRadius: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0329b2", marginBottom: "0.5rem" }}>
                <DollarSign size={20} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Student-Proposed Pricing</h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5, margin: "0 0 1rem" }}>
                In TUTORERA&apos;s student-led marketplace, you propose what you are willing to pay. Verified tutors can either accept your rate or submit a counter-offer.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Your Proposed Rate ({form.currency || "PKR"}) *</label>
                  <input 
                    type="number" 
                    min="1" 
                    step="1" 
                    value={form.budget} 
                    onChange={(e) => update("budget", e.target.value)}
                    placeholder={`e.g. ${form.currency === "PKR" ? "2000" : "30"}`}
                    style={{ ...inputStyle, fontSize: "1.1rem", fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Pricing Unit</label>
                  <select 
                    value={form.pricingUnit} 
                    onChange={(e) => update("pricingUnit", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="hour">Per Hour</option>
                    <option value="session">Per Session</option>
                    <option value="month">Per Month</option>
                    <option value="course">Complete Course</option>
                  </select>
                </div>
              </div>

              {form.currency && form.currency !== "PKR" && Number(form.budget) > 0 && (
                <div style={{ marginTop: "0.85rem", padding: "0.75rem 1rem", background: "white", borderRadius: "0.625rem", border: "1.5px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "#1e3a8a", fontWeight: 700, display: "block" }}>
                      Marketplace Settlement Estimate:
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      This is an informational comparison only. Your request, offers, and booking use the selected market currency.
                    </span>
                  </div>
                  <span style={{ fontSize: "1.05rem", color: "#0329b2", fontWeight: 800 }}>
                    ≈ Rs. {convertToPKR(Number(form.budget), form.currency).amountPKR.toLocaleString()} PKR / {form.pricingUnit}
                  </span>
                </div>
              )}

              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #bfdbfe" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#021550", fontWeight: 600, cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={form.allowCounterOffers} 
                    onChange={(e) => update("allowCounterOffers", e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#0329b2" }}
                  />
                  Allow verified tutors to send counter-offers if slightly above my budget
                </label>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Maximum Private Budget (Optional)
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400, marginLeft: "0.5rem" }}>
                  (Never shown to tutors)
                </span>
              </label>
              <input 
                type="number" 
                min={form.budget || "0"} 
                value={form.maximumBudget} 
                onChange={(e) => update("maximumBudget", e.target.value)}
                placeholder="e.g. 2500"
                style={inputStyle}
              />
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                Used only by TUTORERA to filter out irrelevant bids exceeding your ceiling.
              </span>
            </div>
          </div>
        )}

        {/* STEP 5: Preferences */}
        {step === 5 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Tutor Gender Preference</label>
                <select 
                  value={form.tutorGenderPreference} 
                  onChange={(e) => update("tutorGenderPreference", e.target.value)}
                  style={inputStyle}
                >
                  <option value="none">No Preference</option>
                  <option value="female">Female Tutor</option>
                  <option value="male">Male Tutor</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Minimum Teaching Experience</label>
                <select 
                  value={form.minimumExperience} 
                  onChange={(e) => update("minimumExperience", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Any experience</option>
                  <option value="1">1+ years</option>
                  <option value="3">3+ years</option>
                  <option value="5">5+ years</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Minimum Qualification</label>
              <input 
                type="text" 
                value={form.minimumQualification} 
                onChange={(e) => update("minimumQualification", e.target.value)}
                placeholder="e.g. BS Mathematics, Master's, MBBS, Chartered Accountant"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Instruction Medium / Languages</label>
              <input 
                type="text" 
                value={form.preferredLanguage} 
                onChange={(e) => update("preferredLanguage", e.target.value)}
                placeholder="e.g. English, Urdu"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* STEP 6: Review & Publish */}
        {step === 6 && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{ background: "#f8fafc", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#021550", marginBottom: "1rem" }}>
                Request Summary
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Subject & Level:</span>
                  <strong style={{ color: "#021550" }}>{form.subject} · {form.level}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Proposed Budget:</span>
                  <strong style={{ color: "#0329b2", fontSize: "1rem" }}>{form.currency || "PKR"} {Number(form.budget).toLocaleString()}/{form.pricingUnit}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Mode & Location:</span>
                  <strong style={{ color: "#021550", textTransform: "capitalize" }}>
                    {form.teachingMode === "online" ? "Online Worldwide" : form.teachingMode} · {form.city ? `${form.city}, ` : ""}{form.countryName || "Pakistan"} {form.area ? `(${form.area})` : ""}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Schedule & Timezone:</span>
                  <strong style={{ color: "#021550" }}>
                    {form.schedule || `${form.preferredDays.join(", ")}`} ({form.timezone || "Default"})
                  </strong>
                </div>
              </div>

              {form.learningObjectives && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
                  <span style={{ color: "#64748b", display: "block", marginBottom: "0.25rem" }}>Objectives:</span>
                  <p style={{ margin: 0, color: "#334155" }}>{form.learningObjectives}</p>
                </div>
              )}
            </div>

            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "1rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <ShieldCheck size={24} color="#059669" />
              <p style={{ fontSize: "0.8rem", color: "#065f46", margin: 0 }}>
                <strong>No upfront payment required to post.</strong> You will only pay securely through TUTORERA when you compare offers and decide to accept a tutor.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar */}
      <div
        className="mobile-sticky-wizard-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "2rem",
          paddingTop: "1rem",
          paddingBottom: "0.5rem",
          borderTop: "1px solid #f1f5f9",
          position: "sticky",
          bottom: 0,
          background: "white",
          zIndex: 20,
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              background: "white",
              color: "#475569",
              border: "1.5px solid #cbd5e1",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.625rem",
              fontWeight: 700,
              fontSize: "0.92rem",
              cursor: "pointer",
              minHeight: "48px",
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>
        ) : <div />}

        {step < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              background: "linear-gradient(135deg, #0329b2 0%, #016ef8 100%)",
              color: "white",
              border: "none",
              padding: "0.75rem 1.75rem",
              borderRadius: "0.625rem",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(3, 41, 178, 0.3)",
              minHeight: "48px",
            }}
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handlePublish}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#10b981",
              color: "white",
              border: "none",
              padding: "0.85rem 1.75rem",
              borderRadius: "0.625rem",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
              minHeight: "48px",
            }}
          >
            <Send size={18} /> {loading ? "Publishing..." : "Publish Tuition Request"}
          </button>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.825rem",
  fontWeight: 700,
  color: "#021550",
  marginBottom: "0.4rem"
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "0.625rem",
  border: "1.5px solid #cbd5e1",
  fontSize: "0.9rem",
  color: "#021550",
  background: "white",
  outline: "none",
  boxSizing: "border-box" as const
};
