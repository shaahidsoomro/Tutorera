import { SITE_URL,SUPPORT_EMAIL } from "@/lib/site";
import Link from "next/link";

export interface TrustSection { heading: string; body: string; items?: string[]; }
interface Props { title: string; intro: string; path: string; sections: TrustSection[]; updated?: string; }

export default function TrustArticle({ title, intro, path, sections, updated = "30 August 2026" }: Props) {
  const schema = {
    "@context": "https://schema.org", "@type": "WebPage", name: title, description: intro,
    url: `${SITE_URL}${path}`, dateModified: "2026-08-30",
    publisher: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}${path}` },
    ] },
  };
  return (
    <main style={{ background: "#fff", color: "#021550" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header style={{ background: "#021550", padding: "4.5rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ color: "#fff", fontSize: "clamp(2rem,4vw,3rem)", marginBottom: "1rem" }}>{title}</h1>
        <p style={{ color: "#cbd5e1", maxWidth: 760, margin: "0 auto", lineHeight: 1.75 }}>{intro}</p>
      </header>
      <article style={{ maxWidth: 820, margin: "0 auto", padding: "3.5rem 1.5rem 5rem" }}>
        <p style={{ color: "#6b7280", fontSize: ".875rem", marginBottom: "2rem" }}>Last reviewed: {updated}</p>
        {sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: "2.25rem" }}>
            <h2 style={{ fontSize: "1.35rem", marginBottom: ".75rem" }}>{section.heading}</h2>
            <p style={{ color: "#4b5563", lineHeight: 1.8 }}>{section.body}</p>
            {section.items && <ul style={{ color: "#4b5563", lineHeight: 1.8, paddingLeft: "1.25rem", marginTop: ".75rem" }}>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
        <aside style={{ background: "#EEF5FF", border: "1px solid #bfdbfe", borderRadius: 12, padding: "1.25rem" }}>
          <strong>Questions or concerns?</strong>{" "}<Link href="/contact" style={{ color: "#0329B2" }}>Contact TUTORERA support</Link> at {SUPPORT_EMAIL}.
        </aside>
      </article>
    </main>
  );
}
