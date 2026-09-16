"use client";

import { useGeoData } from "@/lib/geoService";
import { COUNTRIES,Country,getCountryByCode } from "@/lib/location";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CountryCityPickerModal from "./CountryCityPickerModal";

export default function QuickRequestComposer() {
  const router = useRouter();
  const geo = useGeoData();
  const [mode, setMode] = useState<"in-person" | "online" | "both">("online");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("O-Level");
  const [countryCode, setCountryCode] = useState("PK");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("2000");

  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const currentCountry = (geo.countries && geo.countries.find((c) => c.code === countryCode)) || getCountryByCode(countryCode) || COUNTRIES[0];
  const popularSubjects = geo.subjects && geo.subjects.length > 0 ? geo.subjects : [
    "Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "Economics", "O / A Level"
  ];
  const popularLevels = geo.levels && geo.levels.length > 0 ? geo.levels : [
    "Primary", "Middle (6-8)", "Matric", "FSc / Inter", "O-Level", "A-Level", "University"
  ];

  const handleLocationSelect = (country: Country, pickedCity: string) => {
    setCountryCode(country.code);
    setCity(pickedCity || "");
    if (country.code === "PK") {
      setBudget("2000");
    } else if (["US", "GB", "CA", "AU"].includes(country.code)) {
      setBudget("25");
    } else if (["AE", "SA", "QA"].includes(country.code)) {
      setBudget("80");
    } else {
      setBudget("30");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quickPayload = {
      subject: subject.trim() || "General Studies",
      level: level || "Secondary",
      teachingMode: mode,
      countryCode: currentCountry.code,
      countryName: currentCountry.name,
      currency: currentCountry.currency,
      timezone: currentCountry.defaultTimezone,
      isWorldwideEligible: mode === "online" || mode === "both",
      city: mode === "online" ? "" : city,
      budget: budget || (currentCountry.code === "PK" ? "2000" : "30"),
      pricingUnit: "hour",
    };

    try {
      sessionStorage.setItem("tutorera_quick_request", JSON.stringify(quickPayload));
    } catch {}

    if (mode === "in-person") {
      router.push("/post-home-tuition-request");
    } else if (mode === "online") {
      router.push("/post-online-tuition-request");
    } else {
      router.push("/post-tuition-request");
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "1.25rem",
        padding: "clamp(1.25rem, 3vw, 2rem)",
        boxShadow: "0 12px 36px rgba(2, 21, 80, 0.08)",
        border: "1px solid #e2e8f0",
        maxWidth: 1120,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              background: "#eef5ff",
              color: "#0329b2",
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Student Demand
          </span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#021550", margin: 0 }}>
            What Tutor Do You Need?
          </h2>
        </div>
        <span style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Sparkles size={14} color="#f59e0b" /> Verified tutors send offers to your budget
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* 1. Large Segmented Learning Mode Choice */}
        <div>
          <label style={labelStyle}>1. How do you want to learn?</label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: "0.75rem",
            }}
          >
            {/* Online */}
            <button
              type="button"
              onClick={() => setMode("online")}
              style={modeCardStyle(mode === "online")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "1.25rem" }}>🌐</span>
                {mode === "online" && <Check size={16} color="#0329b2" />}
              </div>
              <strong style={{ fontSize: "0.95rem", color: "#021550", display: "block" }}>
                Online Tuition
              </strong>
              <span style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                Live 1-on-1 sessions from tutors worldwide.
              </span>
            </button>

            {/* Home */}
            <button
              type="button"
              onClick={() => setMode("in-person")}
              style={modeCardStyle(mode === "in-person")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "1.25rem" }}>🏡</span>
                {mode === "in-person" && <Check size={16} color="#0329b2" />}
              </div>
              <strong style={{ fontSize: "0.95rem", color: "#021550", display: "block" }}>
                Home Tuition
              </strong>
              <span style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                Verified tutor comes to your home location.
              </span>
            </button>

            {/* Either */}
            <button
              type="button"
              onClick={() => setMode("both")}
              style={modeCardStyle(mode === "both")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "1.25rem" }}>⚡</span>
                {mode === "both" && <Check size={16} color="#0329b2" />}
              </div>
              <strong style={{ fontSize: "0.95rem", color: "#021550", display: "block" }}>
                Either / Flexible
              </strong>
              <span style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                Compare local home tutors and global online tutors.
              </span>
            </button>
          </div>
        </div>

        {/* 2. Core Request Fields (Subject, Level, Location, Budget) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "1rem",
            alignItems: "end",
          }}
        >
          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics, Physics..."
              required
              style={inputStyle}
            />
          </div>

          {/* Level */}
          <div>
            <label style={labelStyle}>Level / Grade</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={inputStyle}
            >
              {popularLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Location Touch Card */}
          <div>
            <label style={labelStyle}>
              {mode === "online" ? "Your Country" : "Your Location (City)"}
            </label>
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflow: "hidden" }}>
                <span>{currentCountry.flag}</span>
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mode === "online" ? currentCountry.name : `${city || currentCountry.name}`}
                </span>
              </div>
              <ChevronDown size={16} color="#64748b" />
            </button>
          </div>

          {/* Preferred Hourly Budget */}
          <div>
            <label style={labelStyle}>
              Your Proposed Rate ({currentCountry.currency}/hr)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={currentCountry.code === "PK" ? "2000" : "30"}
                required
                style={{ ...inputStyle, paddingRight: "3.5rem" }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#64748b",
                  pointerEvents: "none",
                }}
              >
                {currentCountry.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Popular Subject Quick Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Suggestions:</span>
          {popularSubjects.slice(0, 8).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubject(sub)}
              style={{
                background: subject === sub ? "#eef5ff" : "#f8fafc",
                color: subject === sub ? "#0329b2" : "#475569",
                border: subject === sub ? "1.5px solid #0329b2" : "1px solid #e2e8f0",
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            type="submit"
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #0329b2 0%, #016ef8 100%)",
              color: "white",
              border: "none",
              padding: "0.95rem 1.5rem",
              borderRadius: "0.75rem",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              boxShadow: "0 8px 24px rgba(3, 41, 178, 0.3)",
              minHeight: "48px",
            }}
          >
            <span>Find Tutors for My Requirement</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </form>

      {/* Location Picker Modal */}
      <CountryCityPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        selectedCountryCode={countryCode}
        selectedCity={city}
        onSelect={handleLocationSelect}
        mode={mode === "online" ? "country_only" : "country_and_city"}
        countries={geo.countries}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#021550",
  marginBottom: "0.4rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "0.625rem",
  border: "1.5px solid #cbd5e1",
  fontSize: "0.9rem",
  color: "#021550",
  background: "white",
  outline: "none",
  boxSizing: "border-box",
  minHeight: "48px",
};

function modeCardStyle(isSelected: boolean): React.CSSProperties {
  return {
    background: isSelected ? "#eff6ff" : "#f8fafc",
    border: isSelected ? "2px solid #0329b2" : "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    padding: "0.85rem 1rem",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s ease",
    display: "flex",
    flexDirection: "column",
  };
}
