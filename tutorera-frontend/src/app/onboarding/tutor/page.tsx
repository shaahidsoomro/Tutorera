"use client";
import CountryCitySelector from "@/components/marketplace/CountryCitySelector";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { convertToPKR,useGeoData } from "@/lib/geoService";
import { Country } from "@/lib/location";
import { AlertTriangle,BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

const C = UI_COLORS;

const STEPS = [
  { number: 1, title: "Personal & Location" },
  { number: 2, title: "Education" },
  { number: 3, title: "Experience" },
  { number: 4, title: "Profile & Pricing" },
  { number: 5, title: "Verification" },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM"];

interface ExistingDocsState {
  degreeDoc?: string;
  cnicFront?: string;
  cnicBack?: string;
  videoIntro?: string;
  policeCertificate?: string;
  cnicVerificationStatus?: string;
  cnicRejectionReason?: string;
  degreeVerificationStatus?: string;
  degreeRejectionReason?: string;
  demoVideoStatus?: string;
  demoVideoRejectionReason?: string;
  policeVerificationStatus?: string;
  policeRejectionReason?: string;
  verificationStatus?: string;
  rejectionReason?: string;
}

export default function TutorOnboardingPage() {
  const { user, loading } = useAuth();
  const geo = useGeoData();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [existingDocs, setExistingDocs] = useState<ExistingDocsState>({});

  const subjects = geo.subjects && geo.subjects.length > 0 ? geo.subjects : [
    "Mathematics", "Physics", "Chemistry", "Biology", "English", "Urdu", "Computer Science", "Economics", "Statistics", "Islamiyat", "Pakistan Studies", "Quran & Arabic", "IELTS", "SAT / ACT", "Other"
  ];
  const levels = geo.levels && geo.levels.length > 0 ? geo.levels : [
    "Primary (Grades 1-5)", "Middle (Grades 6-8)", "Matric (9th & 10th)", "Intermediate / FSc", "O-Level (Cambridge / Edexcel)", "A-Level (Cambridge / Edexcel)", "IB (Middle Years / Diploma)", "University / Degree", "Test Preparation", "Other"
  ];

  // Step 1
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

  // Step 2
  const [step2, setStep2] = useState({ degree: "", institution: "", year: "" });
  const [degreeDoc, setDegreeDoc] = useState<File | null>(null);

  // Step 3
  const [step3, setStep3] = useState({ experience: "", previousInstitutions: "" });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  // Step 4
  const [step4, setStep4] = useState({
    bio: "",
    hourlyRate: "",
    currency: "PKR",
    serviceAreas: "",
    travelRadiusKm: "10",
    teachingMode: "both" as "online" | "in-person" | "both",
  });
  const [availability, setAvailability] = useState<{ day: string; slots: string[] }[]>([]);
  const [pricingInsight, setPricingInsight] = useState<{ min: number | null; max: number | null; median: number | null; count: number } | null>(null);

  // Step 5
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [videoIntro, setVideoIntro] = useState<string>("");
  const [policeCertificate, setPoliceCertificate] = useState<File | null>(null);

  // Load existing profile on mount so tutors can correct mistaken info or resubmit rejected docs
  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "tutor") router.push("/dashboard");

    if (!loading && user && user.role === "tutor") {
      // New tutors must start in the market selected at registration, not the
      // historical Pakistan placeholder. A completed profile below still wins.
      if (user.countryCode && user.countryCode !== "PK") {
        const selectedMarket = geo.countries.find((country) => country.code === user.countryCode);
        if (selectedMarket) {
          setStep1((previous) => ({ ...previous, countryCode: selectedMarket.code, countryName: selectedMarket.name, city: user.city || "", timezone: selectedMarket.defaultTimezone, currency: selectedMarket.currency }));
          setStep4((previous) => ({ ...previous, currency: selectedMarket.currency }));
        }
      }
      api.get("/tutors/profile/me")
        .then((res) => {
          const p = res.data?.profile;
          if (p) {
            setStep1({
              fullName: p.user?.name || p.fullName || "",
              phone: p.user?.phone || p.phone || "",
              countryCode: p.countryCode || p.user?.countryCode || "PK",
              countryName: p.countryName || p.user?.countryName || "Pakistan",
              city: p.city || p.user?.city || "Lahore",
              timezone: p.timezone || p.user?.timezone || "Asia/Karachi",
              currency: p.currency || "PKR",
              gender: p.gender || "male",
              dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
            });

            if (p.education?.[0]) {
              setStep2({
                degree: p.education[0].degree || "",
                institution: p.education[0].institution || "",
                year: p.education[0].year ? String(p.education[0].year) : "",
              });
            }

            setStep3({
              experience: p.experience ? String(p.experience) : "",
              previousInstitutions: Array.isArray(p.previousInstitutions) ? p.previousInstitutions.join(", ") : "",
            });
            if (Array.isArray(p.subjects) && p.subjects.length > 0) {
              setSelectedSubjects(p.subjects);
            }
            if (Array.isArray(p.levels) && p.levels.length > 0) {
              setSelectedLevels(p.levels);
            }

            setStep4({
              bio: p.bio || "",
              hourlyRate: p.hourlyRate ? String(p.hourlyRate) : "",
              currency: p.currency || "PKR",
              serviceAreas: Array.isArray(p.serviceAreas) ? p.serviceAreas.join(", ") : (p.serviceAreas || ""),
              travelRadiusKm: p.travelRadiusKm ? String(p.travelRadiusKm) : "10",
              teachingMode: p.teachingMode || "both",
            });
            if (Array.isArray(p.availability) && p.availability.length > 0) {
              setAvailability(p.availability);
            }

            const docs: ExistingDocsState = {
              degreeDoc: p.education?.[0]?.degreeDoc,
              cnicFront: p.cnicFront,
              cnicBack: p.cnicBack,
              videoIntro: p.videoIntro || "",
              policeCertificate: p.policeCertificate,
              cnicVerificationStatus: p.cnicVerificationStatus,
              cnicRejectionReason: p.cnicRejectionReason,
              degreeVerificationStatus: p.degreeVerificationStatus,
              degreeRejectionReason: p.degreeRejectionReason,
              demoVideoStatus: p.demoVideoStatus,
              demoVideoRejectionReason: p.demoVideoRejectionReason,
              policeVerificationStatus: p.policeVerificationStatus,
              policeRejectionReason: p.policeRejectionReason,
              verificationStatus: p.verificationStatus,
              rejectionReason: p.rejectionReason,
            };
            setExistingDocs(docs);

            // If a specific document is rejected, jump directly to that step!
            if (
              p.cnicVerificationStatus === "rejected" ||
              p.demoVideoStatus === "rejected" ||
              p.policeVerificationStatus === "rejected"
            ) {
              setCurrentStep(5);
            } else if (p.degreeVerificationStatus === "rejected") {
              setCurrentStep(2);
            }
          }
        })
        .catch(() => {});
    }
  }, [user, loading, router, geo.countries]);

  useEffect(() => {
    if (currentStep !== 4 || !step1.city) return;
    const citySlug = step1.city.toLowerCase().replace(/\s+/g, "-");
    const subject = selectedSubjects[0];
    const params = new URLSearchParams({ city: citySlug });
    if (subject) params.set("subject", subject);
    api.get(`/pricing/insights?${params}`)
      .then((res) => {
        const insight = res.data?.insight;
        if (insight?.count >= 3) setPricingInsight(insight);
        else setPricingInsight(null);
      })
      .catch(() => setPricingInsight(null));
  }, [currentStep, step1.city, selectedSubjects]);

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    if (arr.includes(item)) setter(arr.filter(i => i !== item));
    else setter([...arr, item]);
  };

  const toggleAvailability = (day: string, slot: string) => {
    setAvailability(prev => {
      const existing = prev.find(a => a.day === day);
      if (existing) {
        const newSlots = existing.slots.includes(slot)
          ? existing.slots.filter(s => s !== slot)
          : [...existing.slots, slot];
        if (newSlots.length === 0) return prev.filter(a => a.day !== day);
        return prev.map(a => a.day === day ? { ...a, slots: newSlots } : a);
      }
      return [...prev, { day, slots: [slot] }];
    });
  };

  const isSlotSelected = (day: string, slot: string) => {
    return availability.find(a => a.day === day)?.slots.includes(slot) || false;
  };

  // Whether teaching mode mandates the selected market's safety verification.
  const isHomeTuitionMandatory = step4.teachingMode === "in-person";
  const isOnlineOnly = step4.teachingMode === "online";

  const handleNext = async () => {
    setError("");
    setSuccessMsg("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("step", currentStep.toString());

      if (currentStep === 1) {
        if (!step1.fullName || !step1.phone || !step1.city) {
          setError("Please fill all required fields."); setSaving(false); return;
        }
        formData.append("data", JSON.stringify(step1));
      }

      else if (currentStep === 2) {
        if (!step2.degree || !step2.institution || !step2.year) {
          setError("Please fill all required fields."); setSaving(false); return;
        }
        formData.append("data", JSON.stringify(step2));
        if (degreeDoc) formData.append("degreeDoc", degreeDoc);
      }

      else if (currentStep === 3) {
        if (!step3.experience || selectedSubjects.length === 0 || selectedLevels.length === 0) {
          setError("Please select at least one subject and level."); setSaving(false); return;
        }
        formData.append("data", JSON.stringify({
          experience: step3.experience,
          previousInstitutions: step3.previousInstitutions.split(",").map(s => s.trim()).filter(Boolean),
          subjects: selectedSubjects,
          levels: selectedLevels,
        }));
      }

      else if (currentStep === 4) {
        if (!step4.bio || !step4.hourlyRate) {
          setError("Please fill all required fields."); setSaving(false); return;
        }
        formData.append("data", JSON.stringify({
          ...step4,
          currency: step1.currency || step4.currency || "PKR",
          availability,
        }));
      }

      else if (currentStep === 5) {
        const hasCnicFront = Boolean(cnicFront || existingDocs.cnicFront);
        const hasCnicBack = Boolean(cnicBack || existingDocs.cnicBack);

        if (!hasCnicFront || !hasCnicBack) {
          setError("Please upload both sides of your identity document.");
          setSaving(false);
          return;
        }

        if (existingDocs.cnicVerificationStatus === "rejected" && !cnicFront && !cnicBack) {
          setError(`Your identity document was rejected (${existingDocs.cnicRejectionReason || "Action required"}). Please select new, clear images to re-submit.`);
          setSaving(false);
          return;
        }

        const hasPolice = Boolean(policeCertificate || existingDocs.policeCertificate);
        if (isHomeTuitionMandatory && !hasPolice) {
          setError("Background and safety verification is mandatory for home tuition. Please upload the required local safety document.");
          setSaving(false);
          return;
        }

        if (isHomeTuitionMandatory && existingDocs.policeVerificationStatus === "rejected" && !policeCertificate) {
          setError(`Your background and safety document was rejected (${existingDocs.policeRejectionReason || "Action required"}). Please select a new document to re-submit.`);
          setSaving(false);
          return;
        }

        if (existingDocs.demoVideoStatus === "rejected" && !videoIntro) {
          setError(`Your Demo Video was rejected (${existingDocs.demoVideoRejectionReason || "Action required"}). Please provide a replacement demo video URL to re-submit.`);
          setSaving(false);
          return;
        }

        formData.append("data", JSON.stringify({ demoVideoUrl: videoIntro }));
        if (cnicFront) formData.append("cnicFront", cnicFront);
        if (cnicBack) formData.append("cnicBack", cnicBack);
        if (policeCertificate) formData.append("policeCertificate", policeCertificate);
      }

      try {
        await api.post("/tutors/onboarding/step", formData);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Failed to save. Please try again.";
        setError(msg);
        setSaving(false);
        return;
      }

      setSuccessMsg("Step saved successfully.");

      if (currentStep === 5) {
        router.push("/onboarding/tutor/complete");
      } else {
        setCurrentStep(prev => prev + 1);
      }
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
          <span style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>TUTORERA<span style={{ color: '#C81B7F' }}>®</span></span>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.3rem' }}>
          Tutor Profile & Document Verification
        </p>
      </div>

      {/* Interactive Progress Stepper — Tutors can click any step to correct mistaken information */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 1rem', overflowX: 'auto' }}>
        <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'fit-content', padding: '0 0.5rem' }}>
          {STEPS.map((step, idx) => {
            const hasRejectionOnStep = (step.number === 2 && existingDocs.degreeVerificationStatus === "rejected") ||
              (step.number === 5 && (existingDocs.cnicVerificationStatus === "rejected" || existingDocs.demoVideoStatus === "rejected" || existingDocs.policeVerificationStatus === "rejected"));

            return (
              <div
                key={step.number}
                onClick={() => { setError(""); setSuccessMsg(""); setCurrentStep(step.number); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: idx < STEPS.length - 1 ? 1 : 'none',
                  cursor: 'pointer',
                }}
                title={`Click to review/edit ${step.title}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    backgroundColor: hasRejectionOnStep ? '#ef4444' : step.number < currentStep ? '#16a34a' : step.number === currentStep ? C.accent : '#e5e7eb',
                    color: (hasRejectionOnStep || step.number <= currentStep) ? 'white' : '#9ca3af',
                    transition: 'all 0.3s',
                    flexShrink: 0
                  }}>
                    {hasRejectionOnStep ? "!" : step.number < currentStep ? "✓" : step.number}
                  </div>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: '600',
                    color: hasRejectionOnStep ? '#dc2626' : step.number === currentStep ? C.accent : step.number < currentStep ? '#16a34a' : '#9ca3af',
                    whiteSpace: 'nowrap'
                  }}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '2px', backgroundColor: step.number < currentStep ? '#16a34a' : '#e5e7eb', margin: '0 0.25rem', marginBottom: '1rem', minWidth: '20px', transition: 'background 0.3s' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div style={{ maxWidth: '640px', margin: '1.5rem auto 4rem', padding: '0 1rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.75rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>

          {/* Quick Notice about updating info anytime */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#64748b' }}>
            <span>💡 Tip: Click any step tab above to jump and correct mistakes.</span>
            {existingDocs.verificationStatus && (
              <span style={{ fontWeight: 700, color: existingDocs.verificationStatus === 'approved' ? '#16a34a' : existingDocs.verificationStatus === 'rejected' ? '#dc2626' : '#d97706' }}>
                Status: {existingDocs.verificationStatus.toUpperCase()}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#166534', fontSize: '0.875rem' }}>
              {successMsg}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {currentStep === 1 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Personal Information</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Review or correct your personal details and location.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Full Name *</label>
                  <input value={step1.fullName} onChange={e => setStep1({ ...step1, fullName: e.target.value })} placeholder="Muhammad Ahmad"
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
                      setStep4(prev => ({ ...prev, currency: c.currency }));
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
                    <input value={step1.phone} onChange={e => setStep1({ ...step1, phone: e.target.value })} placeholder="e.g. +92 300 1234567"
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Date of Birth</label>
                    <input type="date" value={step1.dateOfBirth} onChange={e => setStep1({ ...step1, dateOfBirth: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Gender</label>
                    <select title="gender" value={step1.gender} onChange={e => setStep1({ ...step1, gender: e.target.value })}
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

          {/* ── STEP 2 ── */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Educational Background</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Review or correct your qualification and degree certificate.</p>

              {/* Rejection Alert for Degree if rejected */}
              {existingDocs.degreeVerificationStatus === "rejected" && (
                <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    <AlertTriangle size={18} />
                    <span>Degree Document Rejected by Admin</span>
                  </div>
                  <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                    <strong>Admin feedback:</strong> {existingDocs.degreeRejectionReason || "Please upload a clear, legible copy of your degree or transcript."}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Degree / Qualification *</label>
                  <input value={step2.degree} onChange={e => setStep2({ ...step2, degree: e.target.value })} placeholder="e.g. BS Mathematics"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Institution *</label>
                  <input value={step2.institution} onChange={e => setStep2({ ...step2, institution: e.target.value })} placeholder="e.g. COMSATS University Islamabad"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Graduation Year *</label>
                  <input type="number" value={step2.year} onChange={e => setStep2({ ...step2, year: e.target.value })} placeholder="e.g. 2022" min="1990" max="2030"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>Upload Degree Certificate</label>
                    {existingDocs.degreeDoc && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: existingDocs.degreeVerificationStatus === 'approved' ? '#16a34a' : '#d97706' }}>
                        {existingDocs.degreeVerificationStatus === 'approved' ? '✓ Approved' : '📄 Current Doc On File'}
                      </span>
                    )}
                  </div>
                  <div style={{ border: '2px dashed #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', backgroundColor: C.gray50 }}
                    onClick={() => document.getElementById('degreeDoc')?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.accent; }}
                    onDragLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                    {degreeDoc ? (
                      <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.875rem' }}>✅ Selected: {degreeDoc.name}</p>
                    ) : existingDocs.degreeDoc ? (
                      <div>
                        <p style={{ color: '#0329b2', fontSize: '0.875rem', fontWeight: 600 }}>📄 Document already uploaded</p>
                        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>Click here if you wish to upload a new replacement document</p>
                      </div>
                    ) : (
                      <>
                        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Click to upload or drag & drop</p>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>PDF, JPG, PNG (max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input id="degreeDoc" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDegreeDoc(e.target.files?.[0] || null)} aria-label="degreeDoc" style={{ display: 'none' }} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Teaching Experience</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Review or correct your teaching background.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Years of Experience</label>
                  <input type="number" value={step3.experience} onChange={e => setStep3({ ...step3, experience: e.target.value })} placeholder="e.g. 3" min="0" max="50"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Previous Institutions (comma separated)</label>
                  <input value={step3.previousInstitutions} onChange={e => setStep3({ ...step3, previousInstitutions: e.target.value })} placeholder="e.g. Beaconhouse, LGS, KIPS"
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Subjects You Teach *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {subjects.map(s => (
                      <button key={s} type="button" onClick={() => toggleItem(selectedSubjects, s, setSelectedSubjects)}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', border: `1.5px solid ${selectedSubjects.includes(s) ? C.accent : '#e5e7eb'}`, backgroundColor: selectedSubjects.includes(s) ? C.accentLight : 'white', color: selectedSubjects.includes(s) ? C.accent : C.gray500, fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Levels You Teach *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {levels.map(l => (
                      <button key={l} type="button" onClick={() => toggleItem(selectedLevels, l, setSelectedLevels)}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', border: `1.5px solid ${selectedLevels.includes(l) ? C.accent : '#e5e7eb'}`, backgroundColor: selectedLevels.includes(l) ? C.accentLight : 'white', color: selectedLevels.includes(l) ? C.accent : C.gray500, fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {currentStep === 4 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Profile Setup</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Review or adjust your bio, rate, and teaching mode.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Bio / Introduction *</label>
                  <textarea value={step4.bio} onChange={e => setStep4({ ...step4, bio: e.target.value })} rows={4}
                    placeholder="Tell students about yourself, your teaching style, and what makes you a great tutor..."
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, resize: 'vertical', fontFamily: 'inherit' }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                      Hourly Rate ({step1.currency || "PKR"}) *
                    </label>
                    <input type="number" value={step4.hourlyRate} onChange={e => setStep4({ ...step4, hourlyRate: e.target.value })} placeholder={step1.currency === "PKR" ? "e.g. 2000" : "e.g. 50"}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                    {step1.currency !== "PKR" && Number(step4.hourlyRate) > 0 && (
                      <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "#0329b2", fontWeight: 600 }}>
                        ≈ Rs. {convertToPKR(Number(step4.hourlyRate), step1.currency).amountPKR.toLocaleString()} PKR/hr
                      </p>
                    )}
                    {pricingInsight && pricingInsight.median && (
                      <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", color: "#16a34a", fontWeight: 500 }}>
                        💡 Similar tutors in {step1.city} charge PKR {pricingInsight.min?.toLocaleString()}–{pricingInsight.max?.toLocaleString()}/hr (median: PKR {pricingInsight.median?.toLocaleString()})
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Teaching Mode *</label>
                    <select title="teachingMode" value={step4.teachingMode} onChange={e => setStep4({ ...step4, teachingMode: e.target.value as "online" | "in-person" | "both" })}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, backgroundColor: 'white' }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                      <option value="online">🌐 Online Tuition Only (No Police Check Required)</option>
                      <option value="in-person">🏠 Home Tuition (In-Person — Police Report Mandatory)</option>
                      <option value="both">🌐 + 🏠 Both (Online & Home Tuition)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Weekly Availability</label>
                  <p style={{ color: C.gray500, fontSize: '0.78rem', marginBottom: '0.75rem' }}>Select the time slots when you are available to take classes.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {days.map(day => (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', width: '80px', color: C.primary }}>{day}</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {timeSlots.slice(0, 6).map(slot => {
                            const sel = isSlotSelected(day, slot);
                            return (
                              <button key={slot} type="button" onClick={() => toggleAvailability(day, slot)}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderRadius: '4px', border: `1px solid ${sel ? C.accent : '#e5e7eb'}`, backgroundColor: sel ? C.accent : 'white', color: sel ? 'white' : C.gray500, cursor: 'pointer' }}>
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5 ── */}
          {currentStep === 5 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: C.primary, marginBottom: '0.4rem' }}>Verification Documents</h2>
              <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Upload or replace your identification and verification documents.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* ── CNIC Front & Back ── */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>
                      Identity Document — Front & Back *
                    </label>
                    {existingDocs.cnicFront && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: existingDocs.cnicVerificationStatus === 'approved' ? '#16a34a' : existingDocs.cnicVerificationStatus === 'rejected' ? '#dc2626' : '#d97706' }}>
                        {existingDocs.cnicVerificationStatus === 'approved' ? '✓ Approved' : existingDocs.cnicVerificationStatus === 'rejected' ? '❌ Rejected' : '⏳ On File (Pending)'}
                      </span>
                    )}
                  </div>

                  {/* Rejection Alert for CNIC */}
                  {existingDocs.cnicVerificationStatus === "rejected" && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <p style={{ color: '#b91c1c', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                        <strong>Admin rejection reason:</strong> {existingDocs.cnicRejectionReason || "Please upload fresh, clear photos of both sides of your identity document."}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {/* CNIC Front */}
                    <div>
                      <div style={{ border: '2px dashed #e5e7eb', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', cursor: 'pointer', backgroundColor: C.gray50 }}
                        onClick={() => document.getElementById('cnicFront')?.click()}>
                        {cnicFront ? (
                          <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.8rem' }}>✅ Selected: {cnicFront.name}</p>
                        ) : existingDocs.cnicFront ? (
                          <div>
                            <p style={{ color: '#0329b2', fontSize: '0.8rem', fontWeight: 600 }}>📄 CNIC Front on file</p>
                            <p style={{ color: '#64748b', fontSize: '0.7rem' }}>Click to replace</p>
                          </div>
                        ) : (
                          <p style={{ color: C.gray500, fontSize: '0.8rem' }}>Click to upload identity document front</p>
                        )}
                      </div>
                      <input id="cnicFront" type="file" accept="image/*" onChange={e => setCnicFront(e.target.files?.[0] || null)} aria-label="upload" style={{ display: 'none' }} />
                    </div>

                    {/* CNIC Back */}
                    <div>
                      <div style={{ border: '2px dashed #e5e7eb', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', cursor: 'pointer', backgroundColor: C.gray50 }}
                        onClick={() => document.getElementById('cnicBack')?.click()}>
                        {cnicBack ? (
                          <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.8rem' }}>✅ Selected: {cnicBack.name}</p>
                        ) : existingDocs.cnicBack ? (
                          <div>
                            <p style={{ color: '#0329b2', fontSize: '0.8rem', fontWeight: 600 }}>📄 CNIC Back on file</p>
                            <p style={{ color: '#64748b', fontSize: '0.7rem' }}>Click to replace</p>
                          </div>
                        ) : (
                          <p style={{ color: C.gray500, fontSize: '0.8rem' }}>Click to upload identity document back</p>
                        )}
                      </div>
                      <input id="cnicBack" type="file" accept="image/*" onChange={e => setCnicBack(e.target.files?.[0] || null)} aria-label="image" style={{ display: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* ── Police Certificate ── */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>
                      Background & Safety Verification
                      {isHomeTuitionMandatory ? (
                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>* (Mandatory for Home Tuition)</span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: '500', marginLeft: '6px' }}>(Optional for Online)</span>
                      )}
                    </label>
                    {existingDocs.policeCertificate && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: existingDocs.policeVerificationStatus === 'approved' ? '#16a34a' : existingDocs.policeVerificationStatus === 'rejected' ? '#dc2626' : '#d97706' }}>
                        {existingDocs.policeVerificationStatus === 'approved' ? '✓ Approved' : existingDocs.policeVerificationStatus === 'rejected' ? '❌ Rejected' : '⏳ On File (Pending)'}
                      </span>
                    )}
                  </div>

                  {existingDocs.policeVerificationStatus === "rejected" && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <p style={{ color: '#b91c1c', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                        <strong>Admin rejection reason:</strong> {existingDocs.policeRejectionReason || "Please upload an official, legible background or safety document accepted in your market."}
                      </p>
                    </div>
                  )}

                  <div
                    style={{
                      border: '2px dashed #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '1.25rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      backgroundColor: C.gray50
                    }}
                    onClick={() => document.getElementById('policeCertificate')?.click()}
                  >
                    {policeCertificate ? (
                      <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.875rem' }}>✅ Selected: {policeCertificate.name}</p>
                    ) : existingDocs.policeCertificate ? (
                      <div>
                        <p style={{ color: '#0329b2', fontSize: '0.875rem', fontWeight: 600 }}>📄 Police Certificate currently on file</p>
                        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>Click to select a new replacement certificate if needed</p>
                      </div>
                    ) : (
                      <>
                        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
                          {isOnlineOnly ? "Click to upload Police Certificate (Optional)" : "Click to upload Police Verification Report"}
                        </p>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>PDF, JPG, PNG (max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    id="policeCertificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setPoliceCertificate(e.target.files?.[0] || null)}
                    aria-label="Background and safety document"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* ── Video Intro ── */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>
                      Demo Video URL <span style={{ color: '#9ca3af', fontWeight: '400' }}>(Recommended)</span>
                    </label>
                    {existingDocs.videoIntro && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: existingDocs.demoVideoStatus === 'approved' ? '#16a34a' : existingDocs.demoVideoStatus === 'rejected' ? '#dc2626' : '#d97706' }}>
                        {existingDocs.demoVideoStatus === 'approved' ? '✓ Approved' : existingDocs.demoVideoStatus === 'rejected' ? '❌ Rejected' : '🎥 On File (Pending)'}
                      </span>
                    )}
                  </div>

                  {existingDocs.demoVideoStatus === "rejected" && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <p style={{ color: '#b91c1c', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                        <strong>Admin rejection reason:</strong> {existingDocs.demoVideoRejectionReason || "Please provide a new demo video URL."}
                      </p>
                    </div>
                  )}

                  <input
                    type="url"
                    value={videoIntro}
                    onChange={e => setVideoIntro(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1.5px solid #e5e7eb',
                      fontSize: '0.85rem',
                      outline: 'none',
                      color: '#021550',
                      backgroundColor: C.gray50,
                      boxSizing: 'border-box',
                    }}
                  />
                  {existingDocs.videoIntro && !videoIntro && (
                    <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                      Currently: <a href={existingDocs.videoIntro} target="_blank" rel="noreferrer" style={{ color: '#0329b2' }}>{existingDocs.videoIntro}</a>
                    </p>
                  )}
                </div>

                {/* Review Info box */}
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1rem' }}>
                  <p style={{ color: '#1e40af', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                    🔄 Instant Re-submission & Review Queue
                  </p>
                  <p style={{ color: '#1d4ed8', fontSize: '0.78rem', lineHeight: '1.5', margin: 0 }}>
                    When you submit replacement documents, your application status automatically updates to <strong>Under Review</strong> and alerts our verification team to inspect your updated files within 24–48 hours.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6', gap: '1rem' }}>
            {currentStep > 1 ? (
              <button
                onClick={() => { setError(""); setSuccessMsg(""); setCurrentStep(prev => prev - 1); }}
                style={{ flex: 1, padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', color: C.primary }}
              >
                ← Back
              </button>
            ) : <div style={{ flex: 1 }} />}

            <button
              onClick={handleNext}
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                backgroundColor: saving ? '#93c5fd' : C.accent,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '700'
              }}
            >
              {saving ? "Saving..." : currentStep === 5 ? "Submit Documents 🚀" : "Save & Continue →"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
