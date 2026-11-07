import { redirect } from "next/navigation";

/** Canonical URL for refund management is /admin/refunds. */
export default function RefundRequestsRedirectPage() {
  redirect("/admin/refunds");
}
