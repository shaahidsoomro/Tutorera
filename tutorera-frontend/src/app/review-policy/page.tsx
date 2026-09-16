import TrustArticle from "@/components/TrustArticle";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tutor Review Policy", description: "How student reviews, ratings, and tutor averages work on TUTORERA.", alternates: { canonical: "/review-policy" } };
export default function Page() { return <TrustArticle title="Tutor Review Policy" path="/review-policy" intro="TUTORERA ties tutor reviews to completed bookings so ratings reflect a platform-recorded tutoring relationship." sections={[
  { heading: "Who can leave a review", body: "Only an authenticated student associated with a completed booking for that tutor can submit a review. A review requires a rating from one to five and a written comment." },
  { heading: "One review per booking", body: "The platform prevents a student from submitting multiple reviews for the same booking. This keeps individual sessions from being counted more than once." },
  { heading: "How ratings are calculated", body: "After a valid review is created, the tutor's displayed average is recalculated from their recorded reviews and rounded to one decimal place. The public profile also displays the total number of reviews." },
  { heading: "Integrity and reporting", body: "Reviews should describe the tutoring experience honestly and must not contain harassment, private contact details, or fabricated claims. Users can report problematic content through the complaint process." },
]} />; }
