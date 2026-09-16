"use client";
import CountryCitySelector from "@/components/marketplace/CountryCitySelector";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { useGeoData } from "@/lib/geoService";
import { Country } from "@/lib/location";
import { BookOpen,CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

const C = UI_COLORS;

const STEPS = [
  { number: 1, title: "Personal & Location" },
  { number: 2, title: "Education" },
  { number: 3, title: "Preferences" },
];

export default function StudentOnboardingPage() {
  const { user, loading } = useAuth();
  const geo = useGeoData();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const subjects = geo.subjects && geo.subjects.length > 0 ? geo.subjects : [
    "Mathematics", "Physics", "Chemistry", "Biology", "English", "Urdu", "Computer Science", "Economics", "Statistics", "Islamiyat", "Pakistan Studies", "Quran & Arabic", "Other"
  ];
  const levels = geo.levels && geo.levels.length > 0 ? geo.levels : ["Primary (Grades 1-5)", "Middle (Grades 6-8)", "Matric (9th & 10th)", "Intermediate / FSc", "O-Level (Cambridge / Edexcel)", "A-Level (Cambridge / Edexcel)", "IB (Middle Years / Diploma)", "University / Degree", "Test Preparation", "Other"];

  // Step 1 — Personal & Global Location
  const [step1, setStep1] = useState({
    fullName: "",
    phone: "",
    countryCode: "PK",
    countryName: "Pakistan",
    city: "Lahore",
    timezone: "Asia/Karachi",
    currency: "PKR",
    gender: "male",
    dateOfBirth: "",
  });

  // Step 2 — Education
  const [step2, setStep2] = useState({
    currentLevel: "", institution: "",
  });

  // Step 3 — Preferences
  const [subjectsNeeded, setSubjectsNeeded] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState("");
  const [teachingModePreference, setTeachingModePreference] = useState<"online" | "in-person" | "both">("both");

  const budgetRanges = step1.currency === "PKR"
    ? ["Under Rs. 5,000 / mo", "Rs. 5,000 – 15,000 / mo", "Rs. 15,000 – 30,000 / mo", "Rs. 30,000+ / mo", "Custom / Flexible"]
    : step1.currency === "AED" || step1.currency === "SAR"
    ? [`Under ${step1.currency} 50 / hr`, `${step1.currency} 50 – 100 / hr`, `${step1.currency} 100 – 200 / hr`, `${step1.currency} 200+ / hr`, "Custom / Flexible"]
    : [`Under ${step1.currency} 15 / hr`, `${step1.currency} 15 – 30 / hr`, `${step1.currency} 30 – 60 / hr`, `${step1.currency} 60+ / hr`, "Custom / Flexible"];

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "student") router.push("/dashboard");
    if (!loading && user) {
      const selectedMarket = geo.countries.find((country) => country.code === user.countryCode);
      setStep1(prev => ({
        ...prev,
        fullName: user.name || "",
        ...(selectedMarket ? {
          countryCode: selectedMarket.code,
          countryName: selectedMarket.name,
          city: user.city || "",
          timezone: selectedMarket.defaultTimezone,
          currency: selectedMarket.currency,
        } : {}),
      }));
    }
  }, [user, loading, router, geo.countries]);

  const toggleSubject = (subject: string) => {
    setSubjectsNeeded(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!step1.fullName || !step1.phone || !step1.city) {
        setError("Please fill all required fields."); return false;
      }
    }
    if (currentStep === 2) {
      if (!step2.currentLevel) {
        setError("Please select your current level."); return false;
      }
    }
    if (currentStep === 3) {
      if (subjectsNeeded.length === 0) {
        setError("Please select at least one subject."); return false;
      }
      if (!budgetRange) {
        setError("Please select your budget range."); return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    setError("");
    if (!validateStep()) return;

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    // Final step — submit
    setSaving(true);
    try {
      await api.post("/students/onboarding", {
        ...step1,
        ...step2,
        subjectsNeeded,
        budgetRange,
        teachingModePreference,
      });
      router.push("/onboarding/student/complete");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.gray50 }}>

      {/* Header */}
      <div style={{ backgroundColor: C.primary, padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <BookOpen size={24} color="#60a5fa" />
          <span style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>
            TUTORERA<span style={{ color: '#C81B7F' }}>®</span>
          </span>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.3rem' }}>Student Registration</p>
      </div>

      {/* Progress Steps */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {STEPS.map((step, idx) => (
            <div key={step.number} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '700', backgroundColor: step.number < currentStep ? '#16a34a' : step.number === currentStep ? C.accent : '#e5e7eb', color: step.number <= currentStep ? 'white' : '#9ca3af', transition: 'all 0.3s' }}>
                  {step.number < currentStep ? <CheckCircle size={18} /> : step.number}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: step.number === currentStep ? C.accent : step.number < currentStep ? '#16a34a' : '#9ca3af', whiteSpace: 'nowrap' }}>
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', backgroundColor: step.number < currentStep ? '#16a34a' : '#e5e7eb', margin: '0 0.5rem', marginBottom: '1.2rem', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '560px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid #e5e7eb' }}>

          {/* Error */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* ── STEP 1 — Personal Info ── */}
          {currentStep === 1 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Personal Information</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Tell us a little about yourself.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Full Name *</label>
                  <input value={step1.fullName} onChange={e => setStep1({ ...step1, fullName: e.target.value })}
                    placeholder="Muhammad Ahmad"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <CountryCitySelector
                    countryCode={step1.countryCode}
                    city={step1.city}
                    onCountryChange={(c: Country) => {
                      setStep1(prev => ({
                        ...prev,
                        countryCode: c.code,
                        countryName: c.name,
                        currency: c.currency,
                        timezone: c.defaultTimezone,
                      }));
                    }}
                    onCityChange={(cityName: string) => {
                      setStep1(prev => ({ ...prev, city: cityName }));
                    }}
                    showCurrency={true}
                    showTimezone={true}
                    countries={geo.countries}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Phone *</label>
                    <input value={step1.phone} onChange={e => setStep1({ ...step1, phone: e.target.value })}
                      placeholder="e.g. +92 300 1234567"
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Gender</label>
                    <select value={step1.gender} onChange={e => setStep1({ ...step1, gender: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, backgroundColor: 'white' }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Education ── */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Education Details</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Tell us about your current studies.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Current Level *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {levels.map(level => (
                      <button key={level} type="button"
                        onClick={() => setStep2({ ...step2, currentLevel: level })}
                        style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: `1.5px solid ${step2.currentLevel === level ? C.accent : '#e5e7eb'}`, backgroundColor: step2.currentLevel === level ? C.accentLight : 'white', color: step2.currentLevel === level ? C.accent : C.gray500, fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>School / College / University</label>
                  <input value={step2.institution} onChange={e => setStep2({ ...step2, institution: e.target.value })}
                    placeholder="e.g. Beaconhouse School System"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 — Preferences ── */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Your Preferences</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Help us find the perfect tutor for you.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Subjects */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Subjects You Need Help With *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {subjects.map(subject => (
                      <button key={subject} type="button" onClick={() => toggleSubject(subject)}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', border: `1.5px solid ${subjectsNeeded.includes(subject) ? C.accent : '#e5e7eb'}`, backgroundColor: subjectsNeeded.includes(subject) ? C.accentLight : 'white', color: subjectsNeeded.includes(subject) ? C.accent : C.gray500, fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Budget Range *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {budgetRanges.map(budget => (
                      <button key={budget} type="button" onClick={() => setBudgetRange(budget)}
                        style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1.5px solid ${budgetRange === budget ? C.accent : '#e5e7eb'}`, backgroundColor: budgetRange === budget ? C.accentLight : 'white', color: budgetRange === budget ? C.accent : C.primary, fontWeight: budgetRange === budget ? '700' : '500', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' }}>
                        {budgetRange === budget ? '✅ ' : ''}{budget}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teaching Mode */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Preferred Teaching Mode</label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {(["online", "in-person", "both"] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setTeachingModePreference(mode)}
                        style={{ flex: 1, minWidth: '100px', padding: '0.75rem', borderRadius: '0.5rem', border: `1.5px solid ${teachingModePreference === mode ? C.accent : '#e5e7eb'}`, backgroundColor: teachingModePreference === mode ? C.accentLight : 'white', color: teachingModePreference === mode ? C.accent : C.gray500, fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                        {mode === "in-person" ? "In-Person" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', gap: '1rem' }}>
            {currentStep > 1 ? (
              <button onClick={() => { setError(""); setCurrentStep(prev => prev - 1); }}
                style={{ flex: 1, padding: '0.75rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>
                ← Back
              </button>
            ) : <div style={{ flex: 1 }} />}

            <button onClick={handleNext} disabled={saving}
              style={{ flex: 1, padding: '0.75rem', backgroundColor: saving ? '#93c5fd' : C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
              {saving ? "Saving..." : currentStep === 3 ? "Complete Setup 🎉" : "Continue →"}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem', marginTop: '1rem' }}>
          Step {currentStep} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
