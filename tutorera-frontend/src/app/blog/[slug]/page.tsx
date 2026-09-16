import { getEditorialArticle,STATIC_ARTICLES } from "@/lib/editorial-content";
import { ArrowLeft,Calendar,ShieldCheck,User } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() { return STATIC_ARTICLES.map(({ slug }) => ({ slug })); }

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const blog = await getEditorialArticle(slug); if (!blog) notFound();
  return <main style={{ background: "#F5F7FF", minHeight: "100vh" }}>
    <header style={{ background: "#021550", padding: "4rem 1.5rem" }}><div style={{ maxWidth: 800, margin: "auto" }}>
      <Link href="/blog" style={{ color: "#cbd5e1", textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center" }}><ArrowLeft size={16}/>All guides</Link>
      <h1 style={{ color: "white", fontSize: "clamp(1.8rem,4vw,2.7rem)", lineHeight: 1.25, margin: "1.25rem 0" }}>{blog.title}</h1>
      <div style={{ color: "#cbd5e1", display: "flex", gap: 20, flexWrap: "wrap", fontSize: 14 }}><span style={{ display: "flex", gap: 6, alignItems: "center" }}><User size={14}/>{blog.author.name}</span><span style={{ display: "flex", gap: 6, alignItems: "center" }}><Calendar size={14}/>Updated {new Date(blog.updatedAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</span></div>
    </div></header>
    <article style={{ maxWidth: 800, margin: "auto", padding: "3rem 1.5rem" }}>
      <aside style={{ background: "#EEF5FF", border: "1px solid #bfdbfe", padding: "1rem", borderRadius: 10, color: "#1e3a8a", marginBottom: 24 }}><p style={{ display: "flex", gap: 7, alignItems: "center", fontWeight: 700 }}><ShieldCheck size={17}/>Editorial accountability</p><p style={{ marginTop: 5, lineHeight: 1.6 }}>Written by <Link href={blog.author.url}>{blog.author.name}</Link>. Reviewed for platform-process accuracy by <Link href={blog.reviewer.url}>{blog.reviewer.name}</Link>. General educational guidance; academic outcomes are not guaranteed.</p></aside>
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "clamp(1.25rem,4vw,2.5rem)" }}>{blog.content.split("\n\n").map((p, i) => p.startsWith("**") && p.endsWith("**") ? <h2 key={i} style={{ color: "#021550", fontSize: "1.25rem", margin: "2rem 0 .7rem" }}>{p.replaceAll("**", "")}</h2> : <p key={i} style={{ color: "#475569", fontSize: "1.02rem", lineHeight: 1.85, marginBottom: "1rem" }}>{p}</p>)}</div>
    </article>
  </main>;
}
