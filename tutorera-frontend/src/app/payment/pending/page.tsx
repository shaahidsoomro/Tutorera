import { SUPPORT_EMAIL,SUPPORT_PHONE } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = { title: "Payment Verification in Progress", robots: { index: false, follow: false } };

export default async function PaymentPendingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const get = (key: string, fallback: string) => typeof params?.[key] === "string" ? params[key] as string : fallback;
  return <div className={s.page}><section className={s.hero}><h1>Payment Verification in Progress</h1><p>Do not confirm the booking until final payment status has been verified.</p></section><section className={s.narrow}><div className={s.infoBox}><p><strong>Booking Reference:</strong> {get("booking", "BOOKING-REFERENCE")}</p><p><strong>Payment Status:</strong> Pending Verification</p><p>TUTORERA verifies payment results server-side before activating a tutoring booking.</p><div className={s.flow}><Link className={s.cta} href="/dashboard">View My Booking</Link><Link className={s.cta} href="/contact">Contact Support</Link></div><p><strong>Support:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {SUPPORT_PHONE}</p></div></section></div>;
}
