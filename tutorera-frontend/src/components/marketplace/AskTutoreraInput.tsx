"use client";

import { ArrowRight,Loader2,Mic,Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef,useState } from "react";

interface ParsedRequest {
  subject?: string;
  level?: string;
  curriculum?: string;
  mode?: "online" | "home" | "both";
  city?: string;
  area?: string;
  schedule?: string;
  budget?: string;
  currency?: string;
  genderPreference?: string;
}

const SUBJECT_ALIASES: Record<string, string> = {
  "math": "Mathematics",
  "maths": "Mathematics",
  "physics": "Physics",
  "chem": "Chemistry",
  "chemistry": "Chemistry",
  "bio": "Biology",
  "biology": "Biology",
  "eng": "English",
  "english": "English",
  "comp": "Computer Science",
  "computer": "Computer Science",
  "cs": "Computer Science",
  "economics": "Economics",
  "eco": "Economics",
  "accounts": "Accounting",
  "accounting": "Accounting",
  "urdu": "Urdu",
  "islamiyat": "Islamiyat",
  "pak studies": "Pakistan Studies",
  "statistics": "Statistics",
  "mdcat": "MDCAT",
  "ecat": "ECAT",
  "sat": "SAT",
  "ielts": "IELTS",
  "gmat": "GMAT",
  "gre": "GRE",
};

const LEVEL_ALIASES: Record<string, string> = {
  "o level": "O-Level",
  "olevel": "O-Level",
  "a level": "A-Level",
  "alevel": "A-Level",
  "gcse": "GCSE",
  "matric": "Matric",
  "fsc": "FSc / Inter",
  "intermediate": "FSc / Inter",
  "university": "University",
  "college": "University",
  "primary": "Primary",
  "middle": "Middle (6-8)",
  "grade": "Primary",
};

const MODE_ALIASES: Record<string, string> = {
  "online": "online",
  "home": "home",
  "in-person": "home",
  "in person": "home",
  "face to face": "home",
  "physical": "home",
  "both": "both",
  "hybrid": "both",
};

const CURRENCY_MAP: Record<string, string> = {
  "pkr": "PKR",
  "rs": "PKR",
  "rupees": "PKR",
  "aed": "AED",
  "dirham": "AED",
  "usd": "USD",
  "$": "USD",
  "gbp": "GBP",
  "£": "GBP",
  "eur": "EUR",
  "€": "EUR",
  "sar": "SAR",
  "riyal": "SAR",
  "inr": "INR",
  " rupees": "INR",
};

const CITY_ALIASES: Record<string, string> = {
  "lahore": "Lahore",
  "karachi": "Karachi",
  "islamabad": "Islamabad",
  "rawalpindi": "Rawalpindi",
  "faisalabad": "Faisalabad",
  "multan": "Multan",
  "peshawar": "Peshawar",
  "quetta": "Quetta",
  "dubai": "Dubai",
  "abu dhabi": "Abu Dhabi",
  "sharjah": "Sharjah",
  "london": "London",
  "manchester": "Manchester",
  "riyadh": "Riyadh",
  "jeddah": "Jeddah",
};

