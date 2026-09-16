"use client";

import DirectBookingModal from "@/components/Dashboard/DirectBookingModal";
import { useFavourites } from "@/hooks/useFavourites";
import { Calendar,Heart,PlusCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Props { profileId: string; tutorUserId: string; tutorName: string; hourlyRate: number; currency?: string; subjects: string[]; teachingMode: "online" | "in-person" | "both"; city: string; }

export default function TutorProfileActions(props: Props) {
  const [booking, setBooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const { isFavourited, toggleFavourite, isStudent, loaded } = useFavourites();
  const saved = isFavourited(props.profileId);
  return <>
    {loaded && isStudent && <button disabled={saving} onClick={async () => { setSaving(true); await toggleFavourite(props.profileId); setSaving(false); }} style={{ width: "100%", display: "flex", justifyContent: "center", gap: ".5rem", padding: ".75rem", marginBottom: ".75rem", borderRadius: 8, border: "1px solid #fecdd3", background: saved ? "#fff1f2" : "white", color: "#C81B7F", fontWeight: 700 }}><Heart size={17} fill={saved ? "currentColor" : "none"} />{saved ? "Saved to Favourites" : "Save to Favourites"}</button>}
    <button onClick={() => setBooking(true)} style={{ width: "100%", padding: ".9rem", border: 0, borderRadius: 8, background: "#0329B2", color: "white", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
      <Calendar size={18} /> Request Direct Booking
    </button>
    <Link
      href={`/post-tuition-request?subject=${encodeURIComponent(props.subjects[0] || "")}&city=${encodeURIComponent(props.city || "")}`}
      style={{
        width: "100%",
        padding: ".85rem",
        border: "1.5px solid #0329b2",
        borderRadius: 8,
        background: "#EEF5FF",
        color: "#0329b2",
        fontWeight: 700,
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        fontSize: "0.875rem",
        boxSizing: "border-box"
      }}
    >
      <PlusCircle size={16} /> Post Request & Invite
    </Link>
    {booking && <DirectBookingModal tutorId={props.tutorUserId} tutorUserId={props.tutorUserId} tutorName={props.tutorName} hourlyRate={props.hourlyRate} currency={props.currency} tutorSubjects={props.subjects} tutorTeachingMode={props.teachingMode} tutorCity={props.city} onClose={() => setBooking(false)} onSuccess={() => setBooking(false)} />}
  </>;
}
