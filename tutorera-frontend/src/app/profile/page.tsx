"use client";
import { UI_COLORS } from "@/lib/brand";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Camera, Save, User, Mail, Phone, MapPin, BookOpen } from "lucide-react";
import api from "@/lib/axios";
import { useAppGuard } from "@/hooks/useAppGuard";
import { useGeoData } from "@/lib/geoService";
import { getCitiesForCountry } from "@/lib/location";
import { catalogueSubjectNames } from "@/lib/subject-catalogue";

const C = UI_COLORS;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const geo = useGeoData();
  // A rejected or incomplete tutor must be able to repair their profile and
  // resubmit documents. Eligibility remains required for marketplace actions,
  // not for this account-management page.
  const guardStatus = useAppGuard({ requireTutorEligibility: false });
  const router = useRouter();

  const subjects = useMemo(
    () => geo.subjects && geo.subjects.length > 0 ? geo.subjects : catalogueSubjectNames,
    [geo.subjects]
  );
  const levels = useMemo(
    () => geo.levels && geo.levels.length > 0 ? geo.levels : ["Primary (Grades 1-5)", "Middle (Grades 6-8)", "Matric (9th & 10th)", "Intermediate / FSc", "O-Level (Cambridge / Edexcel)", "A-Level (Cambridge / Edexcel)", "IB (Middle Years / Diploma)", "University / Degree", "Test Preparation", "Other"],
    [geo.levels]
  );

  const [activeTab, setActiveTab] = useState<"personal" | "tutor">("personal");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Personal info form
  const [personalForm, setPersonalForm] = useState({
    name: "", phone: "", city: "", address: "", countryCode: "PK", countryName: "Pakistan", postalCode: "", lat: null as number | null, lng: null as number | null
  });

  const userCountryCode = personalForm.countryCode || user?.countryCode || "PK";
  const [cities, setCities] = useState<string[]>(() => getCitiesForCountry(userCountryCode).map(ct => ct.name));

  useEffect(() => {
    let cancelled = false;
    api.get(`/geo/cities?country=${encodeURIComponent(userCountryCode)}&limit=100`)
      .then((res) => {
        if (cancelled) return;
        const remote = (res.data?.cities || []).map((c: { name: string }) => c.name);
        setCities(remote.length > 0 ? remote : getCitiesForCountry(userCountryCode).map(ct => ct.name));
      })
      .catch(() => { if (!cancelled) setCities(getCitiesForCountry(userCountryCode).map(ct => ct.name)); });
    return () => { cancelled = true; };
  }, [userCountryCode]);

  // Tutor profile form
  const [tutorForm, setTutorForm] = useState({
    bio: "", hourlyRate: "", experience: "",
    subjects: [] as string[], levels: [] as string[],
    teachingMode: "both" as "online" | "in-person" | "both",
    city: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [cnicFrontFile, setCnicFrontFile] = useState<File | null>(null);
  const [cnicBackFile, setCnicBackFile] = useState<File | null>(null);
  const [videoIntroFile, setVideoIntroFile] = useState<File | null>(null);
  const [tutorProfile, setTutorProfile] = useState<{
    verificationStatus?: string;
    isVerified?: boolean;
    currency?: string;
    countryCode?: string;
  } | null>(null);

  const normalizeTutorLevel = (value: string) => {
    const aliases: Record<string, string> = {
      primary: "Primary (Grades 1-5)",
      middle: "Middle (Grades 6-8)",
      matric: "Matric (9th & 10th)",
      intermediate: "Intermediate / FSc",
      fsc: "Intermediate / FSc",
      "o-level": "O-Level (Cambridge / Edexcel)",
      "o level": "O-Level (Cambridge / Edexcel)",
      "a-level": "A-Level (Cambridge / Edexcel)",
      "a level": "A-Level (Cambridge / Edexcel)",
      university: "University / Degree",
      "university level": "University / Degree",
    };
    const key = value.toLowerCase().replace(/[()/]/g, " ").replace(/\s+/g, " ").trim();
    return aliases[key] || levels.find((level) => level.toLowerCase().replace(/[()/]/g, " ").replace(/\s+/g, " ").trim() === key) || value;
  };

  const apiErrorMessage = (err: unknown, fallback: string) => {
    if (typeof err === "object" && err !== null && "response" in err) {
      const response = (err as { response?: { data?: { message?: unknown; errors?: unknown } } }).response;
      if (typeof response?.data?.message === "string") return response.data.message;
      if (Array.isArray(response?.data?.errors) && typeof response.data.errors[0] === "string") return response.data.errors[0];
    }
    return fallback;
  };

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      // Fetch full user data to get phone and city
        api.get("/auth/me").then(res => {
          const u = res.data.user;
            setPersonalForm({
              name: u.name || "",
              phone: u.phone || "",
              city: u.city || "",
              address: u.address || "",
              countryCode: u.countryCode || "PK",
              countryName: u.countryName || "Pakistan",
              postalCode: u.postalCode || "",
              lat: u.location?.coordinates?.[1] || null,
              lng: u.location?.coordinates?.[0] || null,
            });
        }).catch(() => {
      setPersonalForm({
        name: user.name || "",
        phone: "",
        city: "",
        address: "",
        countryCode: user.countryCode || "PK",
        countryName: user.countryName || "Pakistan",
        postalCode: "",
        lat: null,
        lng: null,
      });
    });

      // Fetch tutor profile if tutor
      if (user.role === "tutor") {
        api.get("/tutors/profile/me")
          .then(res => {
            const p = res.data.profile;
            setTutorProfile(p);
            setTutorForm({
              bio: p.bio || "",
              hourlyRate: p.hourlyRate?.toString() || "",
              experience: p.experience?.toString() || "",
              subjects: (p.subjects || []).filter((s: string) => subjects.includes(s)),
              levels: [...new Set(((p.levels || []) as string[]).map(normalizeTutorLevel))].filter((l) => levels.includes(l)),
              teachingMode: p.teachingMode || "both",
              city: p.city || "",
            });
          }).catch(() => {});
      }
    }
  }, [user, loading, router, subjects, levels]);

    // ← ADD: block pending/rejected tutors + show spinner while checking
  if (guardStatus !== "ok") return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handlePersonalSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      // 1. Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        await api.post("/upload/avatar", formData);
      }
      // 2. Update personal info (name, phone, city, address, country)
      await api.patch("/auth/update-profile", {
        name: personalForm.name,
        phone: personalForm.phone,
        city: personalForm.city,
        address: personalForm.address,
        countryCode: personalForm.countryCode,
        countryName: personalForm.countryName,
        postalCode: personalForm.postalCode,
        lat: personalForm.lat,
        lng: personalForm.lng,
      });

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleTutorSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const hourlyRate = Number(tutorForm.hourlyRate);
      const experience = Number(tutorForm.experience);
      if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
        setError("Enter a valid non-negative hourly rate.");
        return;
      }
      if (!Number.isFinite(experience) || experience < 0) {
        setError("Enter valid years of teaching experience.");
        return;
      }
      if (tutorForm.subjects.length === 0) {
        setError("Choose at least one subject you teach.");
        return;
      }
      if (tutorForm.levels.length === 0) {
        setError("Choose at least one teaching level.");
        return;
      }
      if (cnicFrontFile || cnicBackFile || videoIntroFile) {
        const formData = new FormData();
        if (cnicFrontFile) formData.append("cnicFront", cnicFrontFile);
        if (cnicBackFile) formData.append("cnicBack", cnicBackFile);
        if (videoIntroFile) formData.append("videoIntro", videoIntroFile);
        await api.post("/upload/verification", formData);
      }

      await api.post("/tutors/profile", {
        ...tutorForm,
        hourlyRate,
        experience,
      });
      setSuccess("Tutor profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to update tutor profile."));
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (arr: string[], item: string, setter: (val: string[]) => void) => {
    if (arr.includes(item)) setter(arr.filter(i => i !== item));
    else setter([...arr, item]);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) return null;

  return (
    <div style={{ backgroundColor: C.gray50, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ backgroundColor: C.primary, padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '800', color: 'white', border: '3px solid rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              {avatarPreview || user.avatar ? (
                <img src={avatarPreview || user.avatar} alt={user.name ? `${user.name}'s profile photo` : "Your profile photo"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : user.name.charAt(0).toUpperCase()}
            </div>
            <label style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', backgroundColor: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white' }}>
              <Camera size={13} color="white" />
              <input title="avatar" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>
          {/* Info */}
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', marginBottom: '0.3rem' }}>{user.name}</h1>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', textTransform: 'capitalize', marginBottom: '0.5rem' }}>{user.role} Account</p>
            {user.role === "tutor" && tutorProfile && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: tutorProfile.isVerified ? 'rgba(22,163,74,0.2)' : 'rgba(234,179,8,0.2)', color: tutorProfile.isVerified ? '#86efac' : '#fde047' }}>
                {tutorProfile.isVerified ? '✅ Verified Tutor' : `⏳ ${tutorProfile.verificationStatus || 'Pending'} Verification`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Tabs — show tutor tab only for tutors */}
        {user.role === "tutor" && (
          <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '0.75rem', padding: '0.3rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb', width: 'fit-content' }}>
            {(["personal", "tutor"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', textTransform: 'capitalize', backgroundColor: activeTab === tab ? C.accent : 'transparent', color: activeTab === tab ? 'white' : C.gray500, transition: 'all 0.2s' }}>
                {tab === "tutor" ? "Tutor Profile" : "Personal Info"}
              </button>
            ))}
          </div>
        )}

        {/* Success / Error */}
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: '500' }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* ── PERSONAL INFO TAB ── */}
        {activeTab === "personal" && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: C.primary, marginBottom: '1.75rem' }}>Personal Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Name */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  <User size={15} /> Full Name
                </label>
                <input value={personalForm.name} onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })}
                  title="Full Name"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>

              {/* Email (readonly) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  <Mail size={15} /> Email Address
                </label>
                <input value={user.email} readOnly
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.gray500, backgroundColor: C.gray50, cursor: 'not-allowed' }} />
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.3rem' }}>Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  <Phone size={15} /> Phone
                </label>
                <input value={personalForm.phone} onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                  placeholder="03001234567"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>

              {/* Country + City */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                    <MapPin size={15} /> Country
                  </label>
                  <select title="Country" value={personalForm.countryCode} onChange={e => setPersonalForm({ ...personalForm, countryCode: e.target.value, countryName: e.target.options[e.target.selectedIndex].text, city: "" })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, backgroundColor: 'white' }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                    {geo.countries?.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                    <MapPin size={15} /> City
                  </label>
                  <select title="City" value={personalForm.city} onChange={e => setPersonalForm({ ...personalForm, city: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, backgroundColor: 'white' }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  <MapPin size={15} /> Address / Locality
                </label>
                <input value={personalForm.address} onChange={e => setPersonalForm({ ...personalForm, address: e.target.value })}
                  placeholder="e.g. DHA Phase 1"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>

              {/* Postal Code & Auto Location */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  <MapPin size={15} /> Postal / Zip Code (Used for nearby matches)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input value={personalForm.postalCode} onChange={e => setPersonalForm({ ...personalForm, postalCode: e.target.value })}
                    placeholder="Enter postal code"
                    style={{ flex: 1, padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', color: C.primary }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                  <button type="button" onClick={async () => {
                    if (!personalForm.postalCode) return;
                    try {
                      const res = await api.get(`/geo/postal-lookup?q=${personalForm.postalCode}&country=${personalForm.countryCode}`);
                      if (res.data.results && res.data.results.length > 0) {
                        const loc = res.data.results[0];
                        setPersonalForm({ ...personalForm, lat: loc.lat, lng: loc.lng, city: loc.placeName || personalForm.city });
                        alert(`Location found: ${loc.placeName}`);
                      } else {
                        alert("Could not find location for this postal code.");
                      }
                    } catch (e) {
                      alert("Error fetching location data.");
                    }
                  }} style={{ padding: '0 1rem', backgroundColor: C.accentLight, color: C.accent, border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}>
                    Find Location
                  </button>
                </div>
                {personalForm.lat && personalForm.lng && (
                  <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.4rem' }}>✅ Geospatial coordinates captured.</p>
                )}
              </div>

              {/* Role badge */}
              <div style={{ backgroundColor: C.gray50, borderRadius: '0.5rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookOpen size={18} color={C.accent} />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary, textTransform: 'capitalize' }}>{user.role} Account</p>
                  <p style={{ fontSize: '0.75rem', color: C.gray500 }}>Your account type cannot be changed</p>
                </div>
              </div>

              <button onClick={handlePersonalSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: saving ? '#93c5fd' : C.accent, color: 'white', padding: '0.85rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                <Save size={17} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* ── TUTOR PROFILE TAB ── */}
        {activeTab === "tutor" && user.role === "tutor" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Verification status banner */}
            {tutorProfile && !tutorProfile.isVerified && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⏳</span>
                <div>
                  <p style={{ fontWeight: '700', color: '#92400e', fontSize: '0.9rem' }}>Verification Pending</p>
                  <p style={{ color: '#a16207', fontSize: '0.8rem' }}>Upload your CNIC and degree from the dashboard to speed up verification.</p>
                  <Link href="/tutor/application-status" style={{ color: '#92400e', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'underline' }}>
                    View detailed status of each check
                  </Link>
                </div>
              </div>
            )}

            <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: C.primary, marginBottom: '1.75rem' }}>Tutor Profile</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Bio */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Bio</label>
                  <textarea value={tutorForm.bio} onChange={e => setTutorForm({ ...tutorForm, bio: e.target.value })}
                    rows={4} placeholder="Tell students about your teaching experience, approach, and achievements..."
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, resize: 'vertical', fontFamily: 'inherit' }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                </div>

                {/* Rate + Experience */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                      Hourly Rate ({tutorProfile?.currency || 'USD'})
                    </label>
                    <input type="number" value={tutorForm.hourlyRate} onChange={e => setTutorForm({ ...tutorForm, hourlyRate: e.target.value })}
                      placeholder={tutorProfile?.currency === "PKR" ? "e.g. 2000" : "e.g. 50"}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "#0329b2", fontWeight: 600 }}>
                      Your rate is stored and negotiated in this market&apos;s currency.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Years of Experience</label>
                    <input type="number" value={tutorForm.experience} onChange={e => setTutorForm({ ...tutorForm, experience: e.target.value })}
                      placeholder="e.g. 3"
                      style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                      onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
                  </div>
                </div>

                {/* Teaching Mode */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Teaching Mode</label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {(["online", "in-person", "both"] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setTutorForm({ ...tutorForm, teachingMode: mode })}
                        style={{ padding: '0.5rem 1.25rem', borderRadius: '999px', border: `1.5px solid ${tutorForm.teachingMode === mode ? C.accent : '#e5e7eb'}`, backgroundColor: tutorForm.teachingMode === mode ? C.accentLight : 'white', color: tutorForm.teachingMode === mode ? C.accent : C.gray500, fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                        {mode === "online" ? "🌐 Online Only" : mode === "in-person" ? "🏠 Home Tuition Only" : "🌐 + 🏠 Both"}
                      </button>
                    ))}
                  </div>
                  <div style={{
                    marginTop: '0.65rem',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '0.5rem',
                    border: tutorForm.teachingMode === 'online' ? '1.5px solid #86efac' : '1.5px solid #fcd34d',
                    backgroundColor: tutorForm.teachingMode === 'online' ? '#f0fdf4' : '#fffbeb',
                    fontSize: '0.8rem',
                    lineHeight: '1.4'
                  }}>
                    {tutorForm.teachingMode === 'online' ? (
                      <span style={{ color: '#166534' }}>
                        🟢 <strong>Online Tuition:</strong> You can teach students worldwide after identity and education verification.
                      </span>
                    ) : tutorForm.teachingMode === 'in-person' ? (
                      <span style={{ color: '#92400e' }}>
                        🛡️ <strong>Home Tuition:</strong> The market&apos;s background and safety verification is required before you can accept in-person requests.
                      </span>
                    ) : (
                      <span style={{ color: '#92400e' }}>
                        ⚡ <strong>Both (Online & Home):</strong> Online tuition is available after identity approval. Home tuition requires an approved background and safety check.
                      </span>
                    )}
                  </div>
                </div>

                {/* Subjects */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Subjects You Teach</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {subjects.map(subject => (
                      <button key={subject} type="button"
                        onClick={() => toggleArrayItem(tutorForm.subjects, subject, val => setTutorForm({ ...tutorForm, subjects: val }))}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', border: `1.5px solid ${tutorForm.subjects.includes(subject) ? C.accent : '#e5e7eb'}`, backgroundColor: tutorForm.subjects.includes(subject) ? C.accentLight : 'white', color: tutorForm.subjects.includes(subject) ? C.accent : C.gray500, fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Levels */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.6rem' }}>Levels You Teach</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {levels.map(level => (
                      <button key={level} type="button"
                        onClick={() => toggleArrayItem(tutorForm.levels, level, val => setTutorForm({ ...tutorForm, levels: val }))}
                        style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', border: `1.5px solid ${tutorForm.levels.includes(level) ? C.accent : '#e5e7eb'}`, backgroundColor: tutorForm.levels.includes(level) ? C.accentLight : 'white', color: tutorForm.levels.includes(level) ? C.accent : C.gray500, fontWeight: '500', fontSize: '0.8rem', cursor: 'pointer' }}>
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Your City</label>
                  <select title="select city" value={tutorForm.city} onChange={e => setTutorForm({ ...tutorForm, city: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, backgroundColor: 'white' }}
                    onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Verification Documents */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: C.primary, marginBottom: '1rem' }}>Verification Documents</h3>
                  <p style={{ fontSize: '0.8rem', color: C.gray500, marginBottom: '1rem' }}>Updating these documents will temporarily pause your visibility until approved by our team.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Identity Document — Front</label>
                      <input type="file" accept="image/*" onChange={e => setCnicFrontFile(e.target.files?.[0] || null)}
                        style={{ width: '100%', padding: '0.5rem', border: '1.5px dashed #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', backgroundColor: '#f9fafb' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Identity Document — Back</label>
                      <input type="file" accept="image/*" onChange={e => setCnicBackFile(e.target.files?.[0] || null)}
                        style={{ width: '100%', padding: '0.5rem', border: '1.5px dashed #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', backgroundColor: '#f9fafb' }} />
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Demo Video (Optional)</label>
                    <input type="file" accept="video/*" onChange={e => setVideoIntroFile(e.target.files?.[0] || null)}
                      style={{ width: '100%', padding: '0.5rem', border: '1.5px dashed #e5e7eb', borderRadius: '0.5rem', fontSize: '0.8rem', backgroundColor: '#f9fafb' }} />
                  </div>
                </div>

                <button onClick={handleTutorSave} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: saving ? '#93c5fd' : C.accent, color: 'white', padding: '0.85rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  <Save size={17} /> {saving ? "Saving..." : "Save Tutor Profile"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
