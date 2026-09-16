import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fetchTutor } from "@/lib/tutor-directory";
import { assessTutorSeoQuality } from "@/lib/tutor-seo";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { id } = await params;
  const tutor = await fetchTutor(id);

  if (!tutor) {
    return { robots: { index: false, follow: true } };
  }

  const assessment = assessTutorSeoQuality(tutor);
  return {
    robots: {
      index: assessment.indexable,
      follow: true,
    },
  };
}

export default function TutorProfileLayout({ children }: Props) {
  return children;
}
