import Link from "next/link";
import type { Metadata } from "next";
import HeroMarketplace from "@/components/marketplace/HeroMarketplace";
import HomeOnlineTuitionCards from "@/components/marketplace/HomeOnlineTuitionCards";
import MarketplaceFlow from "@/components/marketplace/MarketplaceFlow";
import TopRequestsSection from "@/components/TopRequestsSection";
import OfferComparisonDemo from "@/components/marketplace/OfferComparisonDemo";
import { ArrowRight, Star, MapPin } from "lucide-react";
import s from "./page.module.css";

export const metadata: Metadata = {
  title: "A Global Student-Led Tutoring Marketplace",
  description:
    "Post your tutoring requirement with your preferred budget and currency. Receive offers from qualified tutors locally or worldwide. Choose online or home tuition, negotiate transparently, and book with verified confidence.",
  alternates: { canonical: "/" },
};

const popularSubjects = [
  { name: "Mathematics", levels: "Primary, GCSE, A-Level, IB, university", href: "/tutors/subject/mathematics" },
  { name: "Sciences", levels: "Biology, chemistry, physics, AP, IB", href: "/tutors/subject/physics" },
  { name: "English & Languages", levels: "Academic English, IELTS, spoken language", href: "/tutors/subject/english" },
  { name: "Computer Science", levels: "Coding, data, web development, school curricula", href: "/tutors/subject/computer-science" },
  { name: "Business & Economics", levels: "IGCSE, A-Level, AP, university", href: "/tutors/subject/economics" },
  { name: "Test Preparation", levels: "SAT, IELTS, admissions and professional exams", href: "/subjects" },
  { name: "Early Learning", levels: "Foundational skills and primary education", href: "/levels" },
  { name: "Local Curricula", levels: "Country-specific boards and learning pathways", href: "/subjects" },
];

const popularCities = [
  { name: "Pakistan", areas: "Online nationwide and local home tuition where available", href: "/pk/home-tutors/lahore" },
  { name: "United Arab Emirates", areas: "Discovery beta for local and online tutor matching", href: "/ae/tutors" },
  { name: "United Kingdom", areas: "Discovery beta for local and online tutor matching", href: "/gb/tutors" },
  { name: "Online Worldwide", areas: "Learn across borders in a timezone and language that work for you", href: "/online-tutors" },
];

const blogPosts = [
  {
    title: "How to Find a Trusted Home Tutor in Pakistan",
    desc: "A practical guide for parents who want verification, safety, and better tutor-fit decisions.",
    slug: "how-to-find-a-trusted-tutor-in-pakistan"
  },
  {
    title: "Online Tutoring vs. Home Tuition in Pakistan",
    desc: "Compare mode, cost, flexibility, and accountability before choosing your learning setup.",
    slug: "online-vs-home-tuition-in-pakistan"
  },
  {
    title: "Understanding Tutor Rates & Negotiation in Pakistan",
    desc: "How student-proposed budgets and transparent counter-offers ensure fair market pricing.",
    slug: "what-to-look-for-before-hiring-a-tutor-pakistan"
  }
];

export default function Home() {
  return (
    <div className={s.page}>
      <HeroMarketplace />
      <HomeOnlineTuitionCards />
      <TopRequestsSection />
      <MarketplaceFlow />
      <OfferComparisonDemo />

      <section style={{ padding: "4rem 1.5rem", background: "#f8faff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", letterSpacing: "0.08em" }}>Browse by Subject</span>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0 0" }}>Subjects for every learning pathway</h2>
            </div>
            <Link href="/subjects" style={{ color: "#0329b2", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>View all subjects →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
            {popularSubjects.map((sub) => (
              <Link key={sub.name} href={sub.href} style={{ background: "white", borderRadius: "0.875rem", padding: "1.25rem", border: "1px solid #e2e8f0", textDecoration: "none", transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease-out", display: "block" }}>
                <strong style={{ display: "block", color: "#021550", fontSize: "1rem", marginBottom: "0.25rem" }}>{sub.name}</strong>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{sub.levels}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 1.5rem", background: "white", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#016ef8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cities & Localities</span>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0 0" }}>Global learning, local choice</h2>
            </div>
            <Link href="/locations" style={{ color: "#0329b2", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>All locations →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {popularCities.map((city) => (
              <div key={city.name} style={{ background: "#f8faff", borderRadius: "1rem", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#0329b2", marginBottom: "0.5rem" }}><MapPin size={18} /><h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>{city.name}</h3></div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5, marginBottom: "1rem" }}>{city.areas}</p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <Link href={`/post-home-tuition-request?city=${city.name}`} style={{ background: "#0329b2", color: "white", padding: "0.45rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none" }}>Post a requirement</Link>
                  <Link href={city.href} style={{ color: "#475569", padding: "0.45rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>Browse tutors</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 1.5rem", background: "white" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 3rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0329b2", textTransform: "uppercase", letterSpacing: "0.08em" }}>Expert Guides</span>
            <h2 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#021550", margin: "0.35rem 0 0.5rem" }}>Helpful Advice for Parents & Students</h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Clear, transparent insights on choosing a tutor, comparing offers, and learning safely across markets.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {blogPosts.map((post) => (
              <article key={post.slug} style={{ background: "#f8faff", borderRadius: "1rem", padding: "1.75rem", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
                <div style={{ width: 36, height: 36, borderRadius: "0.5rem", background: "#eef5ff", color: "#0329b2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}><Star size={18} /></div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#021550", marginBottom: "0.5rem" }}>{post.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5, marginBottom: "1.25rem" }}>{post.desc}</p>
                <div style={{ marginTop: "auto" }}>
                  <Link href={`/blog/${post.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.825rem", fontWeight: 700, color: "#0329b2", textDecoration: "none" }}>Read Pakistan guide <ArrowRight size={14} /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 1.5rem 5rem", background: "#021550", color: "white" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#08bffc", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ready to Start?</span>
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 900, margin: "0.5rem 0 1rem" }}>Stop Searching. Let Tutors Come to You.</h2>
          <p style={{ color: "#94a3b8", fontSize: "1rem", maxWidth: 540, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>Post your tuition requirement with your target budget in 2 minutes. Receive competitive offers from verified tutors and start learning.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/post-tuition-request" style={{ background: "#016ef8", color: "white", padding: "0.95rem 2rem", borderRadius: "0.75rem", fontWeight: 800, fontSize: "1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 8px 24px rgba(1, 110, 248, 0.4)" }}>Post Tuition Request <ArrowRight size={18} /></Link>
            <Link href="/become-a-tutor" style={{ background: "rgba(255,255,255,0.1)", color: "white", padding: "0.95rem 1.75rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.95rem", border: "1px solid rgba(255,255,255,0.2)", textDecoration: "none" }}>Become a Verified Tutor</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
