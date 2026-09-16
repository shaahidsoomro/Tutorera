import { fetchTutor } from "@/lib/tutor-directory";
import { assessTutorSeoQuality } from "@/lib/tutor-seo";
import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { id } = await params;
  const tutor = await fetchTutor(id);

  const title = {
    default: "Tutor Profile | TUTORERA",
    // The profile page currently emits its complete branded title. Prevent the
    // root `%s | TUTORERA` template from appending the brand a second time.
    template: "%s",
  };

  if (!tutor) {
    return { title, robots: { index: false, follow: true } };
  }

  const assessment = assessTutorSeoQuality(tutor);
  return {
    title,
    robots: {
      index: assessment.indexable,
      follow: true,
    },
  };
}

export default function TutorProfileLayout({ children }: Props) {
  return children;
}
