import Link from "next/link";
import type { Metadata } from "next";
import { getEditorialArticles } from "@/lib/editorial-content";

export const metadata: Metadata = {
  title: "Tutoring Topics: Subjects, Curricula & Countries",
  description: "Explore published TUTORERA guides by subject, curriculum and country, then compare relevant tutors and booking options.",
  alternates: { canonical: "/blog/topics" },
};
const groups = [
  { name: "Subjects", topics: ["Mathematics", "Physics", "Chemistry", "Biology", "English"] },
  { name: "Curricula & exams", topics: ["IGCSE", "O Level", "A Level", "GCSE", "AP Calculus"] },
  { name: "Countries", topics: ["Pakistan", "UAE", "Saudi Arabia", "UK", "USA"] },
  { name: "Planning your tuition", topics: ["Tutor selection", "Online tutoring", "Tutoring costs"] },
];
const aliases: Record<string, string[]> = {
  Mathematics: ["math", "algebra", "calculus"], "O Level": ["o level", "o-level"], "A Level": ["a level", "a-level"],
  UAE: ["uae", "dubai", "abu dhabi"], "Saudi Arabia": ["saudi", "riyadh", "jeddah"],
  UK: ["uk", "united kingdom", "london", "manchester"], USA: ["usa", "united states", "american", "ap calculus"],
  "Tutor selection": ["choose", "hiring", "trusted", "find a tutor"],
  "Online tutoring": ["online", "remote"], "Tutoring costs": ["cost", "price", "pricing", "rate"],
};
export default async function BlogTopicsPage() {
  const { articles } = await getEditorialArticles();
  return <main style={{ background: "#F5F7FF", minHeight: "100vh", padding: "3rem 1.5rem" }}>
    <div style={{ maxWidth: 1100, margin: "auto" }}>
      <nav><Link href="/blog">All tutoring guides</Link></nav>
      <h1 style={{ color: "#021550", margin: "1.5rem 0 .5rem" }}>Explore tutoring topics</h1>
      <p style={{ color: "#475569", marginBottom: 28 }}>Browse published guides by learning need. Topics without published guides are omitted.</p>
      {groups.map(group => {
        const topics = group.topics.map(topic => {
          const needles = aliases[topic] || [topic.toLowerCase()];
          const matches = articles.filter(article => {
            const haystack = [article.title, article.slug, ...article.tags].join(" ").toLowerCase().replaceAll("-", " ");
            return needles.some(needle => {
              const normalized = needle.toLowerCase().replaceAll("-", " ");
              const words = haystack.split(/[^a-z0-9]+/);
              const parts = normalized.split(/[^a-z0-9]+/).filter(Boolean);
              return words.some((word, index) => parts.every((part, offset) => words[index + offset] === part));
            });
          });
          return { topic, matches };
        }).filter(item => item.matches.length);
        if (!topics.length) return null;
        return <section key={group.name} aria-label={group.name} style={{ marginBottom: 35 }}>
          <h2 style={{ color: "#021550", marginBottom: 14 }}>{group.name}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
            {topics.map(({ topic, matches }) => <section key={topic} style={{ background: "white", padding: 20, border: "1px solid #e2e8f0", borderRadius: 12 }}>
              <h3 style={{ color: "#021550", marginBottom: 9 }}>{topic}</h3>
              <ul style={{ paddingLeft: 20 }}>{matches.slice(0, 5).map(article => <li key={article.slug} style={{ marginBottom: 8 }}><Link href={`/blog/${article.slug}`}>{article.title}</Link></li>)}</ul>
            </section>)}
          </div>
        </section>;
      })}
      <p><Link href="/tutors">Browse available tutor profiles</Link></p>
    </div>
  </main>;
}
