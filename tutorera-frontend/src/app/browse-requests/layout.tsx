import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Tuition Requests | Tutorera",
  description: "Browse open tuition requests from students and parents worldwide. Filter by subject, level, city, and teaching mode.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/browse-requests",
  },
};

export default function BrowseRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
