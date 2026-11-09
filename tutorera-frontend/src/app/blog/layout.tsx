import type { Metadata } from "next";
// Child pages own their canonical URL. A canonical on this shared layout
// produced two conflicting canonical tags on /blog/topics and category pages.
export const metadata: Metadata = { title: "Tutoring Guides and Education Resources", description: "Practical tutoring, learning, safety, and education guides for students, parents, and tutors across TUTORERA markets." };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
