import Link from "next/link";
import { getEditorialArticles } from "@/lib/editorial-content";

const STOP = new Set(["tutor","tutors","online","guide","guides","how","the","and","for","with","in","to","a","vs"]);
const terms = (text: string) => new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w)));
export default async function BlogRelatedGuides({ slug, title, tags }: { slug: string; title: string; tags: string[] }) {
  const current = terms([slug, title, ...tags].join(" "));
  const { articles } = await getEditorialArticles();
  const related = articles.filter(a => a.slug !== slug).map(a => {
    const words = terms([a.slug, a.title, ...a.tags].join(" "));
    const overlap = [...words].filter(w => current.has(w)).length;
    return { article: a, overlap };
  }).filter(a => a.overlap > 0).sort((a,b) => b.overlap - a.overlap).slice(0, 3);
  if (!related.length) return null;
  return <nav aria-labelledby="related-guides" style={{ marginTop: 28 }}>
    <h2 id="related-guides" style={{ color: "#021550", fontSize: "1.4rem", marginBottom: 14 }}>Related tutoring guides</h2>
    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
      {related.map(({ article }) => <li key={article.slug} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
        <Link href={`/blog/${article.slug}`} style={{ color: "#0329B2", fontWeight: 700 }}>{article.title}</Link>
        <p style={{ color: "#64748b", marginTop: 6 }}>{article.excerpt}</p>
      </li>)}
    </ul>
  </nav>;
}
