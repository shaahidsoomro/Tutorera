import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Home, Laptop, MapPin, ShieldCheck } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { getMarketByRoute } from "@/lib/markets";

const US_URL = `${SITE_URL}/us`;

const learningModes = [
  { href: "/us/new-york/home-tuition",   label: "Home Tuition",   desc: "Verified tutors teaching at your home in New York, Los Angeles, Chicago, Houston or Miami.", icon: Home,   post: "/post-home-tuition-request?country=US" },
  { href: "/us/new-york/online-tuition", label: "Online Tuition", desc: "One-to-one live online tuition across US time zones, SAT/ACT prep, AP, IB and Common Core.", icon: Laptop, post: "/post-online-tuition-request?country=US" },
];

const cityIntents = [
  { slug: "new-york",     label: "New York" },
  { slug: "los-angeles",  label: "Los Angeles" },
  { slug: "chicago",      label: "Chicago" },
  { slug: "houston",      label: "Houston" },
  { slug: "miami",        label: "Miami" },
];

const faq = [
  {
    q: "How does TUTORERA work in the United States?",
    a: "Students or parents post a tuition requirement — subject, curriculum (AP, IB, SAT/ACT prep, Common Core), teaching mode, city, schedule and preferred budget in USD. Eligible tutors can submit offers, so the student or parent can compare options before choosing a tutor. Exact addresses and private contact details are not shown before a confirmed booking.",
  },
  {
    q: "Which tuition modes are currently available in the United States?",
    a: "Online tuition matching is currently available for US learners. Home tuition will be shown only when the US market enables local delivery and safety requirements.",
  },
  {
    q: "Does TUTORERA support SAT, ACT and AP prep?",
    a: "Yes. Online tuition matching considers subject, exam type (SAT, ACT, AP), language and budget compatibility. Select your prep requirement when posting.",
  },
  {
    q: "Who sets the tuition budget?",
    a: "The student or parent sets the initial preferred budget in USD when posting the requirement. Tutors can accept the budget or, where the request permits it, submit a counter-offer.",
  },
  {
    q: "Who chooses the tutor?",
    a: "The student or parent chooses. TUTORERA surfaces eligible tutors and their offers; the final selection is always the student or parent's decision.",
  },
  {
    q: "Are tutors on TUTORERA verified?",
    a: "Approved tutors complete identity and credential review before receiving tuition opportunities. Verification confirms the documents reviewed — it does not guarantee outcomes or teaching quality on its own. See the Trust & Safety Center for details.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "Online Tuition in the US | TUTORERA" },
  description:
    "Post an online tuition requirement in the United States, set your preferred budget in USD, and compare offers from eligible tutors. New York, Los Angeles, Chicago and nationwide.",
  alternates: { canonical: "/us" },
  openGraph: {
    title: "Online Tuition in the US | TUTORERA",
    description: "Student-first online tuition matching for the US. Post a requirement, receive tutor offers, compare, and choose.",
    url: US_URL,
  },
};

export default function USLandingPage() {
  const homeTuitionEnabled = getMarketByRoute("us")?.homeTuitionEnabled ?? false;
  const availableLearningModes = learningModes.filter((mode) => homeTuitionEnabled || mode.label !== "Home Tuition");
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${US_URL}#webpage`,
        name: "Tuition in United States",
        description: "Post an online tuition requirement in the US and compare eligible tutor offers.",
        url: US_URL,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${US_URL}#breadcrumb` },
        about: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${US_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "United States", item: US_URL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(2rem,4vw,3.5rem) 1.25rem 5rem", color: "#0f172a" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <nav aria-label="Breadcrumb" style={{ fontSize: "0.9rem", marginBottom: "1.5rem", color: "#475569" }}>
        <Link href="/" style={{ color: "#0329b2" }}>Home</Link>{" / "}<span>United States</span>
      </nav>

      <header style={{ maxWidth: 780 }}>
        <p style={{ color: "#016EF8", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
          Student-First Tutoring Marketplace · United States
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.1, color: "#021550", margin: "0 0 1rem" }}>
          Tuition in US — Home &amp; Online Tutors
        </h1>
        <p style={{ fontSize: "1.1rem", lineHeight: 1.7, color: "#475569", marginBottom: "1.5rem" }}>
          Post your online tuition requirement with a preferred budget in USD. Eligible tutors can submit offers. Compare options and choose the tutor that fits your learning needs.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/post-tuition-request?country=US" style={ctaPrimary}>Post Tuition Requirement <ArrowRight size={18} /></Link>
          <Link href="/tutors?countryCode=US" style={ctaSecondary}>Find Tutors</Link>
        </div>
      </header>

      <section style={{ marginTop: "3rem", padding: "1.5rem 1.75rem", background: "#F5F7FF", borderRadius: "0.875rem" }}>
        <h2 style={{ color: "#021550", marginTop: 0 }}>How does TUTORERA work in the United States?</h2>
        <p style={{ color: "#374151", lineHeight: 1.7, margin: 0 }}>{faq[0].a}</p>
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ color: "#021550" }}>Choose how you want to learn</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
          {availableLearningModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <div key={mode.href} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0329B2", marginBottom: "0.5rem" }}>
                  <Icon size={20} /><strong style={{ fontSize: "1.05rem" }}>{mode.label}</strong>
                </div>
                <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 1rem" }}>{mode.desc}</p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href={mode.post} style={inlinePrimary}>Post {mode.label} requirement</Link>
                  <Link href={mode.href} style={inlineSecondary}>Read guide</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ color: "#021550" }}>Popular cities</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
          {cityIntents.map((c) => (
            <div key={c.slug} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#0329B2", marginBottom: "0.5rem" }}>
                <MapPin size={16} /><strong>{c.label}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
                <Link href={`/us/${c.slug}/tuition`} style={linkStyle}>{c.label} tuition</Link>
                {homeTuitionEnabled && <Link href={`/us/${c.slug}/home-tuition`} style={linkStyle}>{c.label} home tuition</Link>}
                <Link href={`/us/${c.slug}/online-tuition`} style={linkStyle}>{c.label} online tuition</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "3rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0329B2", marginBottom: "0.5rem" }}>
            <ShieldCheck size={18} /><strong>Trust &amp; Safety</strong>
          </div>
          <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 0.5rem" }}>Verification confirms documents reviewed under the applicable market and teaching-mode policy — it does not guarantee outcomes.</p>
          <Link href="/safety" style={linkStyle}>Trust &amp; Safety Center →</Link>
        </div>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0329B2", marginBottom: "0.5rem" }}>
            <GraduationCap size={18} /><strong>How TUTORERA works</strong>
          </div>
          <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 0.5rem" }}>Post a requirement, receive offers from eligible tutors, compare, and choose. Your budget. Your schedule. Your choice of tutor.</p>
          <Link href="/how-it-works" style={linkStyle}>Read how it works →</Link>
        </div>
      </section>

      <section style={{ marginTop: "3rem" }}>
        <h2 style={{ color: "#021550" }}>Frequently asked questions</h2>
        {faq.slice(1).map((item) => (
          <div key={item.q} style={{ marginTop: "1.25rem" }}>
            <h3 style={{ color: "#021550", fontSize: "1.05rem", margin: "0 0 0.35rem" }}>{item.q}</h3>
            <p style={{ color: "#374151", lineHeight: 1.7, margin: 0 }}>{item.a}</p>
          </div>
        ))}
      </section>

      <section style={{ marginTop: "3rem", padding: "2rem", background: "#021550", color: "white", borderRadius: "0.875rem", textAlign: "center" }}>
        <h2 style={{ color: "white", margin: "0 0 0.5rem" }}>Ready to find your tutor?</h2>
        <p style={{ color: "#94a3b8", margin: "0 0 1.25rem" }}>Post your tuition requirement in a few minutes and receive offers from eligible tutors.</p>
        <Link href="/post-tuition-request?country=US" style={{ ...ctaPrimary, background: "#016ef8" }}>Post Tuition Requirement <ArrowRight size={18} /></Link>
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = { background: "white", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "1.25rem" };
const linkStyle: React.CSSProperties = { color: "#0329b2", textDecoration: "none", fontWeight: 600 };
const ctaPrimary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#0329b2", color: "white", padding: "0.85rem 1.5rem", borderRadius: "0.6rem", fontWeight: 800, textDecoration: "none" };
const ctaSecondary: React.CSSProperties = { display: "inline-flex", alignItems: "center", background: "white", color: "#021550", padding: "0.85rem 1.25rem", borderRadius: "0.6rem", fontWeight: 700, textDecoration: "none", border: "1.5px solid #cbd5e1" };
const inlinePrimary: React.CSSProperties = { background: "#0329b2", color: "white", padding: "0.55rem 0.95rem", borderRadius: "0.45rem", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" };
const inlineSecondary: React.CSSProperties = { color: "#0329b2", padding: "0.55rem 0.55rem", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" };
