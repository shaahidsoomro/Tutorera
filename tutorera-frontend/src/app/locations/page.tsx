import { CITIES } from "@/lib/tutor-directory";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tutors by Market and Location",
  description: "Find tutors online worldwide or explore locally enabled tutoring markets in Pakistan, the UAE, and the UK.",
  alternates: { canonical: "/locations" },
};

export default function LocationsPage() {
  return (
    <main style={{ background: "#F5F7FF", minHeight: "70vh" }}>
      <header style={{ background: "#021550", padding: "4.5rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ color: "white", fontSize: "clamp(2rem,4vw,3rem)", marginBottom: "1rem" }}>Find tutors by market</h1>
        <p style={{ color: "#cbd5e1", maxWidth: 680, margin: "0 auto", lineHeight: 1.7 }}>Learn online across borders, or explore local tutor availability where home tuition is enabled.</p>
      </header>
      <section style={{ maxWidth: 1050, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { name: "Online worldwide", description: "Find tutors across timezones and curricula.", href: "/online-tutors" },
            { name: "Pakistan", description: "Live marketplace with online and locally enabled home tuition.", href: "/pk/home-tutors/lahore" },
            { name: "United Arab Emirates", description: "Discovery beta for profiles, requests, offers, and negotiation.", href: "/ae/tutors" },
            { name: "United Kingdom", description: "Discovery beta for profiles, requests, offers, and negotiation.", href: "/gb/tutors" },
          ].map((market) => (
            <Link key={market.name} href={market.href} style={{ background: "#021550", border: "1px solid #18306f", borderRadius: 12, padding: "1.4rem", color: "white", textDecoration: "none" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: ".4rem" }}>{market.name}</h2>
              <span style={{ color: "#cbd5e1", fontSize: ".825rem", lineHeight: 1.45 }}>{market.description}</span>
            </Link>
          ))}
        </div>
        <h2 style={{ fontSize: "1.25rem", color: "#021550", marginBottom: "1rem" }}>Pakistan local home-tuition locations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem" }}>
          {Object.entries(CITIES).map(([slug, city]) => (
            <Link key={slug} href={`/tutors/city/${slug}`} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.4rem", color: "#021550", textDecoration: "none" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: ".4rem" }}>Tutors in {city}</h2>
              <span style={{ color: "#0329B2", fontSize: ".875rem", fontWeight: 700 }}>Browse tutors →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
