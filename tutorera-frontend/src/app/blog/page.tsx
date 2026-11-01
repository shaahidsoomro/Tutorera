import { getEditorialArticles } from "@/lib/editorial-content";
import { ArrowRight,Calendar,User } from "lucide-react";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tutoring Guides, Curriculum Advice & Tutor Selection", description: "Explore practical guides to tutoring, curriculum choices, exam preparation and selecting tutors. Compare relevant tutor profiles and booking options on TUTORERA.", alternates: { canonical: "/blog" } };

export default async function BlogPage() {
  const { articles: blogs } = await getEditorialArticles();
  const listingSchema = { "@context": "https://schema.org", "@type": "CollectionPage", name: "TUTORERA Tutoring Guides", url: `${SITE_URL}/blog`, mainEntity: { "@type": "ItemList", itemListElement: blogs.map((blog, index) => ({ "@type": "ListItem", position: index + 1, name: blog.title, url: `${SITE_URL}/blog/${blog.slug}` })) } };
  return <main style={{ background: "#F5F7FF", minHeight: "100vh" }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listingSchema).replace(/</g, "\\u003c") }} />
    <header style={{ background: "#021550", padding: "4rem 1.5rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "white", marginBottom: ".75rem" }}>Tutoring Insights & Guides</h1>
      <p style={{ color: "#cbd5e1", maxWidth: 650, margin: "auto" }}>Practical tutoring, curriculum and exam-preparation guides for students, parents and tutors across our supported markets.</p>
    </header>
    <div style={{ maxWidth: 1100, margin: "1.5rem auto 0", padding: "0 1.5rem" }}><Link href="/blog/topics" style={{ color: "#0329B2", fontWeight: 700 }}>Explore guides by subject, curriculum and country</Link></div>
    <section style={{ maxWidth: 1100, margin: "auto", padding: "3rem 1.5rem" }} aria-label="Published guides">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1.75rem" }}>
        {blogs.map(blog => <article key={blog._id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{blog.tags.slice(0, 3).map(tag => <span key={tag} style={{ background: "#EEF5FF", color: "#0329B2", padding: "3px 8px", borderRadius: 20, fontSize: 12 }}>{tag}</span>)}</div>
          <h2 style={{ color: "#021550", fontSize: "1.15rem", lineHeight: 1.4, marginBottom: 10 }}><Link href={`/blog/${blog.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{blog.title}</Link></h2>
          <p style={{ color: "#64748b", lineHeight: 1.65, flex: 1 }}>{blog.excerpt}</p>
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 18, paddingTop: 14, color: "#64748b", fontSize: 12 }}>
            <p style={{ display: "flex", gap: 6, alignItems: "center" }}><User size={13}/>{blog.author.name}</p>
            <p style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}><Calendar size={13}/>Updated {new Date(blog.updatedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
          </div>
          <Link href={`/blog/${blog.slug}`} style={{ color: "#0329B2", fontWeight: 700, textDecoration: "none", display: "flex", gap: 5, alignItems: "center", marginTop: 15 }}>Read guide <ArrowRight size={15}/></Link>
        </article>)}
      </div>
    </section>
  </main>;
}
