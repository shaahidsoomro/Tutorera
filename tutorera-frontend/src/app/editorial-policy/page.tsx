import TrustArticle from "@/components/TrustArticle";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Editorial Policy", description: "TUTORERA's standards for accurate, useful, and transparent educational content.", alternates: { canonical: "/editorial-policy" } };
export default function Page() { return <TrustArticle title="Editorial Policy" path="/editorial-policy" intro="TUTORERA publishes educational and platform guidance to help Pakistani students, parents, and tutors make informed decisions." sections={[
  { heading: "Purpose and audience", body: "Content should answer a clear student, parent, or tutor question in practical language and reflect the Pakistani education context where relevant." },
  { heading: "Accuracy and sourcing", body: "Factual claims should be checked against primary or authoritative sources. Fees, platform processes, and policies must match the current product configuration and governing policy pages." },
  { heading: "Authorship and review", body: "Published articles should identify the author or responsible editorial team, disclose appropriate subject review, and show an updated date when the information may change." },
  { heading: "Corrections and independence", body: "Material errors should be corrected promptly. Commercial relationships, sponsorships, or incentives that could affect a recommendation should be disclosed, and rankings must not be presented as independently proven without evidence." },
  { heading: "Responsible use of AI", body: "Automated tools may assist research or drafting, but published material must receive human review for accuracy, usefulness, originality, and compliance with this policy." },
]} />; }
