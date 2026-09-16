import Link from "next/link";
import { ArrowRight, Home, Laptop, ShieldCheck, MapPin, CheckCircle2 } from "lucide-react";

export default function HomeOnlineTuitionCards() {
  return (
    <section style={{ maxWidth: 1120, margin: "2.5rem auto 0", padding: "0 1.5rem" }} aria-label="Tutoring learning modes">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <div style={{ background: "linear-gradient(145deg, #ffffff 0%, #f8faff 100%)", borderRadius: "1.25rem", padding: "2rem", border: "1.5px solid #bfdbfe", boxShadow: "0 10px 30px rgba(3, 41, 178, 0.06)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, background: "#0329b2", color: "white", fontSize: "0.7rem", fontWeight: 800, padding: "0.35rem 1rem", borderBottomLeftRadius: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            In-Person Learning
          </div>

          <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#eef5ff", color: "#0329b2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
            <Home size={24} />
          </div>

          <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>Need a Home Tutor?</h3>
          <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Post your subject, level, city or locality, and proposed budget. Eligible local tutors can accept your rate or send a tailored offer where home tuition is enabled.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "grid", gap: "0.5rem", fontSize: "0.825rem", color: "#334155" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><CheckCircle2 size={16} color="#10b981" /> Physical 1-on-1 tutoring at your home</li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><ShieldCheck size={16} color="#0329b2" /> Exact address kept private until the appropriate booking stage</li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><MapPin size={16} color="#0329b2" /> Available only in markets where home tuition is enabled</li>
          </ul>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/post-home-tuition-request" style={{ background: "#0329b2", color: "white", padding: "0.75rem 1.25rem", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 12px rgba(3, 41, 178, 0.25)" }}>
              Post a local request <ArrowRight size={15} />
            </Link>
            <Link href="/tutors?teachingMode=in-person" style={{ color: "#0329b2", fontSize: "0.825rem", fontWeight: 600, textDecoration: "none" }}>Browse Home Tutors →</Link>
          </div>
        </div>

        <div style={{ background: "linear-gradient(145deg, #ffffff 0%, #faf8ff 100%)", borderRadius: "1.25rem", padding: "2rem", border: "1.5px solid #e2e8f0", boxShadow: "0 10px 30px rgba(2, 21, 80, 0.04)", display: "flex", flexDirection: "column" }}>
          <div style={{ width: 48, height: 48, borderRadius: "0.75rem", background: "#f3e8ff", color: "#7c1bea", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
            <Laptop size={24} />
          </div>

          <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>Need an Online Tutor?</h3>
          <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
            Post your requirement and receive offers from eligible online tutors serving your subject, level, language, and schedule.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "grid", gap: "0.5rem", fontSize: "0.825rem", color: "#334155" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><CheckCircle2 size={16} color="#10b981" /> 1-on-1 live sessions using supported online tools</li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><ShieldCheck size={16} color="#7c1bea" /> First-session protection where the booking is eligible</li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><CheckCircle2 size={16} color="#10b981" /> Flexible scheduling without local travel</li>
          </ul>

          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/post-online-tuition-request" style={{ background: "#021550", color: "white", padding: "0.75rem 1.25rem", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              Post Online Tuition Request <ArrowRight size={15} />
            </Link>
            <Link href="/online-tutors" style={{ color: "#475569", fontSize: "0.825rem", fontWeight: 600, textDecoration: "none" }}>Browse Online Tutors →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
