import { UI_COLORS } from "@/lib/brand";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tutors by Academic Level", description: "Find verified tutors for primary, secondary, GCSE, IB, Cambridge, national curricula, university, and test preparation worldwide.", alternates: { canonical: "/levels" } };

const C = UI_COLORS;

const levels = [
  { name: "Primary School", grades: "Years / Grades 1–5", age: "Ages 5–10", desc: "Foundation tutoring in mathematics, science, literacy, languages, and local curricula.", color: "#EEF5FF", textColor: "#0329B2" },
  { name: "Middle School", grades: "Grade 6–8", age: "Ages 11–13", desc: "Core subjects with increasing complexity. Science, Math, Languages, and Social Studies.", color: "#f0fdf4", textColor: "#16a34a" },
  { name: "Secondary School", grades: "Grades 9–10", age: "Ages 14–16", desc: "Exam preparation and subject support for national, international, and board curricula.", color: "#fffbeb", textColor: "#d97706" },
  { name: "O-Levels", grades: "Cambridge IGCSE", age: "Ages 14–16", desc: "Cambridge O-Level preparation across all subjects including Pure Math, Sciences, and Languages.", color: "#fdf4ff", textColor: "#7c3aed" },
  { name: "Senior Secondary", grades: "Grades 11–12", age: "Ages 16–18", desc: "Advanced subject support for science, humanities, business, and university preparation.", color: "#fff1f2", textColor: "#C81B7F" },
  { name: "A-Levels", grades: "Cambridge AS & A2", age: "Ages 16–18", desc: "Advanced Cambridge A-Level preparation for university entrance.", color: "#EEF5FF", textColor: "#0329B2" },
  { name: "University Level", grades: "Bachelor's / Master's", age: "Ages 18+", desc: "University-level tutoring for engineering, medicine, business, CS, and more.", color: "#f0fdf4", textColor: "#16a34a" },
  { name: "Test Preparation", grades: "Admissions & Language Tests", age: "All Ages", desc: "IELTS, SAT, ACT, GRE, GMAT and market-specific entrance examinations.", color: "#fffbeb", textColor: "#d97706" },
  { name: "Other", grades: "All Levels", age: "All Ages", desc: "Tutoring for any other subjects or levels not listed above.", color: "#fdf4ff", textColor: "#7c3aed" },
];

function tutorHref(levelName: string) {
  const slugs: Record<string, string> = {
    "Primary School": "primary", "Middle School": "middle", "Secondary School": "secondary",
    "O-Levels": "o-level", "Senior Secondary": "senior-secondary", "A-Levels": "a-level",
    "University Level": "university",
  };
  if (levelName === "Test Preparation") return "/tutors?search=test%20preparation";
  if (levelName === "Secondary School") return "/tutors?search=secondary";
  if (levelName === "Senior Secondary") return "/tutors?search=senior%20secondary";
  return `/tutors/level/${slugs[levelName] || ""}`;
}

export default function LevelsPage() {
  return (
    <div style={{ backgroundColor: 'white' }}>
      <section style={{ backgroundColor: C.primary, padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>
          Levels We Cover
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
          From primary school to university — find the right tutor for every stage of learning.
        </p>
      </section>

      <section style={{ padding: '5rem 1.5rem', backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {levels.map(level => (
              <div key={level.name} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.75rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: level.color, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={20} color={level.textColor} />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '1rem' }}>{level.name}</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{level.grades} · {level.age}</p>
                  </div>
                </div>
                <p style={{ color: C.gray500, fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>{level.desc}</p>
                <Link href={tutorHref(level.name)}
                  style={{ display: 'inline-block', backgroundColor: level.color, color: level.textColor, fontSize: '0.8rem', fontWeight: '700', padding: '0.4rem 1rem', borderRadius: '999px', textDecoration: 'none' }}>
                  Find Tutors →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
