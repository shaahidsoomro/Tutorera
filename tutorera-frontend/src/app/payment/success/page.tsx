import { SUPPORT_EMAIL,SUPPORT_PHONE,formatPKR } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = { title: "Payment Successful", robots: { index: false, follow: false } };

export default async function PaymentSuccessPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const get = (key: string, fallback: string) => typeof params?.[key] === "string" ? params[key] as string : fallback;
  const amount = Number(get("amount", "2000"));
  return <div className={s.page}><section className={s.hero}><h1>Payment Successful</h1><p>Thank you. Your payment has been successfully received.</p></section><section className={s.narrow}><div className={s.infoBox}><p><strong>Booking Reference:</strong> {get("booking", "BOOKING-REFERENCE")}</p><p><strong>Transaction Reference:</strong> {get("transaction", "TRANSACTION-REFERENCE")}</p><p><strong>Tutor:</strong> {get("tutor", "Selected Tutor")}</p><p><strong>Service:</strong> {get("service", "Tutoring Session")}</p><p><strong>Amount Paid:</strong> {formatPKR(Number.isFinite(amount) ? amount : 0)}</p><p><strong>Payment Status:</strong> Successful</p><p><strong>Booking Status:</strong> Confirmed</p><p>Your booking has been confirmed. The tutor has been notified and your session details are available in your TUTORERA dashboard.</p><p><strong>Support:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · {SUPPORT_PHONE}</p><Link className={s.cta} href="/dashboard">View dashboard</Link></div></section></div>;
}