const CITY_MARKETS: Record<string, { countryCode: string; countryName: string; currency: string; timezone: string }> = {
  Lahore: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Karachi: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Islamabad: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Rawalpindi: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Faisalabad: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Multan: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Peshawar: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Quetta: { countryCode: "PK", countryName: "Pakistan", currency: "PKR", timezone: "Asia/Karachi" },
  Dubai: { countryCode: "AE", countryName: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  "Abu Dhabi": { countryCode: "AE", countryName: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  Sharjah: { countryCode: "AE", countryName: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  London: { countryCode: "GB", countryName: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
  Manchester: { countryCode: "GB", countryName: "United Kingdom", currency: "GBP", timezone: "Europe/London" },
};

function parseNaturalLanguage(input: string): ParsedRequest {
  const result: ParsedRequest = {};
  const lower = input.toLowerCase();

  const budgetMatch = lower.match(/(?:under|around|approximately|approx|roughly)?\s*(?:pkr|rs|usd|gbp|eur|aed|sar|inr)?\s*([\d,]+)\s*(?:per\s*(?:hour|month|session|krachi))?/i);
  if (budgetMatch) {
    result.budget = budgetMatch[1].replace(/,/g, "");
    const currencyMatch = lower.match(/(pkr|rs|usd|gbp|eur|aed|sar|inr|dirham|rupees|riyal)/i);
    if (currencyMatch) {
      result.currency = CURRENCY_MAP[currencyMatch[1].toLowerCase()] || currencyMatch[1].toUpperCase();
    } else {
      result.currency = "PKR";
    }
  }

  for (const [alias, subject] of Object.entries(SUBJECT_ALIASES)) {
    if (lower.includes(alias)) {
      result.subject = subject;
      break;
    }
  }

  for (const [alias, level] of Object.entries(LEVEL_ALIASES)) {
    if (lower.includes(alias)) {
      result.level = level;
      break;
    }
  }

  if (lower.includes("cambridge") || lower.includes("edexcel")) {
    result.curriculum = "Cambridge";
  } else if (lower.includes("board")) {
    result.curriculum = "National Curriculum";
  }

  for (const [alias, mode] of Object.entries(MODE_ALIASES)) {
    if (lower.includes(alias)) {
      result.mode = mode as "online" | "home" | "both";
      break;
    }
  }

  if (!result.mode) {
    if (lower.includes("online")) {
      result.mode = "online";
    } else if (lower.includes("home") || lower.includes("in-person") || lower.includes("in person")) {
      result.mode = "home";
    }
  }

  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) {
      result.city = city;
      break;
    }
  }

  const dhaMatch = lower.match(/(?:in|area| DHA| gulberg| bahria| model town| johar)/i);
  if (dhaMatch) {
    result.area = dhaMatch[0].replace(/^(?:in|area)\s+/i, "").trim();
  }

  if (lower.includes("female")) {
    result.genderPreference = "female";
  } else if (lower.includes("male")) {
    result.genderPreference = "male";
  }

  if (lower.includes("morning") || lower.includes("evening") || lower.includes("afternoon") || lower.includes("weekend")) {
    const scheduleParts: string[] = [];
    if (lower.includes("morning")) scheduleParts.push("Morning");
    if (lower.includes("evening")) scheduleParts.push("Evening");
    if (lower.includes("afternoon")) scheduleParts.push("Afternoon");
    if (lower.includes("weekend")) scheduleParts.push("Weekends");
    if (lower.includes("daily")) scheduleParts.push("Daily");
    if (lower.includes("weekly")) scheduleParts.push("Weekly");
    if (scheduleParts.length > 0) {
      result.schedule = scheduleParts.join(", ");
    }
  }

  return result;
}

interface AskTutoreraInputProps {
  className?: string;
}

export default function AskTutoreraInput({ className }: AskTutoreraInputProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [showParsed, setShowParsed] = useState(false);
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsParsing(true);

    setTimeout(() => {
      const result = parseNaturalLanguage(input);
      setParsed(result);
      setShowParsed(true);
      setIsParsing(false);
    }, 600);
  };

  const handleConfirm = () => {
    if (!parsed) return;

    const market = parsed.city ? CITY_MARKETS[parsed.city] : undefined;

    const quickPayload = {
      subject: parsed.subject || "General Studies",
      level: parsed.level || "O-Level",
      curriculum: parsed.curriculum || "",
      teachingMode: parsed.mode || "online",
      countryCode: market?.countryCode || "",
      countryName: market?.countryName || "",
      currency: parsed.currency || market?.currency || "",
      timezone: market?.timezone || "",
      isWorldwideEligible: parsed.mode === "online" || parsed.mode === "both",
      city: parsed.city || "",
      area: parsed.area || "",
      schedule: parsed.schedule || "",
      budget: parsed.budget || "",
      pricingUnit: "hour",
      genderPreference: parsed.genderPreference || "",
    };

    try {
      sessionStorage.setItem("tutorera_quick_request", JSON.stringify(quickPayload));
      sessionStorage.setItem("tutorera_nl_input", input);
    } catch {}

    if (parsed.mode === "home") {
      router.push("/post-home-tuition-request");
    } else {
      router.push("/post-tuition-request");
    }
  };

  const handleEdit = () => {
    setShowParsed(false);
    setParsed(null);
  };

  return (
    <div className={className} style={{ width: "100%", maxWidth: 720, margin: "0 auto" }}>
      {!showParsed ? (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "0.75rem",
              boxShadow: "0 8px 32px rgba(2, 21, 80, 0.12)",
              border: "2px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", padding: "0 0.5rem" }}>
              <Sparkles size={20} color="#016ef8" />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#021550" }}>
                Ask Tutorera — Describe your requirement in plain language
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='e.g. "Need an online GCSE Mathematics tutor, evenings, budget GBP 30/hour"'
                style={{
                  width: "100%",
                  padding: "1rem 1rem 1rem 2.75rem",
                  borderRadius: "0.75rem",
                  border: "1.5px solid #e2e8f0",
                  fontSize: "1rem",
                  outline: "none",
                  color: "#021550",
                  minHeight: "56px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#016ef8")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                aria-label="Describe your tutor requirement"
              />
              <Mic
                size={18}
                color="#94a3b8"
                style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }}
                aria-hidden="true"
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem", padding: "0 0.5rem" }}>
              <button
                type="submit"
                disabled={!input.trim() || isParsing}
                style={{
                  background: input.trim() && !isParsing ? "#0329b2" : "#94a3b8",
                  color: "white",
                  border: "none",
                  borderRadius: "0.6rem",
                  padding: "0.65rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: input.trim() && !isParsing ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minHeight: "44px",
                  transition: "background-color 150ms ease, box-shadow 150ms ease",
                }}
              >
                {isParsing ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Parse My Requirement
                  </>
                )}
              </button>
            </div>
          </div>
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </form>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: "1rem",
            padding: "1.25rem",
            boxShadow: "0 8px 32px rgba(2, 21, 80, 0.12)",
            border: "2px solid #10b981",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ background: "#ecfdf5", color: "#059669", padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 800 }}>
              ✓ REQUIREMENT PARSED
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Review and confirm below</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {parsed?.subject && (
              <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Subject</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#021550" }}>{parsed.subject}</span>
              </div>
            )}
            {parsed?.level && (
              <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Level</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#021550" }}>{parsed.level}</span>
              </div>
            )}
            {parsed?.mode && (
              <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Mode</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#021550", textTransform: "capitalize" }}>{parsed.mode === "both" ? "Home + Online" : parsed.mode}</span>
              </div>
            )}
            {parsed?.city && (
              <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>City</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#021550" }}>{parsed.city}</span>
              </div>
            )}
            {parsed?.budget && (
              <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Budget</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#021550" }}>{parsed.currency || (parsed.city ? CITY_MARKETS[parsed.city]?.currency : "") || "Select currency"} {Number(parsed.budget).toLocaleString()}/hr</span>
              </div>
            )}
            {parsed?.schedule && (
              <div style={{ background: "#f8fafc", padding: "0.65rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.2rem" }}>Schedule</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#021550" }}>{parsed.schedule}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleEdit}
              style={{
                background: "white",
                color: "#475569",
                border: "1.5px solid #cbd5e1",
                borderRadius: "0.6rem",
                padding: "0.65rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                minHeight: "44px",
              }}
            >
              Edit Description
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "0.6rem",
                padding: "0.65rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                minHeight: "44px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              Confirm & Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
