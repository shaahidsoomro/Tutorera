import type { DashBooking } from "@/types/dashboard";

function icsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "").replace("Z", "Z");
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function addToCalendar(booking: DashBooking, role: "student" | "tutor"): void {
  const subject = booking.request?.subject || "Tutoring session";
  const otherParty = role === "student"
    ? `Tutor: ${booking.tutor?.name || "Your tutor"}`
    : `Student: ${booking.student?.name || "Your student"}`;
  const mode = booking.teachingMode === "online" ? "Online" : booking.teachingMode === "home" ? "Home visit" : "Hybrid";
  const summary = `${subject} lesson — ${booking.student?.name || "Student"} & ${booking.tutor?.name || "Tutor"}`;
  const description = `${otherParty}\\nSubject: ${subject}\\nMode: ${mode}\\nSession ID: ${booking._id}\\n\\nManage at https://tutorera.ac.pk/dashboard`;

  const start = booking.nextOccurrence?.startAt || booking.scheduledStartAt;
  const end = booking.nextOccurrence?.endAt || booking.scheduledEndAt;

  if (!start) {
    alert("This session does not have a confirmed date yet. The schedule will be added once confirmed.");
    return;
  }

  const dtStart = icsDate(new Date(start).toISOString());
  const dtEnd = end ? icsDate(new Date(end).toISOString()) : icsDate(new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString());
  const uid = `tutorera-${booking._id}-${Date.now()}@tutorera.ac.pk`;
  const now = icsDate(new Date().toISOString());

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tutorera//Tutorera Session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tutorera-${subject.replace(/\s+/g, "-").toLowerCase()}-session.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
